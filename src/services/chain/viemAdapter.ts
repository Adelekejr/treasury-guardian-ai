/**
 * Live chain adapter for Arbitrum Sepolia.
 *
 * Transport is HTTP only. The public Arbitrum RPC has no WebSocket endpoint,
 * so there is no `webSocket()` transport and no subscription watcher in this
 * file. Events are read by polling `getLogs` over a bounded block range, and
 * the caller controls the interval.
 */
import { createPublicClient, decodeEventLog, http, type Log, type PublicClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { AppConfig } from '../../config/env';
import { ARBITRUM_SEPOLIA, SUPPORTED_CHAIN_ID } from '../../config/network';
import { shortenAddress } from '../../lib/address';
import { formatEthWithUnit } from '../../lib/format';
import { TREASURY_GUARDIAN_ABI, methodLabelFromTag } from '../contract/abi';
import type { NetworkStatus, TransactionEvent, TreasurySnapshot } from '../../types';
import { ChainUnavailableError, type ChainAdapter, type NetworkStatusInput, type ReceiptSummary } from './types';

/** Cap on how many blocks we ask for timestamps for, per poll. */
const MAX_TIMESTAMP_LOOKUPS = 12;

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0] ?? 'unknown RPC error';
}

interface DecodedGuardianLog {
  readonly eventName: string;
  readonly args: Record<string, unknown>;
}

function decodeGuardianLog(log: Log): DecodedGuardianLog | null {
  try {
    const decoded = decodeEventLog({
      abi: TREASURY_GUARDIAN_ABI,
      data: log.data,
      topics: log.topics,
    });
    return {
      eventName: decoded.eventName as string,
      args: (decoded.args ?? {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

function toEvent(
  log: Log,
  decoded: DecodedGuardianLog,
  timestamp: number | null,
  guardianAddress: string,
  knownMethodLabels: readonly string[],
): TransactionEvent {
  const id = `${log.transactionHash ?? 'pending'}-${log.logIndex ?? 0}`;
  const base = {
    id,
    chainId: SUPPORTED_CHAIN_ID,
    hash: log.transactionHash ?? null,
    timestamp,
    blockNumber: log.blockNumber ?? null,
    provenance: 'ONCHAIN' as const,
  };

  const methodTagValue = typeof decoded.args.method === 'string' ? decoded.args.method : null;
  const method = methodTagValue ? methodLabelFromTag(methodTagValue, knownMethodLabels) : null;
  const to = typeof decoded.args.to === 'string' ? decoded.args.to : null;
  const value = typeof decoded.args.value === 'bigint' ? decoded.args.value : null;
  const proposalId = typeof decoded.args.id === 'bigint' ? decoded.args.id.toString() : '?';

  switch (decoded.eventName) {
    case 'ProposalCreated': {
      const reason = typeof decoded.args.reason === 'string' ? decoded.args.reason : '';
      return {
        ...base,
        from: typeof decoded.args.proposer === 'string' ? decoded.args.proposer : guardianAddress,
        to,
        valueWei: value,
        method: method ?? (methodTagValue ? `unknown (${methodTagValue})` : null),
        decodedSummary:
          `Proposal #${proposalId}: send ${formatEthWithUnit(value)} to ${shortenAddress(to)}` +
          (reason ? ` for "${reason}". Awaiting explicit approval.` : '. Awaiting explicit approval.'),
        direction: 'OUT' as const,
      };
    }
    case 'ProposalApproved':
      return {
        ...base,
        from: typeof decoded.args.approver === 'string' ? decoded.args.approver : null,
        to: guardianAddress,
        valueWei: null,
        method: 'approve',
        decodedSummary: `Proposal #${proposalId} approved by the authorised approver. Not yet executed.`,
        direction: 'INTERNAL' as const,
      };
    case 'ProposalRejected': {
      const reason = typeof decoded.args.reason === 'string' ? decoded.args.reason : '';
      return {
        ...base,
        from: typeof decoded.args.approver === 'string' ? decoded.args.approver : null,
        to: guardianAddress,
        valueWei: null,
        method: 'reject',
        decodedSummary: `Proposal #${proposalId} rejected${reason ? ` for "${reason}"` : ''}. Terminal.`,
        direction: 'INTERNAL' as const,
      };
    }
    case 'ProposalExecuted':
      return {
        ...base,
        from: guardianAddress,
        to,
        valueWei: value,
        method: method ?? (methodTagValue ? `unknown (${methodTagValue})` : null),
        decodedSummary: `Proposal #${proposalId} executed: ${formatEthWithUnit(value)} sent to ${shortenAddress(to)}.`,
        direction: 'OUT' as const,
      };
    case 'Deposit': {
      const amount = typeof decoded.args.amount === 'bigint' ? decoded.args.amount : null;
      return {
        ...base,
        from: typeof decoded.args.from === 'string' ? decoded.args.from : null,
        to: guardianAddress,
        valueWei: amount,
        method: 'transferNative',
        decodedSummary: `Deposit of ${formatEthWithUnit(amount)} into the guardian contract.`,
        direction: 'IN' as const,
      };
    }
    default:
      return {
        ...base,
        from: null,
        to: null,
        valueWei: null,
        method: null,
        decodedSummary: `Unrecognised log from the guardian contract (${decoded.eventName}).`,
        direction: 'UNKNOWN' as const,
      };
  }
}

export function createViemChainAdapter(config: AppConfig): ChainAdapter {
  // Arbitrum Sepolia only. There is no other chain object in this file.
  const client: PublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(config.rpcUrl, { timeout: 12_000, retryCount: 1 }),
  });

  async function blockTimestamps(blockNumbers: readonly bigint[]): Promise<Map<string, number>> {
    const unique = [...new Set(blockNumbers.map((value) => value.toString()))].slice(0, MAX_TIMESTAMP_LOOKUPS);
    const entries = await Promise.all(
      unique.map(async (value) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(value) });
          return [value, Number(block.timestamp)] as const;
        } catch {
          return null;
        }
      }),
    );
    return new Map(entries.filter((entry): entry is readonly [string, number] => entry !== null));
  }

  return {
    mode: 'live',
    label: `Live RPC at ${config.rpcUrl}`,

    async getNetworkStatus({ connectedChainId, now }: NetworkStatusInput): Promise<NetworkStatus> {
      const base = {
        expectedChainId: SUPPORTED_CHAIN_ID,
        expectedChainName: ARBITRUM_SEPOLIA.name,
        connectedChainId,
        rpcUrl: config.rpcUrl,
        explorerUrl: config.explorerUrl,
        checkedAt: now,
        provenance: 'ONCHAIN' as const,
      };

      try {
        const [rpcChainId, blockNumber] = await Promise.all([client.getChainId(), client.getBlockNumber()]);

        if (rpcChainId !== SUPPORTED_CHAIN_ID) {
          return {
            ...base,
            state: 'RPC_UNREACHABLE',
            blockNumber: null,
            message:
              `The configured RPC reports chain ${rpcChainId}, not ${SUPPORTED_CHAIN_ID}. ` +
              'Refusing to read from it.',
          };
        }

        if (connectedChainId !== null && connectedChainId !== SUPPORTED_CHAIN_ID) {
          return {
            ...base,
            state: 'WRONG_NETWORK',
            blockNumber,
            message: `Your wallet is on chain ${connectedChainId}. Switch to ${ARBITRUM_SEPOLIA.name} to continue.`,
          };
        }

        return {
          ...base,
          state: connectedChainId === null ? 'WALLET_DISCONNECTED' : 'OK',
          blockNumber,
          message:
            connectedChainId === null
              ? 'Reading the chain over RPC. Connect a wallet to prepare or approve an action.'
              : `Connected to ${ARBITRUM_SEPOLIA.name} at block ${blockNumber}.`,
        };
      } catch (error) {
        return {
          ...base,
          state: 'RPC_UNREACHABLE',
          blockNumber: null,
          message: `RPC unreachable: ${describeError(error)}`,
        };
      }
    },

    async getTreasurySnapshot(now: number): Promise<TreasurySnapshot> {
      const treasuryAddress = config.treasuryAddress ?? config.guardianAddress;
      if (!treasuryAddress) {
        throw new ChainUnavailableError('No treasury or contract address is configured.');
      }

      let balanceWei: bigint | null = null;
      let blockNumber: bigint | null = null;
      try {
        [balanceWei, blockNumber] = await Promise.all([
          client.getBalance({ address: treasuryAddress as `0x${string}` }),
          client.getBlockNumber(),
        ]);
      } catch (error) {
        throw new ChainUnavailableError(`Could not read the treasury balance: ${describeError(error)}`);
      }

      let guardianReachable = false;
      let allowlistedRecipients: readonly string[] = config.allowedRecipients;
      let maxTransferWei = config.maxTransferWei;

      if (config.guardianAddress) {
        try {
          const [recipients, limit] = await Promise.all([
            client.readContract({
              address: config.guardianAddress as `0x${string}`,
              abi: TREASURY_GUARDIAN_ABI,
              functionName: 'allowedRecipients',
            }),
            client.readContract({
              address: config.guardianAddress as `0x${string}`,
              abi: TREASURY_GUARDIAN_ABI,
              functionName: 'maxTransferWei',
            }),
          ]);
          allowlistedRecipients = recipients as readonly string[];
          maxTransferWei = limit as bigint;
          guardianReachable = true;
        } catch {
          guardianReachable = false;
        }
      }

      return {
        chainId: SUPPORTED_CHAIN_ID,
        treasuryAddress,
        guardianAddress: config.guardianAddress,
        guardianReachable,
        balanceWei,
        allowlistedRecipients,
        allowedMethods: config.allowedMethods,
        maxTransferWei,
        blockNumber,
        updatedAt: now,
        provenance: 'ONCHAIN',
      };
    },

    async getRecentEvents({ limit }: { limit: number }): Promise<readonly TransactionEvent[]> {
      if (!config.guardianAddress) {
        throw new ChainUnavailableError(
          'No contract address is configured, so there are no guardian logs to poll.',
        );
      }

      let head: bigint;
      try {
        head = await client.getBlockNumber();
      } catch (error) {
        throw new ChainUnavailableError(`RPC unreachable: ${describeError(error)}`);
      }

      const fromBlock = head > config.lookbackBlocks ? head - config.lookbackBlocks : 0n;

      let logs: Log[];
      try {
        logs = await client.getLogs({
          address: config.guardianAddress as `0x${string}`,
          fromBlock,
          toBlock: head,
        });
      } catch (error) {
        throw new ChainUnavailableError(`getLogs failed: ${describeError(error)}`);
      }

      const newestFirst = [...logs].reverse().slice(0, limit);
      const timestamps = await blockTimestamps(
        newestFirst.map((log) => log.blockNumber).filter((value): value is bigint => value !== null),
      );

      const events: TransactionEvent[] = [];
      for (const log of newestFirst) {
        const decoded = decodeGuardianLog(log);
        if (!decoded) continue;
        const timestamp = log.blockNumber ? (timestamps.get(log.blockNumber.toString()) ?? null) : null;
        events.push(
          toEvent(log, decoded, timestamp, config.guardianAddress, config.allowedMethods),
        );
      }
      return events;
    },

    async getReceipt(hash: string): Promise<ReceiptSummary | null> {
      try {
        const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
        return {
          hash,
          status: receipt.status === 'success' ? 'success' : 'reverted',
          blockNumber: receipt.blockNumber ?? null,
        };
      } catch {
        // Not mined yet, or the RPC could not answer. Never claim success.
        return null;
      }
    },
  };
}
