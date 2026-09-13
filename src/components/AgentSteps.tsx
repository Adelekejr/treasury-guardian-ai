/** The agent's visible steps. Order is the safety story: policy before AI. */
import type { AgentStep, AgentStepState } from '../types';

const GLYPH: Record<AgentStepState, string> = {
  PENDING: '○',
  RUNNING: '◐',
  DONE: '●',
  FAILED: '✕',
  SKIPPED: '–',
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
      {steps.map((step) => (
        <li key={step.id} className="step" data-state={step.state.toLowerCase()}>
          <span className="step__glyph" aria-hidden="true">
            {GLYPH[step.state]}
          </span>
          <div>
            <p className="step__label">
              {step.label} <span className="muted small">· {WORD[step.state]}</span>
            </p>
            <p className="step__detail">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
