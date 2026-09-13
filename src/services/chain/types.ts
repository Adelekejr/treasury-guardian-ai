/**
 * The chain adapter boundary.
 *
 * Views, policy and the AI layer only ever see these types. No viem type and
 * no RPC concept leaks past this file, so the live adapter can be swapped for
 * the demo adapter (or anything else) without touching a view.
 */
import type { NetworkStatus, TransactionEvent, TreasurySnapshot } from '../../types';

export interface ReceiptSummary {
  readonly hash: string;
  readonly status: 'success' | 'reverted';
  readonly blockNumber: bigint | null;
}

export interface NetworkStatusInput {
  /** Chain id the wallet reports, or null when no wallet is connected. */
  readonly connectedChainId: number | null;
  readonly now: number;
}

export interface ChainAdapter {
  readonly mode: 'live' | 'demo';
  /** Shown in the UI so the operator always knows what is feeding the screen. */
  readonly label: string;
  getNetworkStatus(input: NetworkStatusInput): Promise<NetworkStatus>;
  getTreasurySnapshot(now: number): Promise<TreasurySnapshot>;
  /** Newest first. Throws ChainUnavailableError when the RPC cannot serve it. */
  getRecentEvents(options: { readonly limit: number }): Promise<readonly TransactionEvent[]>;
  /** Null when the transaction is not yet mined. Never fabricated. */
  getReceipt(hash: string): Promise<ReceiptSummary | null>;
}

export class ChainUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainUnavailableError';
  }
}
