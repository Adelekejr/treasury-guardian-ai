/**
 * Structured-output validation for AI responses.
 *
 * The schema has no verdict or risk field, so a model cannot express one
 * through this boundary. Any extra key a model returns is recorded in
 * `ignoredModelFields` and discarded.
 */
import type { AiExplanation, AiRecommendation } from '../../types';

const RECOMMENDATIONS: readonly AiRecommendation[] = ['APPROVE_FOR_REVIEW', 'REQUIRE_REVIEW', 'BLOCK'];

/** Keys the schema reads. Everything else is dropped. */
const KNOWN_KEYS = new Set(['summary', 'rationale', 'citedFactIds', 'recommendation', 'caveats']);

const MAX_SUMMARY = 400;
const MAX_RATIONALE = 2000;
const MAX_CAVEAT = 300;

export interface ValidationSuccess {
  readonly ok: true;
  readonly value: AiExplanation;
}
export interface ValidationFailure {
  readonly ok: false;
  readonly error: string;
}
export type ValidationResult = ValidationSuccess | ValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

/** Extract JSON from a raw model response, tolerating ```json fences. */
export function parseModelJson(raw: string): ValidationFailure | { ok: true; value: unknown } {
  const withoutFence = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '');
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, error: 'Model response contained no JSON object.' };
  }
  try {
    return { ok: true, value: JSON.parse(withoutFence.slice(start, end + 1)) };
  } catch (error) {
    return { ok: false, error: `Model response was not valid JSON: ${(error as Error).message}` };
  }
}

/**
 * Validate a parsed model response.
 *
 * @param allowedFactIds ids the model is permitted to cite. Citing anything
 *        else is rejected, so the model cannot invent evidence.
 */
export function validateAiExplanation(
  input: unknown,
  allowedFactIds: readonly string[],
  provider: string,
  generatedAt: number,
): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, error: 'Model response was not a JSON object.' };
  }

  const summary = cleanString(input.summary, MAX_SUMMARY);
  if (!summary) return { ok: false, error: 'Field "summary" is missing or empty.' };

  const rationale = cleanString(input.rationale, MAX_RATIONALE);
  if (!rationale) return { ok: false, error: 'Field "rationale" is missing or empty.' };

  const recommendation = input.recommendation;
  if (typeof recommendation !== 'string' || !RECOMMENDATIONS.includes(recommendation as AiRecommendation)) {
    return {
      ok: false,
      error: `Field "recommendation" must be one of ${RECOMMENDATIONS.join(', ')}.`,
    };
  }

  if (!Array.isArray(input.citedFactIds)) {
    return { ok: false, error: 'Field "citedFactIds" must be an array of observed fact ids.' };
  }
  const cited: string[] = [];
  for (const candidate of input.citedFactIds) {
    if (typeof candidate !== 'string') {
      return { ok: false, error: 'Field "citedFactIds" must contain strings only.' };
    }
    if (!allowedFactIds.includes(candidate)) {
      return { ok: false, error: `Model cited an unknown fact id "${candidate}".` };
    }
    if (!cited.includes(candidate)) cited.push(candidate);
  }
  if (cited.length === 0) {
    return { ok: false, error: 'Model must cite at least one observed fact.' };
  }

  const caveats: string[] = [];
  if (input.caveats !== undefined) {
    if (!Array.isArray(input.caveats)) {
      return { ok: false, error: 'Field "caveats" must be an array of strings.' };
    }
    for (const candidate of input.caveats) {
      const text = cleanString(candidate, MAX_CAVEAT);
      if (text) caveats.push(text);
    }
  }

  const ignoredModelFields = Object.keys(input)
    .filter((key) => !KNOWN_KEYS.has(key))
    .sort();

  return {
    ok: true,
    value: {
      summary,
      rationale,
      citedFactIds: cited,
      recommendation: recommendation as AiRecommendation,
      caveats,
      provider,
      generatedAt,
      ignoredModelFields,
    },
  };
}
