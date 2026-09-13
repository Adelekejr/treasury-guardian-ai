/**
 * Deterministic policy engine.
 *
 * This is the only place a risk verdict is produced. It runs BEFORE any AI
 * call, takes no model input, performs no I/O and has no randomness, so the
 * same event always yields the same verdict.
 *
 *   Wrong chain                                   -> BLOCKED
 *   Amount over the configured testnet limit      -> BLOCKED
 *   Unknown recipient (not on the allowlist)      -> REVIEW_REQUIRED
 *   Contract method not on the allowlist          -> REVIEW_REQUIRED
 *   Missing transaction data                      -> INSUFFICIENT_DATA
 *   Allowlisted recipient + allowed method + under limit -> LOW_RISK
 */
import type { PolicyConfig } from '../../config/policy';
import { describeChainId } from '../../config/network';
import { isAllowlisted, shortenAddress } from '../../lib/address';
import { formatEthWithUnit, formatTimestamp } from '../../lib/format';
import type {
  ObservedFact,
  PolicyCheck,
  RiskAssessment,
  RiskVerdict,
  TransactionEvent,
} from '../../types';

const SEVERITY: Record<RiskVerdict, number> = {
  LOW_RISK: 0,
  INSUFFICIENT_DATA: 1,
  REVIEW_REQUIRED: 2,
  BLOCKED: 3,
};

/** Higher severity always wins; ties keep the first verdict seen. */
export function worstVerdict(verdicts: readonly RiskVerdict[]): RiskVerdict {
  return verdicts.reduce<RiskVerdict>(
    (worst, next) => (SEVERITY[next] > SEVERITY[worst] ? next : worst),
    'LOW_RISK',
  );
}

export function verdictLabel(verdict: RiskVerdict): string {
  switch (verdict) {
    case 'LOW_RISK':
      return 'Low risk';
    case 'REVIEW_REQUIRED':
      return 'Review required';
    case 'BLOCKED':
      return 'Blocked';
    case 'INSUFFICIENT_DATA':
      return 'Insufficient data';
  }
}

/** Text + glyph so risk survives a greyscale test without relying on colour. */
export function verdictGlyph(verdict: RiskVerdict): string {
  switch (verdict) {
    case 'LOW_RISK':
      return '[ok]';
    case 'REVIEW_REQUIRED':
      return '[!]';
    case 'BLOCKED':
      return '[x]';
    case 'INSUFFICIENT_DATA':
      return '[?]';
  }
}

export interface AssessableAction {
  readonly id: string;
  readonly chainId: number;
  readonly to: string | null;
  readonly valueWei: bigint | null;
  readonly method: string | null;
  readonly hash?: string | null;
  readonly timestamp?: number | null;
  readonly from?: string | null;
  readonly decodedSummary?: string;
}

function collectFacts(action: AssessableAction, policy: PolicyConfig): ObservedFact[] {
  return [
    { id: 'fact.chainId', label: 'Chain id on the event', value: String(action.chainId) },
    { id: 'fact.expectedChainId', label: 'Chain id required by policy', value: String(policy.chainId) },
    { id: 'fact.from', label: 'Sender', value: action.from ?? 'unknown' },
    { id: 'fact.to', label: 'Recipient', value: action.to ?? 'missing' },
    {
      id: 'fact.recipientAllowlisted',
      label: 'Recipient on allowlist',
      value: action.to ? String(isAllowlisted(action.to, policy.allowedRecipients)) : 'unknown',
    },
    {
      id: 'fact.value',
      label: 'Value',
      value: action.valueWei === null ? 'missing' : formatEthWithUnit(action.valueWei),
    },
    { id: 'fact.limit', label: 'Configured testnet limit', value: formatEthWithUnit(policy.maxTransferWei) },
    { id: 'fact.method', label: 'Method', value: action.method ?? 'missing' },
    {
      id: 'fact.methodAllowlisted',
      label: 'Method on allowlist',
      value: action.method ? String(policy.allowedMethods.includes(action.method)) : 'unknown',
    },
    { id: 'fact.hash', label: 'Transaction hash', value: action.hash ?? 'not yet known' },
    { id: 'fact.timestamp', label: 'Timestamp', value: formatTimestamp(action.timestamp ?? null) },
    { id: 'fact.summary', label: 'Decoded summary', value: action.decodedSummary ?? 'none' },
  ];
}

/**
 * Evaluate one action or event. `evaluatedAt` is injected so results stay
 * deterministic in tests and screenshots.
 */
export function assessAction(
  action: AssessableAction,
  policy: PolicyConfig,
  evaluatedAt: number,
): RiskAssessment {
  const checks: PolicyCheck[] = [];
  const reasons: string[] = [];

  const missing: string[] = [];
  if (!action.to) missing.push('recipient');
  if (action.valueWei === null) missing.push('value');
  if (!action.method) missing.push('method');
  const dataComplete = missing.length === 0;

  checks.push({
    rule: 'DATA_COMPLETENESS',
    label: 'Transaction data is complete',
    status: dataComplete ? 'PASS' : 'INSUFFICIENT_DATA',
    detail: dataComplete
      ? 'Recipient, value and method are all present.'
      : `Cannot evaluate fully — missing ${missing.join(', ')}.`,
    verdictOnFailure: 'INSUFFICIENT_DATA',
  });
  if (!dataComplete) {
    reasons.push(`Missing transaction data: ${missing.join(', ')}.`);
  }

  const chainOk = action.chainId === policy.chainId;
  checks.push({
    rule: 'CHAIN_MATCH',
    label: 'Chain is Arbitrum Sepolia',
    status: chainOk ? 'PASS' : 'FAIL',
    detail: chainOk
      ? `Chain ${policy.chainId} matches the only supported network.`
      : `Event is on ${describeChainId(action.chainId)}; policy requires chain ${policy.chainId}.`,
    verdictOnFailure: 'BLOCKED',
  });
  if (!chainOk) {
    reasons.push(`Wrong chain: ${describeChainId(action.chainId)}.`);
  }

  if (action.valueWei === null) {
    checks.push({
      rule: 'AMOUNT_LIMIT',
      label: 'Amount is within the testnet limit',
      status: 'NOT_EVALUATED',
      detail: 'No value on the event.',
      verdictOnFailure: 'BLOCKED',
    });
  } else {
    const withinLimit = action.valueWei <= policy.maxTransferWei;
    checks.push({
      rule: 'AMOUNT_LIMIT',
      label: 'Amount is within the testnet limit',
      status: withinLimit ? 'PASS' : 'FAIL',
      detail: withinLimit
        ? `${formatEthWithUnit(action.valueWei)} is at or below the ${formatEthWithUnit(policy.maxTransferWei)} limit.`
        : `${formatEthWithUnit(action.valueWei)} exceeds the ${formatEthWithUnit(policy.maxTransferWei)} limit.`,
      verdictOnFailure: 'BLOCKED',
    });
    if (!withinLimit) {
      reasons.push(
        `Amount ${formatEthWithUnit(action.valueWei)} is over the configured testnet limit of ` +
          `${formatEthWithUnit(policy.maxTransferWei)}.`,
      );
    }
  }

  if (!action.to) {
    checks.push({
      rule: 'RECIPIENT_ALLOWLIST',
      label: 'Recipient is on the allowlist',
      status: 'NOT_EVALUATED',
      detail: 'No recipient on the event.',
      verdictOnFailure: 'REVIEW_REQUIRED',
    });
  } else {
    const known = isAllowlisted(action.to, policy.allowedRecipients);
    checks.push({
      rule: 'RECIPIENT_ALLOWLIST',
      label: 'Recipient is on the allowlist',
      status: known ? 'PASS' : 'FAIL',
      detail: known
        ? `${shortenAddress(action.to)} is one of ${policy.allowedRecipients.length} allowlisted recipients.`
        : `${shortenAddress(action.to)} is not on the allowlist.`,
      verdictOnFailure: 'REVIEW_REQUIRED',
    });
    if (!known) {
      reasons.push(`Unknown recipient ${shortenAddress(action.to)} is not on the allowlist.`);
    }
  }

  if (!action.method) {
    checks.push({
      rule: 'METHOD_ALLOWLIST',
      label: 'Method is on the allowlist',
      status: 'NOT_EVALUATED',
      detail: 'No method on the event.',
      verdictOnFailure: 'REVIEW_REQUIRED',
    });
  } else {
    const allowed = policy.allowedMethods.includes(action.method);
    checks.push({
      rule: 'METHOD_ALLOWLIST',
      label: 'Method is on the allowlist',
      status: allowed ? 'PASS' : 'FAIL',
      detail: allowed
        ? `"${action.method}" is an allowed method.`
        : `"${action.method}" is not on the method allowlist.`,
      verdictOnFailure: 'REVIEW_REQUIRED',
    });
    if (!allowed) {
      reasons.push(`Contract method "${action.method}" is not on the allowlist.`);
    }
  }

  const failureVerdicts = checks
    .filter((check) => check.status === 'FAIL' || check.status === 'INSUFFICIENT_DATA')
    .map((check) => check.verdictOnFailure);

  const verdict = worstVerdict(failureVerdicts);
  if (verdict === 'LOW_RISK') {
    reasons.push('Allowlisted recipient, allowed method and amount under the testnet limit.');
  }

  return {
    eventId: action.id,
    verdict,
    checks,
    reasons,
    observedFacts: collectFacts(action, policy),
    evaluatedAt,
    policyVersion: policy.version,
  };
}

/** Convenience wrapper for a TransactionEvent. */
export function assessEvent(
  event: TransactionEvent,
  policy: PolicyConfig,
  evaluatedAt: number,
): RiskAssessment {
  return assessAction(
    {
      id: event.id,
      chainId: event.chainId,
      to: event.to,
      valueWei: event.valueWei,
      method: event.method,
      hash: event.hash,
      timestamp: event.timestamp,
      from: event.from,
      decodedSummary: event.decodedSummary,
    },
    policy,
    evaluatedAt,
  );
}

/** True when policy permits preparing an action for human approval at all. */
export function isProposable(verdict: RiskVerdict): boolean {
  return verdict === 'LOW_RISK' || verdict === 'REVIEW_REQUIRED';
}
