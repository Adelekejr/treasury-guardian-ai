import { describe, expect, it } from 'vitest';
import { parseModelJson, validateAiExplanation } from './schema';

const FACTS = ['fact.chainId', 'fact.to', 'fact.value'];

describe('AI structured output validation', () => {
  const valid = {
    summary: 'Sends 0.01 ETH to an allowlisted wallet.',
    rationale: 'The recipient is on the allowlist and the amount is under the limit.',
    citedFactIds: ['fact.to', 'fact.value', 'fact.to'],
    recommendation: 'APPROVE_FOR_REVIEW',
    caveats: ['Testnet only.'],
  };

  it('accepts a well-formed response and de-duplicates citations', () => {
    const result = validateAiExplanation(valid, FACTS, 'test', 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.citedFactIds).toEqual(['fact.to', 'fact.value']);
    expect(result.value.recommendation).toBe('APPROVE_FOR_REVIEW');
    expect(result.value.ignoredModelFields).toEqual([]);
  });

  it('requires at least one cited fact', () => {
    const result = validateAiExplanation({ ...valid, citedFactIds: [] }, FACTS, 'test', 1);
    expect(result.ok).toBe(false);
  });

  it('requires summary and rationale', () => {
    expect(validateAiExplanation({ ...valid, summary: '   ' }, FACTS, 'test', 1).ok).toBe(false);
    expect(validateAiExplanation({ ...valid, rationale: null }, FACTS, 'test', 1).ok).toBe(false);
  });

  it('truncates over-long fields instead of rendering them raw', () => {
    const result = validateAiExplanation({ ...valid, summary: 'x'.repeat(5000) }, FACTS, 'test', 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.length).toBeLessThanOrEqual(400);
  });

  it('reads JSON out of a fenced code block', () => {
    const parsed = parseModelJson('```json\n{"summary":"a"}\n```');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual({ summary: 'a' });
  });

  it('reports a parse failure rather than throwing', () => {
    expect(parseModelJson('no json here').ok).toBe(false);
    expect(parseModelJson('{ bad json }').ok).toBe(false);
  });
});
