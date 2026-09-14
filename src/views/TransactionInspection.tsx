/** Screen 2. Transaction inspection: everything the reviewer needs, decoded. */
import { ARBITRUM_SEPOLIA, explorerTxUrl } from '../config/network';
import { demoLabelFor } from '../data/demo.accounts';
import { formatEthWithUnit, formatTimestamp } from '../lib/format';
import { isProposable } from '../services/policy/rules';
import { ProvenanceMark, RiskBadge } from '../components/Badges';
import { Notice } from '../components/Notice';
import { PolicyChecklist } from '../components/PolicyChecklist';
import { EmptyState } from '../components/Skeleton';
import { StatusStrip } from '../components/StatusStrip';
import { useApp } from '../state/useApp';
import { hrefFor, type Route } from '../state/router';

export function TransactionInspection({
  eventId,
  navigate,
}: {
  eventId: string;
  navigate: (route: Route) => void;
}): React.JSX.Element {
  const { events, assessments, demoActive } = useApp();
  const event = events.find((candidate) => candidate.id === eventId);
  const assessment = assessments.get(eventId);

  if (!event || !assessment) {
    return (
      <div className="stack stack--lg">
        <StatusStrip />
        <EmptyState
          title="That transaction is not in this session"
          detail="It may have scrolled out of the polling window. Go back to the overview and pick another."
        />
        <a className="btn btn--sm" href={hrefFor({ name: 'overview' })}>
          Back to overview
        </a>
      </div>
    );
  }

  const recipientLabel = demoLabelFor(event.to);
  const canPropose = isProposable(assessment.verdict);

  return (
    <div className="stack stack--lg">
      <StatusStrip />

      <div className="row row--between">
        <div>
          <h1>Transaction inspection</h1>
          <p className="prov">{event.id}</p>
        </div>
        <div className="row">
          <RiskBadge verdict={assessment.verdict} />
          <ProvenanceMark provenance={event.provenance} />
        </div>
      </div>

      <section className="card stack" aria-label="Transaction detail">
        <dl className="kv">
          <dt>Chain</dt>
          <dd>
            {event.chainId === ARBITRUM_SEPOLIA.id
              ? `${ARBITRUM_SEPOLIA.name} (${event.chainId})`
              : `Chain ${event.chainId}, which is not a supported target`}
          </dd>
          <dt>Recipient</dt>
          <dd className="mono breakable">
            {event.to ?? 'missing'}
            {recipientLabel ? <div className="tiny dim prose">{recipientLabel}</div> : null}
          </dd>
          <dt>Sender</dt>
          <dd className="mono breakable">{event.from ?? 'unknown'}</dd>
          <dt>Value</dt>
          <dd>{formatEthWithUnit(event.valueWei)}</dd>
          <dt>Method</dt>
          <dd>{event.method ?? 'missing'}</dd>
          <dt>Timestamp</dt>
          <dd>{formatTimestamp(event.timestamp)}</dd>
          <dt>Block</dt>
          <dd className="mono">{event.blockNumber?.toString() ?? '—'}</dd>
          <dt>Transaction hash</dt>
          <dd className="mono breakable">
            {event.hash ? (
              event.provenance === 'ONCHAIN' ? (
                <a href={explorerTxUrl(event.hash)} target="_blank" rel="noreferrer noopener">
                  {event.hash}
                </a>
              ) : (
                <>
                  {event.hash} <span className="tiny muted">(fixture, not on chain)</span>
                </>
              )
            ) : (
              'not yet known'
            )}
          </dd>
          <dt>Source</dt>
          <dd>
            <ProvenanceMark provenance={event.provenance} />
          </dd>
          <dt>Decoded action</dt>
          <dd className="prose">{event.decodedSummary}</dd>
        </dl>
      </section>

      <section className="card stack" aria-label="Risk reasons">
        <div className="card__head">
          <h2>Why this verdict</h2>
          <span className="prov">{assessment.policyVersion}</span>
        </div>
        <ul className="stack" style={{ margin: 0, paddingLeft: 16, gap: 4 }}>
          {assessment.reasons.map((reason) => (
            <li key={reason} className="prose">
              {reason}
            </li>
          ))}
        </ul>
      </section>

      <PolicyChecklist checks={assessment.checks} />

      {!canPropose ? (
        <Notice tone="danger" title="No action can be prepared from this event.">
          Policy returned {assessment.verdict.toLowerCase().replace(/_/g, ' ')}, so the approval flow
          is not reachable for it. This is enforced in code, not in the interface.
        </Notice>
      ) : null}

      <div className="row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => navigate({ name: 'analysis', id: event.id })}
        >
          Run agent analysis
        </button>
        <button
          type="button"
          className="btn"
          disabled={!canPropose}
          onClick={() => navigate({ name: 'approve', id: event.id })}
        >
          Prepare action for approval
        </button>
        <a className="btn" href={hrefFor({ name: 'overview' })}>
          Back to overview
        </a>
      </div>

      {demoActive ? (
        <p className="tiny muted">
          Demo Mode: this record is a deterministic fixture, not a transaction read from the chain.
        </p>
      ) : null}
    </div>
  );
}
