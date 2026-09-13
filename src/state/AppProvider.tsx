/**
 * Application state.
 *
 * One place decides which adapters are live, so Demo Mode, the wrong-network
 * state and every outage path are handled once rather than per screen.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { appConfig } from '../config/env';
import { SUPPORTED_CHAIN_ID } from '../config/network';
import { POLICY_VERSION, policyFromAppConfig, type PolicyConfig } from '../config/policy';
import { AppContext, type AppContextValue, type SimulatedState, type WalletState } from './appContext';
import { DEMO_MAX_TRANSFER_WEI, DEMO_POLICY_METHODS, DEMO_POLICY_RECIPIENTS } from '../data/demo.policy';
import { DEMO_CLOCK_SECONDS } from '../data/demo.seed';
import { createChainAdapter, createDemoChainAdapter, ChainUnavailableError } from '../services/chain';
import type { ChainAdapter } from '../services/chain';
import {
  createContractService,
  createDemoContractService,
  type ContractService,
  type SubmissionStep,
} from '../services/contract/guardianService';
import { selectAiAdapter } from '../services/ai';
import type { AiAdapter } from '../services/ai';
import { runAgentAnalysis } from '../services/agent/agentRunner';
import { assessEvent, isProposable } from '../services/policy/rules';
import {
  connectWallet,
  getChainId,
  getConnectedAccounts,
  hasInjectedWallet,
  subscribeToWallet,
  switchToArbitrumSepolia,
} from '../services/wallet/walletService';
import type {
  AgentRun,
  ApprovalResult,
  NetworkStatus,
  ProposedAction,
  RiskAssessment,
  TransactionEvent,
  TreasurySnapshot,
} from '../types';


const DEMO_POLICY: PolicyConfig = {
  chainId: SUPPORTED_CHAIN_ID,
  allowedRecipients: DEMO_POLICY_RECIPIENTS,
  allowedMethods: DEMO_POLICY_METHODS,
  maxTransferWei: DEMO_MAX_TRANSFER_WEI,
  version: POLICY_VERSION,
};

const FAILING_AI_ADAPTER: AiAdapter = {
  name: 'Simulated outage',
  kind: 'remote',
  async explain() {
    return {
      status: 'UNAVAILABLE',
      explanation: null,
      error: 'Simulated provider outage — the deterministic verdict and evidence still stand.',
    };
  },
};

const UNAVAILABLE_CONTRACT: ContractService = {
  mode: 'live',
  available: false,
  unavailableReason: 'Simulated contract outage — the guardian contract cannot be reached.',
  async submitApproval() {
    throw new Error('The guardian contract is unavailable.');
  },
  async submitRejection(action, options) {
    return {
      actionId: action.id,
      decision: 'REJECTED',
      decidedAt: options.now,
      decidedBy: options.approverAddress,
      note: options.note,
      status: 'NOT_SUBMITTED',
      txHash: null,
      receiptBlockNumber: null,
      provenance: 'ONCHAIN',
    };
  },
};

export function AppProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const config = appConfig;

  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [simulated, setSimulated] = useState<SimulatedState>('NONE');
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [snapshot, setSnapshot] = useState<TreasurySnapshot | null>(null);
  const [events, setEvents] = useState<readonly TransactionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainError, setChainError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, AgentRun>>({});
  const [conflicts, setConflicts] = useState<Record<string, boolean>>({});
  const [proposals, setProposals] = useState<Record<string, ProposedAction>>({});
  const [approvals, setApprovals] = useState<Record<string, ApprovalResult>>({});
  const [submissionSteps, setSubmissionSteps] = useState<readonly SubmissionStep[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiKey, setAiKeyState] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    connecting: false,
    error: null,
    available: hasInjectedWallet(),
  });

  const demoActive = config.demoMode || fallbackReason !== null;
  const demoReason = config.demoMode
    ? 'VITE_DEMO_MODE is true — the app runs entirely on deterministic fixtures.'
    : fallbackReason;

  const nowSeconds = useCallback(
    () => (demoActive ? DEMO_CLOCK_SECONDS : Math.floor(Date.now() / 1000)),
    [demoActive],
  );

  const chainAdapter: ChainAdapter = useMemo(
    () => (demoActive ? createDemoChainAdapter(config) : createChainAdapter(config)),
    [config, demoActive],
  );

  const contractService: ContractService = useMemo(() => {
    if (simulated === 'CONTRACT_UNAVAILABLE') return UNAVAILABLE_CONTRACT;
    return demoActive ? createDemoContractService() : createContractService(config);
  }, [config, demoActive, simulated]);

  const aiSelection = useMemo(() => selectAiAdapter(aiKey), [aiKey]);
  const aiAdapter = simulated === 'AI_UNAVAILABLE' ? FAILING_AI_ADAPTER : aiSelection.adapter;
  const aiReason =
    simulated === 'AI_UNAVAILABLE'
      ? 'Simulated AI outage — the app keeps working without an explanation.'
      : aiSelection.reason;

  const policy = useMemo(
    () => (demoActive ? DEMO_POLICY : policyFromAppConfig(config)),
    [config, demoActive],
  );

  const assessments = useMemo(() => {
    const now = demoActive ? DEMO_CLOCK_SECONDS : Math.floor(Date.now() / 1000);
    const map = new Map<string, RiskAssessment>();
    for (const event of events) {
      map.set(event.id, assessEvent(event, policy, now));
    }
    return map;
  }, [events, policy, demoActive]);

  const effectiveChainId = simulated === 'WRONG_NETWORK' ? 1 : simulated === 'WALLET_DISCONNECTED' ? null : wallet.chainId;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (simulated === 'RPC_UNREACHABLE') {
        setNetwork({
          state: 'RPC_UNREACHABLE',
          expectedChainId: SUPPORTED_CHAIN_ID,
          expectedChainName: config.chainName,
          connectedChainId: effectiveChainId,
          rpcUrl: config.rpcUrl,
          explorerUrl: config.explorerUrl,
          blockNumber: null,
          checkedAt: nowSeconds(),
          provenance: demoActive ? 'DEMO_FIXTURE' : 'ONCHAIN',
          message: 'Simulated RPC outage — no chain reads are possible right now.',
        });
        setEvents([]);
        setSnapshot(null);
        setChainError('Simulated RPC outage.');
        return;
      }

      const status = await chainAdapter.getNetworkStatus({
        connectedChainId: effectiveChainId,
        now: nowSeconds(),
      });
      setNetwork(status);

      const [nextSnapshot, nextEvents] = await Promise.all([
        chainAdapter.getTreasurySnapshot(nowSeconds()),
        chainAdapter.getRecentEvents({ limit: 50 }),
      ]);
      setSnapshot(nextSnapshot);
      setEvents(nextEvents);
      setChainError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChainError(message);
      if (error instanceof ChainUnavailableError && !config.demoMode && fallbackReason === null) {
        setFallbackReason(`Live data is unavailable (${message}). Falling back to Demo Mode fixtures.`);
      }
    } finally {
      setLoading(false);
    }
  }, [chainAdapter, config, demoActive, effectiveChainId, fallbackReason, nowSeconds, simulated]);

  // Poll on an interval. There is no websocket watcher: the public Arbitrum
  // RPC does not support one.
  useEffect(() => {
    let cancelled = false;
    const tick = (): void => {
      if (!cancelled) void refresh();
    };
    tick();
    const timer = setInterval(tick, config.pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refresh, config.pollIntervalMs]);

  // Reflect wallet changes without polling the wallet.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const accounts = await getConnectedAccounts();
      const chainId = await getChainId();
      if (cancelled) return;
      setWallet((previous) => ({
        ...previous,
        address: accounts[0] ?? null,
        chainId,
        available: hasInjectedWallet(),
      }));
    })();

    const unsubscribe = subscribeToWallet({
      onAccountsChanged: (accounts) =>
        setWallet((previous) => ({ ...previous, address: accounts[0] ?? null })),
      onChainChanged: (chainId) => setWallet((previous) => ({ ...previous, chainId })),
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const analysisInFlight = useRef<Set<string>>(new Set());

  const analyse = useCallback(
    async (eventId: string) => {
      const event = events.find((candidate) => candidate.id === eventId);
      if (!event || analysisInFlight.current.has(eventId)) return;
      analysisInFlight.current.add(eventId);

      try {
        const { run, guarded } = await runAgentAnalysis({
          event,
          policy,
          ai: aiAdapter,
          now: nowSeconds(),
          stepDelayMs: 320,
          onUpdate: (partial) => setRuns((previous) => ({ ...previous, [eventId]: partial })),
        });
        setRuns((previous) => ({ ...previous, [eventId]: run }));
        setConflicts((previous) => ({
          ...previous,
          [eventId]: guarded.recommendationConflictsWithPolicy,
        }));
      } finally {
        analysisInFlight.current.delete(eventId);
      }
    },
    [aiAdapter, events, nowSeconds, policy],
  );

  const prepare = useCallback(
    (eventId: string): ProposedAction | null => {
      const event = events.find((candidate) => candidate.id === eventId);
      const assessment = assessments.get(eventId);
      if (!event || !assessment) return null;
      if (!isProposable(assessment.verdict)) return null;
      if (!event.to || event.valueWei === null || !event.method) return null;

      const action: ProposedAction = {
        id: `action-${event.id}`,
        kind: 'NATIVE_TRANSFER',
        chainId: SUPPORTED_CHAIN_ID,
        to: event.to,
        valueWei: event.valueWei,
        method: event.method,
        calldataSummary:
          `propose(to=${event.to}, value=${event.valueWei} wei, method=${event.method}) then ` +
          'approve(id) then execute(id) on TreasuryGuardian. No other call is made.',
        reason: event.decodedSummary,
        createdAt: nowSeconds(),
        sourceEventId: event.id,
        assessment,
        provenance: event.provenance,
      };
      setProposals((previous) => ({ ...previous, [eventId]: action }));
      return action;
    },
    [assessments, events, nowSeconds],
  );

  const approve = useCallback(
    async (eventId: string, note: string) => {
      const action = proposals[eventId] ?? prepare(eventId);
      if (!action) {
        setSubmitError('No action could be prepared for this event.');
        return;
      }
      if (action.assessment.verdict === 'BLOCKED' || action.assessment.verdict === 'INSUFFICIENT_DATA') {
        setSubmitError('Policy blocks this action. Approval is not available.');
        return;
      }

      setSubmitting(true);
      setSubmitError(null);
      setSubmissionSteps([]);
      try {
        const result = await contractService.submitApproval(action, {
          approverAddress: wallet.address ?? 'demo-approver',
          note,
          now: nowSeconds(),
          onStep: (step) =>
            setSubmissionSteps((previous) => {
              const others = previous.filter((candidate) => candidate.id !== step.id);
              return [...others, step];
            }),
        });
        setApprovals((previous) => ({ ...previous, [eventId]: result }));
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : String(error));
      } finally {
        setSubmitting(false);
      }
    },
    [contractService, nowSeconds, prepare, proposals, wallet.address],
  );

  const reject = useCallback(
    async (eventId: string, note: string) => {
      const action = proposals[eventId] ?? prepare(eventId);
      if (!action) {
        setSubmitError('No action could be prepared for this event.');
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        const result = await contractService.submitRejection(action, {
          approverAddress: wallet.address ?? 'demo-approver',
          note,
          now: nowSeconds(),
        });
        setApprovals((previous) => ({ ...previous, [eventId]: result }));
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : String(error));
      } finally {
        setSubmitting(false);
      }
    },
    [contractService, nowSeconds, prepare, proposals, wallet.address],
  );

  const connect = useCallback(async () => {
    setWallet((previous) => ({ ...previous, connecting: true, error: null }));
    try {
      const connection = await connectWallet();
      setWallet({
        address: connection.address,
        chainId: connection.chainId,
        connecting: false,
        error: null,
        available: true,
      });
    } catch (error) {
      setWallet((previous) => ({
        ...previous,
        connecting: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      await switchToArbitrumSepolia();
      const chainId = await getChainId();
      setWallet((previous) => ({ ...previous, chainId, error: null }));
      setSimulated((previous) => (previous === 'WRONG_NETWORK' ? 'NONE' : previous));
    } catch (error) {
      setWallet((previous) => ({
        ...previous,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  const setAiKey = useCallback((key: string | null) => {
    // Session-only: held in React state, never written to storage.
    setAiKeyState(key && key.trim().length > 0 ? key.trim() : null);
  }, []);

  const value: AppContextValue = {
    config,
    policy,
    demoActive,
    demoReason,
    adapterLabel: chainAdapter.label,
    network,
    snapshot,
    events,
    assessments,
    loading,
    chainError,
    runs,
    conflicts,
    proposals,
    approvals,
    submissionSteps,
    submitting,
    submitError,
    wallet: { ...wallet, chainId: effectiveChainId },
    aiName: aiAdapter.name,
    aiReason,
    aiKeySet: aiKey !== null,
    contractAvailable: contractService.available,
    contractReason: contractService.unavailableReason,
    simulated,
    nowSeconds,
    refresh,
    analyse,
    prepare,
    approve,
    reject,
    connect,
    switchNetwork,
    setAiKey,
    setSimulated,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
