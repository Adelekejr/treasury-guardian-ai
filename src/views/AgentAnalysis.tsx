/** Screen 3 — Agent analysis. The steps are visible, and their order matters. */
import { useEffect } from 'react';
import { RiskBadge, ProvenanceBadge } from '../components/Badges';
import { AgentSteps } from '../components/AgentSteps';
import { AiExplanationPanel } from '../components/AiExplanationPanel';
import { Notice } from '../components/Notice';
import { PolicyChecklist } from '../components/PolicyChecklist';
import { EmptyState } from '../components/Skeleton';
import { StateBanners } from '../components/StateBanners';
import { isProposable } from '../services/policy/rules';
import { useApp } from '../state/useApp';
import { hrefFor, type Route } from '../state/router';

export function AgentAnalysis({
  eventId,
  navigate,
}: {
  eventId: string;
  navigate: (route: Route) => void;
}): React.JSX.Element {
  const { events, assessments, runs, conflicts, analyse, aiName, aiReason } = useApp();
  const event = events.find((candidate) => candidate.id === eventId);
  const assessment = assessments.get(eventId);
  const run = runs[eventId];

  useEffect(() => {
    if (event && !run) void analyse(eventId);
  }, [analyse, event, eventId, run]);

  if (!event || !assessment) {
    return (
      <div className="stack stack--lg">
        <StateBanners />
        <EmptyState
          title="Nothing to analyse"
          detail="This event is not in the current polling window."
        />
        <a className="btn btn--sm" href={hrefFor({ name: 'overview' })}>
          Back to overview
        </a>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <StateBanners />

      <div className="row row--between">
        <div>
          <h1>Agent analysis</h1>
          <p className="muted small">{event.decodedSummary}</p>
        </div>
        <div className="row">
          <RiskBadge verdict={assessment.verdict} />
          <ProvenanceBadge provenance={event.provenance} />
        </div>
      </div>

      <Notice tone="info" title="Deterministic first, explanation second.">
        The verdict is computed in code before {aiName} is called, and is passed to it as read-only
        context. Any verdict field in a model response is discarded.
      </Notice>

      <section className="card stack" aria-label="Agent steps">
        <div className="card__head">
          <h2>Steps</h2>
          <span className="small muted">{aiReason}</span>
        </div>
        <AgentSteps steps={run?.steps ?? []} />
      </section>

      <div className="grid--2">
        <section className="stack">
          <PolicyChecklist checks={assessment.checks} />
        </section>
        <AiExplanationPanel
          state={run?.ai ?? { status: 'LOADING', explanation: null, error: null }}
          facts={assessment.observedFacts}
          verdict={assessment.verdict}
          conflicts={conflicts[eventId] ?? false}
          adapterName={aiName}
          adapterReason={aiReason}
        />
      </div>

      <div className="row">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!isProposable(assessment.verdict)}
          onClick={() => navigate({ name: 'approve', id: event.id })}
        >
          Continue to approval
        </button>
        <a className="btn" href={hrefFor({ name: 'event', id: event.id })}>
          Back to inspection
        </a>
      </div>
    </div>
  );
}
