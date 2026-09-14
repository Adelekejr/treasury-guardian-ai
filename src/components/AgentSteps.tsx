/** The agent's visible steps. Order is the safety story: policy before AI. */
import type { AgentStep, AgentStepState } from '../types';
import { IconCheck, IconCross, IconDash, IconPending, IconRunning } from './Icons';

const ICON: Record<AgentStepState, (props: { size?: number }) => React.JSX.Element> = {
  PENDING: IconPending,
  RUNNING: IconRunning,
  DONE: IconCheck,
  FAILED: IconCross,
  SKIPPED: IconDash,
};

const COLOUR: Record<AgentStepState, string> = {
  PENDING: 'var(--muted-dim)',
  RUNNING: 'var(--lime)',
  DONE: 'var(--lime)',
  FAILED: 'var(--danger)',
  SKIPPED: 'var(--muted-dim)',
};

const WORD: Record<AgentStepState, string> = {
  PENDING: 'Waiting',
  RUNNING: 'Running',
  DONE: 'Done',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
};

export function AgentSteps({ steps }: { steps: readonly AgentStep[] }): React.JSX.Element {
  return (
    <ol className="steps">
      {steps.map((step) => {
        const Icon = ICON[step.state];
        return (
          <li key={step.id} className="step" data-state={step.state.toLowerCase()}>
            <span className="step__icon" style={{ color: COLOUR[step.state] }}>
              <Icon size={15} />
            </span>
            <div>
              <p className="step__label">
                {step.label} <span className="dim tiny">· {WORD[step.state]}</span>
              </p>
              <p className="step__detail">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
