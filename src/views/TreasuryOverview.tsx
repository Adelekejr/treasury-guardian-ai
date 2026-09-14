/**
 * Screen 1 — Treasury overview.
 * Balance and risk sit directly under one status line, so the instrument
 * reading is the first thing on screen at any width.
 */
import { ARBITRUM_SEPOLIA } from '../config/network';
import { formatEth, formatEthWithUnit, formatTimestamp } from '../lib/format';
import { shortenAddress } from '../lib/address';
import { verdictLabel } from '../services/policy/rules';
import type { RiskVerdict } from '../types';
import { EventTable } from '../components/EventTable';
import { ProvenanceMark, RiskIcon } from '../components/Badges';
import { SkeletonCard } from '../components/Skeleton';
import { StatusStrip } from '../components/StatusStrip';
import { useApp } from '../state/useApp';
import { hrefFor, type Route } from '../state/router';

const ORDER: readonly RiskVerdict[] = ['BLOCKED', 'REVIEW_REQUIRED', 'INSUFFICIENT_DATA', 'LOW_RISK'];

const COUNT_COLOUR: Record<RiskVerdict, string> = {
  BLOCKED: 'var(--danger)',
  REVIEW_REQUIRED: 'var(--warning)',
  INSUFFICIENT_DATA: 'var(--muted)',
  LOW_RISK: 'var(--lime)',
};

export function TreasuryOverview({ navigate }: { navigate: (route: Route) => void }): React.JSX.Element {
  const { snapshot, events, assessments, loading, network, policy, demoActive } = useApp();

  const counts = ORDER.map((verdict) => ({
    verdict,
    count: [...assessments.values()].filter((assessment) => assessment.verdict === verdict).length,
  }));

  const needsAttention = events.filter((event) => {
    const verdict = assessments.get(event.id)?.verdict;
    return verdict === 'BLOCKED' || verdict === 'REVIEW_REQUIRED';
  });

  return (
    <>
      <StatusStrip />

      <div className="section">
        <div className="row row--between">
          <h1>Treasury overview</h1>
          <span className="prov">
            {formatTimestamp(network?.checkedAt ?? null).replace(' UTC', '')}
          </span>
        </div>

        {loading && !snapshot ? (
          <div className="grid">
            <SkeletonCard label="Loading treasury balance" />
            <SkeletonCard label="Loading risk summary" />
            <SkeletonCard label="Loading network status" />
          </div>
        ) : (
          <div className="grid">
            <section className="card card--raised stack stack--tight" aria-label="Treasury balance">
              <div className="row row--between">
                <span className="metric__label">Treasury balance</span>
                {snapshot ? <ProvenanceMark provenance={snapshot.provenance} /> : null}
              </div>
              <p className="metric__value">
                {formatEth(snapshot?.balanceWei ?? null, 5)} <span className="tiny dim">ETH</span>
              </p>
              <p className="metric__hint mono" title={snapshot?.treasuryAddress ?? ''}>
                {shortenAddress(snapshot?.treasuryAddress ?? null)}
              </p>
              <p className="metric__hint mono dim">
                at block {snapshot?.blockNumber?.toString() ?? '—'}
              </p>
            </section>

            <section className="card stack stack--tight" aria-label="Risk summary">
              <span className="metric__label">Risk summary</span>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {counts.map(({ verdict, count }) => (
                  <li
                    key={verdict}
                    className="row row--between"
                    style={{ padding: '3px 0', flexWrap: 'nowrap' }}
                  >
                    <span
                      className="row row--tight"
                      style={{ flexWrap: 'nowrap', color: COUNT_COLOUR[verdict], fontSize: 12.5 }}
                    >
                      <RiskIcon verdict={verdict} size={13} />
                      <span style={{ color: 'var(--ink)' }}>{verdictLabel(verdict)}</span>
                    </span>
                    <span className="mono" style={{ fontWeight: 700, color: COUNT_COLOUR[verdict] }}>
                      {String(count).padStart(2, '0')}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="metric__hint">{events.length} events analysed this session</p>
            </section>

            <section className="card stack stack--tight" aria-label="Network status">
              <div className="row row--between">
                <span className="metric__label">Network</span>
                {network ? <ProvenanceMark provenance={network.provenance} /> : null}
              </div>
              <dl className="kv kv--tight">
                <dt>Chain</dt>
                <dd>{ARBITRUM_SEPOLIA.id}</dd>
                <dt>Block</dt>
                <dd>{network?.blockNumber?.toString() ?? '—'}</dd>
                <dt>State</dt>
                <dd>{network?.state.toLowerCase().replace(/_/g, ' ') ?? 'checking'}</dd>
                <dt>Settles to</dt>
                <dd className="prose">{ARBITRUM_SEPOLIA.settlesTo}</dd>
              </dl>
            </section>

            <section className="card stack stack--tight" aria-label="Policy status">
              <span className="metric__label">Policy status</span>
              <dl className="kv kv--tight">
                <dt>Limit</dt>
                <dd>{formatEthWithUnit(policy.maxTransferWei)}</dd>
                <dt>Recipients</dt>
                <dd>{policy.allowedRecipients.length} allowlisted</dd>
                <dt>Methods</dt>
                <dd>{policy.allowedMethods.join(' ')}</dd>
                <dt>Version</dt>
                <dd>{policy.version}</dd>
              </dl>
              <p className="metric__hint">Rules run before any AI call and cannot be changed by a model.</p>
            </section>
          </div>
        )}
      </div>

      <section className="section" aria-label="Needs attention">
        <div className="section__head">
          <h2>Needs attention</h2>
          <span className="prov">
            {needsAttention.length}/{events.length}
          </span>
        </div>
        <EventTable
          events={needsAttention}
          assessments={assessments}
          onSelect={(id) => navigate({ name: 'event', id })}
          caption="Events the deterministic policy flagged as blocked or needing review."
        />
      </section>

      <section className="section" aria-label="Recent activity">
        <div className="section__head">
          <h2>Recent activity</h2>
          <a className="linkish" href={hrefFor({ name: 'history' })}>
            Full history
          </a>
        </div>
        <EventTable
          events={events}
          assessments={assessments}
          onSelect={(id) => navigate({ name: 'event', id })}
          caption={`All events read this session${demoActive ? ' from deterministic fixtures' : ''}.`}
        />
      </section>
    </>
  );
}
