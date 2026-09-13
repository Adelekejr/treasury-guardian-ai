/**
 * Audit-friendly event list. Provenance is rendered on every single row.
 *
 * Wide screens get the table; below 720px the same records render as cards, so
 * the screen stays usable on a phone instead of scrolling sideways.
 */
import type { RiskAssessment, TransactionEvent } from '../types';
import { SUPPORTED_CHAIN_ID, describeChainId } from '../config/network';
import { formatEthWithUnit, formatTimestamp } from '../lib/format';
import { shortenAddress } from '../lib/address';
import { demoLabelFor } from '../data/demo.accounts';
import { ProvenanceBadge, RiskBadge } from './Badges';
import { EmptyState } from './Skeleton';

function ForeignChainNote({ chainId }: { chainId: number }): React.JSX.Element | null {
  if (chainId === SUPPORTED_CHAIN_ID) return null;
  return <div className="tiny" style={{ color: 'var(--danger)' }}>on {describeChainId(chainId)}</div>;
}

export function EventTable({
  events,
  assessments,
  onSelect,
  caption,
}: {
  events: readonly TransactionEvent[];
  assessments: ReadonlyMap<string, RiskAssessment>;
  onSelect: (eventId: string) => void;
  caption: string;
}): React.JSX.Element {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No transactions to show"
        detail="Nothing has been read for this treasury yet. The poller will add rows as they appear."
      />
    );
  }

  return (
    <>
      <div className="table-wrap table-wrap--responsive">
        <table className="audit">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Risk</th>
              <th scope="col">Time (UTC)</th>
              <th scope="col">Recipient</th>
              <th scope="col">Value</th>
              <th scope="col">Method</th>
              <th scope="col">Source</th>
              <th scope="col">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const assessment = assessments.get(event.id);
              const label = demoLabelFor(event.to);
              return (
                <tr key={event.id} data-selectable="true">
                  <td>{assessment ? <RiskBadge verdict={assessment.verdict} /> : '—'}</td>
                  <td className="cell-num">{formatTimestamp(event.timestamp)}</td>
                  <td>
                    <span className="mono" title={event.to ?? 'missing recipient'}>
                      {shortenAddress(event.to)}
                    </span>
                    {label ? <div className="tiny muted">{label}</div> : null}
                    <ForeignChainNote chainId={event.chainId} />
                  </td>
                  <td className="cell-num">{formatEthWithUnit(event.valueWei)}</td>
                  <td>{event.method ?? <span className="muted">missing</span>}</td>
                  <td>
                    <ProvenanceBadge provenance={event.provenance} />
                  </td>
                  <td>
                    <button type="button" className="linkish" onClick={() => onSelect(event.id)}>
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="record-list" aria-label={caption}>
        {events.map((event) => {
          const assessment = assessments.get(event.id);
          const label = demoLabelFor(event.to);
          return (
            <li key={event.id} className="record">
              <div className="record__top">
                {assessment ? <RiskBadge verdict={assessment.verdict} /> : null}
                <ProvenanceBadge provenance={event.provenance} />
              </div>
              <dl className="record__grid">
                <dt>Value</dt>
                <dd>{formatEthWithUnit(event.valueWei)}</dd>
                <dt>To</dt>
                <dd className="mono">
                  {shortenAddress(event.to)}
                  {label ? <div className="tiny muted">{label}</div> : null}
                  <ForeignChainNote chainId={event.chainId} />
                </dd>
                <dt>Method</dt>
                <dd>{event.method ?? 'missing'}</dd>
                <dt>Time</dt>
                <dd className="mono tiny">{formatTimestamp(event.timestamp)}</dd>
              </dl>
              <button type="button" className="btn btn--sm" onClick={() => onSelect(event.id)}>
                Inspect
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
