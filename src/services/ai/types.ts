/** The AI boundary. Adapters explain; they never decide. */
import type { AiExplanationState, ObservedFact, RiskAssessment, TransactionEvent } from '../../types';

export interface AiExplainInput {
  readonly event: TransactionEvent;
  /**
   * The deterministic assessment, passed to the model as READ-ONLY context.
   * Adapters must not return it, and the schema cannot represent a verdict.
   */
  readonly assessment: RiskAssessment;
  readonly facts: readonly ObservedFact[];
  /** Injected clock keeps mock output deterministic. */
  readonly now: number;
  readonly signal?: AbortSignal;
}

export interface AiAdapter {
  readonly name: string;
  readonly kind: 'mock' | 'remote';
  /** Never throws: failures come back as an UNAVAILABLE state. */
  explain(input: AiExplainInput): Promise<AiExplanationState>;
}
