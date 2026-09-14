/**
 * Contract service: the only place that can move testnet value.
 *
 * A proposed action reaches the chain in three explicit, separately
 * acknowledged transactions — propose, approve, execute — so nothing is
 * autonomous and nothing is bundled behind a single click's worth of consent.
 * Every hash reported here comes from a real receipt; nothing is fabricated.
 */
import { createPublicClient, createWalletClient, custom, http, type PublicClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { AppConfig } from '../../config/env';
import { SUPPORTED_CHAIN_ID } from '../../config/network';
import type { ApprovalResult, ProposedAction } from '../../types';
import { getActiveProvider } from '../wallet/walletService';
import { TREASURY_GUARDIAN_ABI, methodTag } from './abi';

export type SubmissionStepId = 'PROPOSE' | 'APPROVE' | 'EXECUTE';

export interface SubmissionStep {
  readonly id: SubmissionStepId;
  readonly label: string;
  readonly state: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  readonly hash: string | null;
  readonly message: string;
}

export interface SubmitOptions {
  readonly approverAddress: string;
  readonly note: string;
  readonly now: number;
  readonly onStep?: (step: SubmissionStep) => void;
}

export interface ContractService {
  readonly mode: 'live' | 'demo';
  readonly available: boolean;
  readonly unavailableReason: string | null;
  /** Propose → approve → execute, each awaited on a real receipt. */
  submitApproval(action: ProposedAction, options: SubmitOptions): Promise<ApprovalResult>;
  /** Records a rejection. Never sends value. */
  submitRejection(action: ProposedAction, options: SubmitOptions): Promise<ApprovalResult>;
}

function rejectionResult(
  action: ProposedAction,
  options: SubmitOptions,
  provenance: ApprovalResult['provenance'],
): ApprovalResult {
  return {
    actionId: action.id,
    decision: 'REJECTED',
    decidedAt: options.now,
    decidedBy: options.approverAddress,
    note: options.note,
    status: 'NOT_SUBMITTED',
    txHash: null,
    receiptBlockNumber: null,
    provenance,
  };
}

/** Demo service: records decisions locally and never broadcasts anything. */
export function createDemoContractService(): ContractService {
  return {
    mode: 'demo',
    available: true,
    unavailableReason: null,

    async submitApproval(action, options) {
      options.onStep?.({
        id: 'PROPOSE',
        label: 'Record proposal',
        state: 'skipped',
        hash: null,
        message: 'Demo Mode — nothing is broadcast and no transaction hash exists.',
      });
      return {
        actionId: action.id,
        decision: 'APPROVED',
        decidedAt: options.now,
        decidedBy: options.approverAddress,
        note: options.note,
        status: 'NOT_SUBMITTED',
        txHash: null,
        receiptBlockNumber: null,
        provenance: 'DEMO_FIXTURE',
      };
    },

    async submitRejection(action, options) {
      return rejectionResult(action, options, 'DEMO_FIXTURE');
    },
  };
}

export function createLiveContractService(config: AppConfig): ContractService {
  const guardianAddress = config.guardianAddress;

  if (!guardianAddress) {
    const reason = 'No TreasuryGuardian address is configured (VITE_GUARDIAN_ADDRESS is empty).';
    return {
      mode: 'live',
      available: false,
      unavailableReason: reason,
      async submitApproval() {
        throw new Error(reason);
      },
      async submitRejection(action, options) {
        return rejectionResult(action, options, 'ONCHAIN');
      },
    };
  }

  const publicClient: PublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(config.rpcUrl, { timeout: 20_000, retryCount: 1 }),
  });

  async function sendAndConfirm(
    step: SubmissionStepId,
    label: string,
    options: SubmitOptions,
    send: () => Promise<`0x${string}`>,
  ): Promise<`0x${string}`> {
    options.onStep?.({ id: step, label, state: 'running', hash: null, message: 'Waiting for wallet confirmation…' });
    const hash = await send();
    options.onStep?.({ id: step, label, state: 'running', hash, message: 'Submitted. Waiting for the receipt…' });

    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== 'success') {
      options.onStep?.({ id: step, label, state: 'failed', hash, message: 'Transaction reverted on chain.' });
      throw new Error(`${label} reverted on chain (${hash}).`);
    }
    options.onStep?.({
      id: step,
      label,
      state: 'done',
      hash,
      message: `Confirmed in block ${receipt.blockNumber}.`,
    });
    return hash;
  }

  return {
    mode: 'live',
    available: true,
    unavailableReason: null,

    async submitApproval(action, options) {
      const provider = getActiveProvider();
      if (!provider) throw new Error('No wallet is connected.');
      if (action.chainId !== SUPPORTED_CHAIN_ID) {
        throw new Error(`Refusing to submit on chain ${action.chainId}.`);
      }

      const walletClient = createWalletClient({
        chain: arbitrumSepolia,
        transport: custom(provider),
        account: options.approverAddress as `0x${string}`,
      });

      const contract = {
        address: guardianAddress as `0x${string}`,
        abi: TREASURY_GUARDIAN_ABI,
      } as const;

      await sendAndConfirm('PROPOSE', 'Record proposal', options, () =>
        walletClient.writeContract({
          ...contract,
          functionName: 'propose',
          args: [action.to as `0x${string}`, action.valueWei, methodTag(action.method), action.reason],
          chain: arbitrumSepolia,
          account: options.approverAddress as `0x${string}`,
        }),
      );

      const proposalId = (await publicClient.readContract({
        ...contract,
        functionName: 'proposalCount',
      })) as bigint;

      await sendAndConfirm('APPROVE', 'Approve proposal', options, () =>
        walletClient.writeContract({
          ...contract,
          functionName: 'approve',
          args: [proposalId],
          chain: arbitrumSepolia,
          account: options.approverAddress as `0x${string}`,
        }),
      );

      const executeHash = await sendAndConfirm('EXECUTE', 'Execute transfer', options, () =>
        walletClient.writeContract({
          ...contract,
          functionName: 'execute',
          args: [proposalId],
          chain: arbitrumSepolia,
          account: options.approverAddress as `0x${string}`,
        }),
      );

      const receipt = await publicClient.getTransactionReceipt({ hash: executeHash });

      return {
        actionId: action.id,
        decision: 'APPROVED',
        decidedAt: options.now,
        decidedBy: options.approverAddress,
        note: options.note,
        status: receipt.status === 'success' ? 'CONFIRMED' : 'FAILED',
        txHash: executeHash,
        receiptBlockNumber: receipt.blockNumber ?? null,
        provenance: 'ONCHAIN',
      };
    },

    async submitRejection(action, options) {
      // A rejection of an action that was never proposed on chain costs no gas.
      return rejectionResult(action, options, 'ONCHAIN');
    },
  };
}

export function createContractService(config: AppConfig): ContractService {
  return config.demoMode ? createDemoContractService() : createLiveContractService(config);
}
