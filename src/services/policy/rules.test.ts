import { describe, expect, it } from 'vitest';
import { assessEvent, isProposable, worstVerdict } from './rules';
import type { PolicyConfig } from '../../config/policy';
import { POLICY_VERSION } from '../../config/policy';
import { SUPPORTED_CHAIN_ID } from '../../config/network';
import type { TransactionEvent } from '../../types';

const ALLOWED = '0x1C4bE8a3D5f60718293a4B5c6D7e8F90A1b2C3d4';
const UNKNOWN = '0xAf12345678901234567890123456789012345678';

const POLICY: PolicyConfig = {
  chainId: SUPPORTED_CHAIN_ID,
  allowedRecipients: [ALLOWED],
  allowedMethods: ['transferNative'],
  maxTransferWei: 50_000_000_000_000_000n, // 0.05 ETH
  version: POLICY_VERSION,
};

const NOW = 1_789_290_000;

function event(patch: Partial<TransactionEvent> = {}): TransactionEvent {
  return {
    id: 'evt',
    chainId: SUPPORTED_CHAIN_ID,
    hash: null,
    timestamp: NOW,
    from: ALLOWED,
    to: ALLOWED,
    valueWei: 1_000_000_000_000_000n, // 0.001 ETH
    method: 'transferNative',
    decodedSummary: 'test',
    direction: 'OUT',
    blockNumber: 1n,
    provenance: 'DEMO_FIXTURE',
    ...patch,
  };
}

describe('deterministic policy rules', () => {
  it('allowlisted recipient + allowed method + under limit -> LOW_RISK', () => {
    expect(assessEvent(event(), POLICY, NOW).verdict).toBe('LOW_RISK');
  });

  it('unknown recipient -> REVIEW_REQUIRED', () => {
    const assessment = assessEvent(event({ to: UNKNOWN }), POLICY, NOW);
    expect(assessment.verdict).toBe('REVIEW_REQUIRED');
    expect(assessment.checks.find((c) => c.rule === 'RECIPIENT_ALLOWLIST')?.status).toBe('FAIL');
  });

  it('method not on the allowlist -> REVIEW_REQUIRED', () => {
    const assessment = assessEvent(event({ method: 'sweepAll' }), POLICY, NOW);
    expect(assessment.verdict).toBe('REVIEW_REQUIRED');
    expect(assessment.checks.find((c) => c.rule === 'METHOD_ALLOWLIST')?.status).toBe('FAIL');
  });

  it('amount over the configured testnet limit -> BLOCKED', () => {
    const assessment = assessEvent(event({ valueWei: POLICY.maxTransferWei + 1n }), POLICY, NOW);
    expect(assessment.verdict).toBe('BLOCKED');
  });

  it('amount exactly at the limit is allowed', () => {
    expect(assessEvent(event({ valueWei: POLICY.maxTransferWei }), POLICY, NOW).verdict).toBe('LOW_RISK');
  });

  it('wrong chain -> BLOCKED, whatever else is true', () => {
    for (const chainId of [1, 42161, 42170, 11155111]) {
      const assessment = assessEvent(event({ chainId }), POLICY, NOW);
      expect(assessment.verdict, `chain ${chainId}`).toBe('BLOCKED');
    }
  });

  it('missing transaction data -> INSUFFICIENT_DATA', () => {
    const assessment = assessEvent(event({ to: null, valueWei: null, method: null }), POLICY, NOW);
    expect(assessment.verdict).toBe('INSUFFICIENT_DATA');
    expect(assessment.checks.filter((c) => c.status === 'NOT_EVALUATED')).toHaveLength(3);
  });

  it('escalates to the most severe verdict when several rules fail', () => {
    const assessment = assessEvent(
      event({ to: UNKNOWN, valueWei: POLICY.maxTransferWei * 10n, method: 'sweepAll' }),
      POLICY,
      NOW,
    );
    expect(assessment.verdict).toBe('BLOCKED');
    expect(assessment.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('is a pure function of its inputs', () => {
    const first = assessEvent(event(), POLICY, NOW);
    const second = assessEvent(event(), POLICY, NOW);
    expect(JSON.stringify(first, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))).toEqual(
      JSON.stringify(second, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  });

  it('ranks verdicts by severity', () => {
    expect(worstVerdict(['LOW_RISK', 'REVIEW_REQUIRED', 'BLOCKED'])).toBe('BLOCKED');
    expect(worstVerdict(['LOW_RISK', 'INSUFFICIENT_DATA'])).toBe('INSUFFICIENT_DATA');
    expect(worstVerdict([])).toBe('LOW_RISK');
  });

  it('never proposes an action for a blocked or unreadable event', () => {
    expect(isProposable('LOW_RISK')).toBe(true);
    expect(isProposable('REVIEW_REQUIRED')).toBe(true);
    expect(isProposable('BLOCKED')).toBe(false);
    expect(isProposable('INSUFFICIENT_DATA')).toBe(false);
  });

  it('publishes the facts the AI is allowed to cite', () => {
    const ids = assessEvent(event(), POLICY, NOW).observedFacts.map((fact) => fact.id);
    expect(ids).toContain('fact.chainId');
    expect(ids).toContain('fact.recipientAllowlisted');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
