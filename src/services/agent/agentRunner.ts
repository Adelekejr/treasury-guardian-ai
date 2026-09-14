/**
 * Agent orchestration.
 *
 * The order carries the safety argument. Fetch, classify, run the
 * deterministic policy, and only then ask the model, with the verdict already
 * fixed and passed in as read-only context. The returned assessment is the one
 * the policy engine produced. An AI result can only populate the explanation
 * slot.
 */
import type { PolicyConfig } from '../../config/policy';
import type { AgentRun, AgentStep, AgentStepId, TransactionEvent } from '../../types';
import { assessEvent } from '../policy/rules';
import { aiConflictsWithPolicy, aiUnavailable, type GuardedAnalysis } from '../ai/guard';
import type { AiAdapter } from '../ai/types';

export interface AgentRunOptions {
  readonly event: TransactionEvent;
  readonly policy: PolicyConfig;
  readonly ai: AiAdapter;
  readonly now: number;
  /** Pause between visible steps, in ms. Zero in tests. */
  readonly stepDelayMs?: number;
  readonly onUpdate?: (run: AgentRun) => void;
  readonly signal?: AbortSignal;
}

const STEP_LABELS: Record<AgentStepId, string> = {
  FETCH: 'Fetching transaction data',
  CLASSIFY: 'Classifying the transaction',
  POLICY: 'Checking deterministic policy',
  RECOMMEND: 'Preparing the recommendation',
};

const STEP_ORDER: readonly AgentStepId[] = ['FETCH', 'CLASSIFY', 'POLICY', 'RECOMMEND'];

function initialSteps(): AgentStep[] {
  return STEP_ORDER.map((id) => ({
    id,
    label: STEP_LABELS[id],
    state: 'PENDING' as const,
    detail: 'Waiting.',
  }));
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AgentRunResult {
  readonly run: AgentRun;
  readonly guarded: GuardedAnalysis;
}

export async function runAgentAnalysis(options: AgentRunOptions): Promise<AgentRunResult> {
  const { event, policy, ai, now } = options;
  const delay = options.stepDelayMs ?? 0;

  let steps = initialSteps();
  let run: AgentRun = {
    id: `run-${event.id}-${now}`,
    eventId: event.id,
    startedAt: now,
    finishedAt: null,
    steps,
    assessment: null,
    ai: { status: 'IDLE', explanation: null, error: null },
    provenance: event.provenance,
  };

  const update = (patch: Partial<AgentRun>): void => {
    run = { ...run, ...patch, steps };
    options.onUpdate?.(run);
  };

  const setStep = (id: AgentStepId, state: AgentStep['state'], detail: string): void => {
    steps = steps.map((step) => (step.id === id ? { ...step, state, detail } : step));
    update({});
  };

  // 1. Fetch. The event is already in hand, so record where it came from.
  setStep('FETCH', 'RUNNING', 'Reading the event record.');
  await sleep(delay);
  setStep(
    'FETCH',
    'DONE',
    event.provenance === 'ONCHAIN'
      ? `Read from chain ${event.chainId}${event.hash ? ` (${event.hash.slice(0, 12)}…)` : ''}.`
      : 'Loaded from a deterministic demo fixture.',
  );

  // 2. Classify. Describe the transaction without judging it.
  setStep('CLASSIFY', 'RUNNING', 'Decoding recipient, value and method.');
  await sleep(delay);
  const missing = [
    event.to ? null : 'recipient',
    event.valueWei === null ? 'value' : null,
    event.method ? null : 'method',
  ].filter((entry): entry is string => entry !== null);
  setStep(
    'CLASSIFY',
    missing.length > 0 ? 'DONE' : 'DONE',
    missing.length > 0
      ? `Decoded with gaps, missing ${missing.join(', ')}.`
      : `${event.direction} · ${event.method} · ${event.decodedSummary}`,
  );

  // 3. Deterministic policy. Runs before the model, with no model input.
  setStep('POLICY', 'RUNNING', 'Running the deterministic rules.');
  await sleep(delay);
  const assessment = assessEvent(event, policy, now);
  update({ assessment });
  setStep('POLICY', 'DONE', `Verdict ${assessment.verdict} from ${assessment.checks.length} rules.`);

  // 4. Explanation. Advisory only.
  setStep('RECOMMEND', 'RUNNING', `Asking ${ai.name} to explain the verdict.`);
  let guarded: GuardedAnalysis;
  try {
    const aiState = await ai.explain({
      event,
      assessment,
      facts: assessment.observedFacts,
      now,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    guarded = {
      // Same object in and out, so the verdict handed to the model survives.
      assessment,
      ai: aiState,
      recommendationConflictsWithPolicy: aiConflictsWithPolicy(
        assessment.verdict,
        aiState.explanation?.recommendation ?? null,
      ),
    };
  } catch (error) {
    guarded = aiUnavailable(assessment, `AI adapter threw: ${(error as Error).message}`);
  }

  update({ ai: guarded.ai });
  setStep(
    'RECOMMEND',
    guarded.ai.status === 'READY' ? 'DONE' : 'FAILED',
    guarded.ai.status === 'READY'
      ? `Explanation ready (advisory ${guarded.ai.explanation?.recommendation}). The verdict is unchanged.`
      : (guarded.ai.error ?? 'AI explanation unavailable. The deterministic verdict still stands.'),
  );

  update({ finishedAt: now, assessment, ai: guarded.ai });

  return { run, guarded: { ...guarded, assessment } };
}
