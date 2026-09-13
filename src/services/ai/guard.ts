/**
 * The code-level guarantee that the AI cannot override policy.
 *
 * Everything a model returns passes through here. The deterministic
 * `RiskAssessment` goes in and comes out *by identity* — this module has no
 * code path that can produce a different verdict — while the model's output is
 * reduced to an explanation with no authority.
 */
import type { AiExplanationState, AiRecommendation, RiskAssessment, RiskVerdict } from '../../types';
import { parseModelJson, validateAiExplanation } from './schema';

export interface GuardedAnalysis {
  /** The same object that went in. Never rebuilt, never edited. */
  readonly assessment: RiskAssessment;
  readonly ai: AiExplanationState;
  /** True when the model's advisory recommendation is softer than policy. */
  readonly recommendationConflictsWithPolicy: boolean;
}

const RECOMMENDATION_STRENGTH: Record<AiRecommendation, number> = {
  APPROVE_FOR_REVIEW: 0,
  REQUIRE_REVIEW: 1,
  BLOCK: 2,
};

const VERDICT_STRENGTH: Record<RiskVerdict, number> = {
  LOW_RISK: 0,
  INSUFFICIENT_DATA: 1,
  REVIEW_REQUIRED: 1,
  BLOCKED: 2,
};

/** A recommendation weaker than the deterministic verdict is a conflict. */
export function aiConflictsWithPolicy(
  verdict: RiskVerdict,
  recommendation: AiRecommendation | null,
): boolean {
  if (recommendation === null) return false;
  return RECOMMENDATION_STRENGTH[recommendation] < VERDICT_STRENGTH[verdict];
}

/**
 * Validate raw model output against the deterministic assessment.
 *
 * @param rawOutput a JSON string or already-parsed value from any adapter.
 */
export function applyAiOutput(
  assessment: RiskAssessment,
  rawOutput: unknown,
  provider: string,
  now: number,
): GuardedAnalysis {
  const allowedFactIds = assessment.observedFacts.map((fact) => fact.id);

  const parsed =
    typeof rawOutput === 'string' ? parseModelJson(rawOutput) : ({ ok: true, value: rawOutput } as const);

  if (!parsed.ok) {
    return {
      assessment,
      ai: { status: 'UNAVAILABLE', explanation: null, error: parsed.error },
      recommendationConflictsWithPolicy: false,
    };
  }

  const validated = validateAiExplanation(parsed.value, allowedFactIds, provider, now);
  if (!validated.ok) {
    return {
      assessment,
      ai: { status: 'UNAVAILABLE', explanation: null, error: validated.error },
      recommendationConflictsWithPolicy: false,
    };
  }

  return {
    // Identity, not a copy: the verdict is physically the one policy produced.
    assessment,
    ai: { status: 'READY', explanation: validated.value, error: null },
    recommendationConflictsWithPolicy: aiConflictsWithPolicy(
      assessment.verdict,
      validated.value.recommendation,
    ),
  };
}

/** Used when the provider is unreachable. The verdict and evidence survive. */
export function aiUnavailable(assessment: RiskAssessment, reason: string): GuardedAnalysis {
  return {
    assessment,
    ai: { status: 'UNAVAILABLE', explanation: null, error: reason },
    recommendationConflictsWithPolicy: false,
  };
}
