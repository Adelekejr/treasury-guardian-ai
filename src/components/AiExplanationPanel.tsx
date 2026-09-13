/**
 * The AI's slot in the UI. It is always rendered next to the deterministic
 * verdict, always labelled advisory, and never replaces the verdict.
 */
import type { AiExplanationState, ObservedFact, RiskVerdict } from '../types';
import { verdictLabel } from '../services/policy/rules';
import { Notice } from './Notice';

const RECOMMENDATION_WORD: Record<string, string> = {
  APPROVE_FOR_REVIEW: 'Approve for review',
  REQUIRE_REVIEW: 'Require review',
  BLOCK: 'Block',
};

export function AiExplanationPanel({
  state,
  facts,
  verdict,
  conflicts,
  adapterName,
  adapterReason,
}: {
  state: AiExplanationState;
  facts: readonly ObservedFact[];
  verdict: RiskVerdict;
  conflicts: boolean;
  adapterName: string;
  adapterReason: string;
}): React.JSX.Element {
  if (state.status === 'LOADING') {
    return (
      <div className="card stack" aria-busy="true">
        <h3>AI explanation</h3>
        <p className="small muted">Asking {adapterName} to explain the verdict…</p>
      </div>
    );
  }

  if (state.status !== 'READY' || !state.explanation) {
    return (
      <div className="card stack">
        <div className="card__head">
          <h3>AI explanation unavailable</h3>
        </div>
        <Notice tone="warning" title="The explanation could not be produced.">
          {state.error ?? 'No explanation has been requested yet.'}
        </Notice>
        <p className="small muted">
          The deterministic verdict <strong>{verdictLabel(verdict)}</strong> and the evidence below are
          unaffected — the app never depends on the model to decide.
        </p>
      </div>
    );
  }

  const explanation = state.explanation;
  const citedFacts = facts.filter((fact) => explanation.citedFactIds.includes(fact.id));

  return (
    <div className="card stack">
      <div className="card__head">
        <h3>AI explanation</h3>
        <span className="badge badge--unknown">Advisory only</span>
      </div>

      <p>{explanation.summary}</p>
      <p className="small muted">{explanation.rationale}</p>

      <dl className="kv">
        <dt>Advisory recommendation</dt>
        <dd>
          {RECOMMENDATION_WORD[explanation.recommendation] ?? explanation.recommendation}
          <span className="muted"> · policy verdict {verdictLabel(verdict)} governs</span>
        </dd>
        <dt>Provider</dt>
        <dd>
          {explanation.provider}
          <div className="tiny muted">{adapterReason}</div>
        </dd>
      </dl>

      {conflicts ? (
        <Notice tone="warning" title="The model is softer than policy. Policy wins.">
          The recommendation is weaker than the deterministic verdict. It is displayed for
          transparency and has no effect on what the app allows.
        </Notice>
      ) : null}

      {explanation.ignoredModelFields.length > 0 ? (
        <Notice tone="danger" title="Fields returned by the model were discarded.">
          The response tried to set: <code>{explanation.ignoredModelFields.join(', ')}</code>. The
          schema has no such fields, so they were dropped before display.
        </Notice>
      ) : null}

      <div className="stack" style={{ gap: 4 }}>
        <h4 style={{ margin: 0, fontSize: 13 }} className="muted">
          Facts cited ({citedFacts.length})
        </h4>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {citedFacts.map((fact) => (
            <li key={fact.id}>
              <span className="muted">{fact.label}:</span> {fact.value}
            </li>
          ))}
        </ul>
      </div>

      {explanation.caveats.length > 0 ? (
        <ul className="tiny muted" style={{ margin: 0, paddingLeft: 18 }}>
          {explanation.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      ) : null}

      <p className="tiny muted">
        Descriptive explanation of testnet activity. Not financial advice.
      </p>
    </div>
  );
}
