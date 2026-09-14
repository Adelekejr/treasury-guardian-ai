/** Screen 5. Activity history: a searchable list of analysed events and outcomes. */
import { useMemo, useState } from 'react';
import { formatEthWithUnit, formatTimestamp } from '../lib/format';
import { shortenAddress } from '../lib/address';
import { verdictLabel } from '../services/policy/rules';
import type { RiskVerdict } from '../types';
import { ProvenanceMark, RiskBadge } from '../components/Badges';
import { EmptyState } from '../components/Skeleton';
import { StatusStrip } from '../components/StatusStrip';
import { useApp } from '../state/useApp';
import type { Route } from '../state/router';

const FILTERS: readonly (RiskVerdict | 'ALL')[] = [
  'ALL',
  'BLOCKED',
  'REVIEW_REQUIRED',
  'INSUFFICIENT_DATA',
  'LOW_RISK',
];

export function ActivityHistory({ navigate }: { navigate: (route: Route) => void }): React.JSX.Element {
  const { events, assessments, runs, approvals } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RiskVerdict | 'ALL'>('ALL');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events
      .map((event) => ({
        event,
        assessment: assessments.get(event.id),
        run: runs[event.id],
        approval: approvals[event.id],
      }))
      .filter((row) => {
        if (!row.assessment) return false;
        if (filter !== 'ALL' && row.assessment.verdict !== filter) return false;
        if (!needle) return true;
        return [
          row.event.id,
          row.event.to ?? '',
          row.event.from ?? '',
          row.event.method ?? '',
          row.event.hash ?? '',
          row.event.decodedSummary,
          row.assessment.verdict,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      });
  }, [approvals, assessments, events, filter, query, runs]);

  return (
    <div className="stack stack--lg">
      <StatusStrip />

      <div>
        <h1>Activity history</h1>
        <p className="muted small">
          Every event analysed in this session, the deterministic outcome, and any decision recorded
          against it.
        </p>
      </div>

      <div className="card stack">
        <div className="field">
          <label className="field__label" htmlFor="history-search">
            Search by address, method, hash or summary
          </label>
          <input
            id="history-search"
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="0x… or transferNative"
          />
        </div>
        <div className="row" role="group" aria-label="Filter by verdict">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              className="nav__item"
              aria-pressed={filter === option}
              style={filter === option ? { borderColor: 'var(--lime)' } : undefined}
              onClick={() => setFilter(option)}
            >
              {option === 'ALL' ? 'All' : verdictLabel(option)}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No matching activity"
          detail="Adjust the search or the filter. Analysed events appear here as soon as they are read."
        />
      ) : (
        <div className="table-wrap table-wrap--responsive">
          <table className="audit">
            <caption>{rows.length} analysed events. Source is shown for every row.</caption>
            <thead>
              <tr>
                <th scope="col">Risk</th>
                <th scope="col">Time (UTC)</th>
                <th scope="col">Recipient</th>
                <th scope="col">Value</th>
                <th scope="col">AI advisory</th>
                <th scope="col">Outcome</th>
                <th scope="col">Source</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, assessment, run, approval }) => (
                <tr key={event.id}>
                  <td>{assessment ? <RiskBadge verdict={assessment.verdict} /> : '—'}</td>
                  <td className="cell-num">{formatTimestamp(event.timestamp)}</td>
                  <td title={event.to ?? ''}>
                    {shortenAddress(event.to)}
                  </td>
                  <td className="cell-num">{formatEthWithUnit(event.valueWei)}</td>
                  <td className="small prose">
                    {run?.ai.status === 'READY'
                      ? run.ai.explanation?.recommendation.replace(/_/g, ' ').toLowerCase()
                      : run
                        ? 'unavailable'
                        : 'not analysed'}
                  </td>
                  <td className="small prose">
                    {approval
                      ? `${approval.decision.toLowerCase()} · ${approval.status.replace(/_/g, ' ').toLowerCase()}`
                      : 'no decision'}
                  </td>
                  <td>
                    <ProvenanceMark provenance={event.provenance} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => navigate({ name: 'event', id: event.id })}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 ? (
        <ul className="record-list" aria-label="Analysed events">
          {rows.map(({ event, assessment, run, approval }) => (
            <li key={event.id} className="record">
              <div className="record__top">
                {assessment ? <RiskBadge verdict={assessment.verdict} /> : null}
                <ProvenanceMark provenance={event.provenance} />
              </div>
              <dl className="record__grid">
                <dt>Value</dt>
                <dd>{formatEthWithUnit(event.valueWei)}</dd>
                <dt>To</dt>
                <dd className="mono">{shortenAddress(event.to)}</dd>
                <dt>Time</dt>
                <dd className="mono tiny">{formatTimestamp(event.timestamp)}</dd>
                <dt>AI advisory</dt>
                <dd>
                  {run?.ai.status === 'READY'
                    ? run.ai.explanation?.recommendation.replace(/_/g, ' ').toLowerCase()
                    : run
                      ? 'unavailable'
                      : 'not analysed'}
                </dd>
                <dt>Outcome</dt>
                <dd>
                  {approval
                    ? `${approval.decision.toLowerCase()} · ${approval.status.replace(/_/g, ' ').toLowerCase()}`
                    : 'no decision'}
                </dd>
              </dl>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => navigate({ name: 'event', id: event.id })}
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
