/**
 * Shared domain types.
 *
 * Rules encoded here (not just in docs):
 *  - every TransactionEvent carries a `provenance` that is exactly one of
 *    ONCHAIN | DEMO_FIXTURE, so the UI can always label what it renders;
 *  - the AI explanation type has NO verdict/risk field. The deterministic
 *    verdict lives on RiskAssessment and is the only verdict in the system.
 */

/** Where a piece of data came from. Rendered on every event the UI displays. */
export type Provenance = 'ONCHAIN' | 'DEMO_FIXTURE';

/** Deterministic risk verdicts. Produced by the policy engine only. */
export type RiskVerdict = 'LOW_RISK' | 'REVIEW_REQUIRED' | 'BLOCKED' | 'INSUFFICIENT_DATA';

/** Identifiers for the deterministic rules, in evaluation order. */
export type PolicyRuleId =
  | 'DATA_COMPLETENESS'
  | 'CHAIN_MATCH'
  | 'AMOUNT_LIMIT'
  | 'RECIPIENT_ALLOWLIST'
  | 'METHOD_ALLOWLIST';

export type PolicyCheckStatus = 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA' | 'NOT_EVALUATED';

/** One rule, its outcome, and the verdict it contributes when it fails. */
export interface PolicyCheck {
  readonly rule: PolicyRuleId;
  readonly label: string;
  readonly status: PolicyCheckStatus;
  readonly detail: string;
  /** The verdict this rule forces when `status === 'FAIL'`. */
  readonly verdictOnFailure: RiskVerdict;
}

/** A single observed fact the AI is allowed to cite. Ids are stable. */
export interface ObservedFact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export type NetworkState =
  | 'OK'
  | 'WRONG_NETWORK'
  | 'RPC_UNREACHABLE'
  | 'WALLET_DISCONNECTED'
  | 'CHECKING';

export interface NetworkStatus {
  readonly state: NetworkState;
  readonly expectedChainId: number;
  readonly expectedChainName: string;
  /** Chain id reported by the connected wallet, or null when disconnected. */
  readonly connectedChainId: number | null;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  readonly blockNumber: bigint | null;
  readonly checkedAt: number;
  readonly provenance: Provenance;
  readonly message: string;
}

export interface TreasurySnapshot {
  readonly chainId: number;
  readonly treasuryAddress: string | null;
  readonly guardianAddress: string | null;
  readonly guardianReachable: boolean;
  readonly balanceWei: bigint | null;
  readonly allowlistedRecipients: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly maxTransferWei: bigint;
  readonly blockNumber: bigint | null;
  readonly updatedAt: number;
  readonly provenance: Provenance;
}

export type EventDirection = 'IN' | 'OUT' | 'INTERNAL' | 'UNKNOWN';

export interface TransactionEvent {
  /** Stable id used for routing and de-duplication. */
  readonly id: string;
  readonly chainId: number;
  readonly hash: string | null;
  /** Unix seconds. */
  readonly timestamp: number | null;
  readonly from: string | null;
  readonly to: string | null;
  readonly valueWei: bigint | null;
  /** Method label, e.g. `transferNative`. Null when the calldata is unknown. */
  readonly method: string | null;
  /** Human-readable decoding of what the transaction does. */
  readonly decodedSummary: string;
  readonly direction: EventDirection;
  readonly blockNumber: bigint | null;
  readonly provenance: Provenance;
}

export interface RiskAssessment {
  readonly eventId: string;
  readonly verdict: RiskVerdict;
  readonly checks: readonly PolicyCheck[];
  /** Plain-language reasons, in the order the rules produced them. */
  readonly reasons: readonly string[];
  readonly observedFacts: readonly ObservedFact[];
  readonly evaluatedAt: number;
  readonly policyVersion: string;
}

export type ProposedActionKind = 'NATIVE_TRANSFER';

export interface ProposedAction {
  readonly id: string;
  readonly kind: ProposedActionKind;
  readonly chainId: number;
  readonly to: string;
  readonly valueWei: bigint;
  readonly method: string;
  /** What the calldata does, in words. Shown before any approval. */
  readonly calldataSummary: string;
  readonly reason: string;
  readonly createdAt: number;
  readonly sourceEventId: string | null;
  readonly assessment: RiskAssessment;
  readonly provenance: Provenance;
}

export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export type ApprovalStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'BLOCKED_BY_POLICY';

export interface ApprovalResult {
  readonly actionId: string;
  readonly decision: ApprovalDecision;
  readonly decidedAt: number;
  readonly decidedBy: string | null;
  readonly note: string;
  readonly status: ApprovalStatus;
  /** Only ever set from a real receipt. Never fabricated. */
  readonly txHash: string | null;
  readonly receiptBlockNumber: bigint | null;
  readonly provenance: Provenance;
}

export type AgentStepId = 'FETCH' | 'CLASSIFY' | 'POLICY' | 'RECOMMEND';
export type AgentStepState = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'SKIPPED';

export interface AgentStep {
  readonly id: AgentStepId;
  readonly label: string;
  readonly state: AgentStepState;
  readonly detail: string;
}

/** AI recommendation vocabulary. Advisory only — it never sets the verdict. */
export type AiRecommendation = 'APPROVE_FOR_REVIEW' | 'REQUIRE_REVIEW' | 'BLOCK';

/**
 * Validated AI output. Note the absence of any verdict/risk-level field:
 * the schema cannot represent one, so a model cannot return one.
 */
export interface AiExplanation {
  readonly summary: string;
  readonly rationale: string;
  /** Ids of ObservedFact entries the explanation is based on. */
  readonly citedFactIds: readonly string[];
  readonly recommendation: AiRecommendation;
  readonly caveats: readonly string[];
  readonly provider: string;
  readonly generatedAt: number;
  /**
   * Fields the model returned that the schema deliberately discarded (for
   * example an attempted `verdict`). Shown in the UI as proof of the boundary.
   */
  readonly ignoredModelFields: readonly string[];
}

export type AiStatus = 'IDLE' | 'LOADING' | 'READY' | 'UNAVAILABLE';

export interface AiExplanationState {
  readonly status: AiStatus;
  readonly explanation: AiExplanation | null;
  /** Why the explanation is unavailable — shown verbatim in the UI. */
  readonly error: string | null;
}

export interface AgentRun {
  readonly id: string;
  readonly eventId: string;
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly steps: readonly AgentStep[];
  readonly assessment: RiskAssessment | null;
  readonly ai: AiExplanationState;
  readonly provenance: Provenance;
}

/** An analysed event plus its outcome, as shown in Activity history. */
export interface ActivityRecord {
  readonly event: TransactionEvent;
  readonly assessment: RiskAssessment;
  readonly aiRecommendation: AiRecommendation | null;
  readonly approval: ApprovalResult | null;
}
