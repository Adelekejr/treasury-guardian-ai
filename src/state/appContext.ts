/**
 * The app context object and its types.
 *
 * Kept separate from the provider so the provider file only exports a
 * component (and fast refresh stays happy).
 */
import { createContext } from 'react';
import type { AppConfig } from '../config/env';
import type { PolicyConfig } from '../config/policy';
import type { SubmissionStep } from '../services/contract/guardianService';
import type {
  AgentRun,
  ApprovalResult,
  NetworkStatus,
  ProposedAction,
  RiskAssessment,
  TransactionEvent,
  TreasurySnapshot,
} from '../types';

/** Reviewer-facing simulation of states that depend on external conditions. */
export type SimulatedState =
  | 'NONE'
  | 'WRONG_NETWORK'
  | 'WALLET_DISCONNECTED'
  | 'AI_UNAVAILABLE'
  | 'CONTRACT_UNAVAILABLE'
  | 'RPC_UNREACHABLE';

export interface WalletState {
  readonly address: string | null;
  readonly chainId: number | null;
  readonly connecting: boolean;
  readonly error: string | null;
  readonly available: boolean;
}

export interface AppContextValue {
  readonly config: AppConfig;
  readonly policy: PolicyConfig;
  readonly demoActive: boolean;
  readonly demoReason: string | null;
  readonly adapterLabel: string;
  readonly network: NetworkStatus | null;
  readonly snapshot: TreasurySnapshot | null;
  readonly events: readonly TransactionEvent[];
  readonly assessments: ReadonlyMap<string, RiskAssessment>;
  readonly loading: boolean;
  readonly chainError: string | null;
  readonly runs: Readonly<Record<string, AgentRun>>;
  readonly conflicts: Readonly<Record<string, boolean>>;
  readonly proposals: Readonly<Record<string, ProposedAction>>;
  readonly approvals: Readonly<Record<string, ApprovalResult>>;
  readonly submissionSteps: readonly SubmissionStep[];
  readonly submitting: boolean;
  readonly submitError: string | null;
  readonly wallet: WalletState;
  readonly aiName: string;
  readonly aiReason: string;
  readonly aiKeySet: boolean;
  readonly contractAvailable: boolean;
  readonly contractReason: string | null;
  readonly simulated: SimulatedState;
  readonly nowSeconds: () => number;
  refresh(): Promise<void>;
  analyse(eventId: string): Promise<void>;
  prepare(eventId: string): ProposedAction | null;
  approve(eventId: string, note: string): Promise<void>;
  reject(eventId: string, note: string): Promise<void>;
  connect(): Promise<void>;
  switchNetwork(): Promise<void>;
  setAiKey(key: string | null): void;
  setSimulated(state: SimulatedState): void;
}

export const AppContext = createContext<AppContextValue | null>(null);
