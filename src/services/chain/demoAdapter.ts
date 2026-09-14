/**
 * Demo chain adapter. It serves the deterministic fixtures and never touches
 * the network. Everything it returns is stamped DEMO_FIXTURE.
 */
import { ARBITRUM_SEPOLIA, SUPPORTED_CHAIN_ID } from '../../config/network';
import type { AppConfig } from '../../config/env';
import { DEMO_EVENTS, DEMO_TREASURY_BALANCE_WEI } from '../../data/demo.events';
import { DEMO_BLOCK_NUMBER, DEMO_CLOCK_SECONDS } from '../../data/demo.seed';
import {
  DEMO_GUARDIAN_ADDRESS,
  DEMO_TREASURY_ADDRESS,
} from '../../data/demo.accounts';
import { DEMO_MAX_TRANSFER_WEI, DEMO_POLICY_METHODS, DEMO_POLICY_RECIPIENTS } from '../../data/demo.policy';
import type { NetworkStatus, TransactionEvent, TreasurySnapshot } from '../../types';
import type { ChainAdapter, NetworkStatusInput, ReceiptSummary } from './types';

export function createDemoChainAdapter(config: AppConfig): ChainAdapter {
  void config;
  return {
    mode: 'demo',
    label: 'Demo Mode, deterministic fixtures',

    async getNetworkStatus({ connectedChainId, now }: NetworkStatusInput): Promise<NetworkStatus> {
      const wrongNetwork = connectedChainId !== null && connectedChainId !== SUPPORTED_CHAIN_ID;
      return {
        state: wrongNetwork ? 'WRONG_NETWORK' : 'OK',
        expectedChainId: SUPPORTED_CHAIN_ID,
        expectedChainName: ARBITRUM_SEPOLIA.name,
        connectedChainId,
        rpcUrl: ARBITRUM_SEPOLIA.defaultRpcUrl,
        explorerUrl: ARBITRUM_SEPOLIA.explorerUrl,
        blockNumber: DEMO_BLOCK_NUMBER,
        checkedAt: now,
        provenance: 'DEMO_FIXTURE',
        message: wrongNetwork
          ? 'Your wallet is on another chain. Demo data is still shown, but no action can be prepared.'
          : 'Demo Mode is active. No RPC calls are made and no funds can move.',
      };
    },

    async getTreasurySnapshot(now: number): Promise<TreasurySnapshot> {
      return {
        chainId: SUPPORTED_CHAIN_ID,
        treasuryAddress: DEMO_TREASURY_ADDRESS,
        guardianAddress: DEMO_GUARDIAN_ADDRESS,
        guardianReachable: true,
        balanceWei: DEMO_TREASURY_BALANCE_WEI,
        allowlistedRecipients: DEMO_POLICY_RECIPIENTS,
        allowedMethods: DEMO_POLICY_METHODS,
        maxTransferWei: DEMO_MAX_TRANSFER_WEI,
        blockNumber: DEMO_BLOCK_NUMBER,
        updatedAt: now,
        provenance: 'DEMO_FIXTURE',
      };
    },

    async getRecentEvents({ limit }: { limit: number }): Promise<readonly TransactionEvent[]> {
      return DEMO_EVENTS.slice(0, limit);
    },

    async getReceipt(hash: string): Promise<ReceiptSummary | null> {
      const event = DEMO_EVENTS.find((candidate) => candidate.hash === hash);
      if (!event) return null;
      return {
        hash,
        status: 'success',
        blockNumber: event.blockNumber,
      };
    },
  };
}

export { DEMO_CLOCK_SECONDS };
