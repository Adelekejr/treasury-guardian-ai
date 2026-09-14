/**
 * Dense event readout. Data is monospace with tabular figures, and prose
 * columns opt out of that. Provenance sits on every row. Below 720px the same
 * records render as cards so the screen stays usable on a phone.
 */
import type { RiskAssessment, TransactionEvent } from '../types';
import { SUPPORTED_CHAIN_ID, describeChainId } from '../config/network';
import { formatEth, formatTimestamp } from '../lib/format';
import { shortenAddress } from '../lib/address';
import { demoLabelFor } from '../data/demo.accounts';
import { ProvenanceMark, RiskBadge, RiskIcon } from './Badges';
import { EmptyState } from './Skeleton';

function ForeignChainNote({ chainId }: { chainId: number }): React.JSX.Element | null {
  if (chainId === SUPPORTED_CHAIN_ID) return null;
  return (
    <div className="tiny" style={{ color: 'var(--danger)' }}>
      chain {chainId} · {describeChainId(chainId)}
    </div>
  );
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
              <th scope="col" style={{ textAlign: 'right' }}>
                Value (ETH)
              </th>
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
                  <td className="cell-num dim">{formatTimestamp(event.timestamp).replace(' UTC', '')}</td>
                  <td>
                    <span title={event.to ?? 'missing recipient'}>{shortenAddress(event.to)}</span>
                    {label ? <div className="tiny dim prose">{label}</div> : null}
                    <ForeignChainNote chainId={event.chainId} />
                  </td>
                  <td className="cell-num" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatEth(event.valueWei)}
                  </td>
                  <td>{event.method ?? <span className="dim">missing</span>}</td>
                  <td>
                    <ProvenanceMark provenance={event.provenance} />
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
                <span className="record__amount">
                  {formatEth(event.valueWei)} <span className="tiny dim">ETH</span>
                </span>
                {assessment ? <RiskBadge verdict={assessment.verdict} /> : null}
              </div>
              <dl className="record__grid">
                <dt>To</dt>
                <dd>
                  {shortenAddress(event.to)}
                  {label ? <span className="tiny dim prose"> · {label}</span> : null}
                  <ForeignChainNote chainId={event.chainId} />
                </dd>
                <dt>Method</dt>
                <dd>{event.method ?? 'missing'}</dd>
                <dt>Time</dt>
                <dd className="dim">{formatTimestamp(event.timestamp).replace(' UTC', '')}</dd>
              </dl>
              <div className="record__foot">
                <ProvenanceMark provenance={event.provenance} />
                <button type="button" className="linkish" onClick={() => onSelect(event.id)}>
                  Inspect
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export { RiskIcon };
