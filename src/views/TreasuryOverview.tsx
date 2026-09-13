/**
 * Screen 1 — Treasury overview.
 * Readable in five seconds: what chain, what balance, what needs attention.
 */
import { ARBITRUM_SEPOLIA } from '../config/network';
import { formatEthWithUnit, formatTimestamp } from '../lib/format';
import { shortenAddress } from '../lib/address';
import { verdictLabel } from '../services/policy/rules';
import type { RiskVerdict } from '../types';
import { EventTable } from '../components/EventTable';
import { ProvenanceBadge, RiskBadge } from '../components/Badges';
import { SkeletonCard } from '../components/Skeleton';
import { StateBanners } from '../components/StateBanners';
import { useApp } from '../state/useApp';
import { hrefFor, type Route } from '../state/router';

const ORDER: readonly RiskVerdict[] = ['BLOCKED', 'REVIEW_REQUIRED', 'INSUFFICIENT_DATA', 'LOW_RISK'];

export function TreasuryOverview({ navigate }: { navigate: (route: Route) => void }): React.JSX.Element {
  const { snapshot, events, assessments, loading, network, policy, demoActive, adapterLabel } = useApp();

  const counts = ORDER.map((verdict) => ({
    verdict,
    count: [...assessments.values()].filter((assessment) => assessment.verdict === verdict).length,
  }));

  const needsAttention = events.filter((event) => {
    const verdict = assessments.get(event.id)?.verdict;
    return verdict === 'BLOCKED' || verdict === 'REVIEW_REQUIRED';
  });

  return (
    <div className="stack stack--lg">
      <StateBanners />

      <div className="row row--between">
        <div>
          <h1>Treasury overview</h1>
          <p className="muted small">
            Monitoring one {ARBITRUM_SEPOLIA.name} treasury. Policy decisions are deterministic and
            enforced in code; the AI only explains them.
          </p>
        </div>
        <a className="btn btn--sm" href={hrefFor({ name: 'history' })}>
          Activity history
        </a>
      </div>

      {loading && !snapshot ? (
        <div className="grid">
          <SkeletonCard label="Loading network status" />
          <SkeletonCard label="Loading treasury balance" />
          <SkeletonCard label="Loading risk summary" />
        </div>
      ) : (
        <div className="grid">
          <section className="card stack" aria-label="Network status">
            <div className="card__head">
              <span className="metric__label">Network</span>
              {network ? <ProvenanceBadge provenance={network.provenance} /> : null}
            </div>
            <p className="metric__value">{ARBITRUM_SEPOLIA.name}</p>
            <p className="metric__hint">
              Chain {ARBITRUM_SEPOLIA.id} · block {network?.blockNumber?.toString() ?? '—'} ·{' '}
              {network?.state.toLowerCase().replace(/_/g, ' ') ?? 'checking'}
            </p>
            <p className="tiny muted">{adapterLabel}</p>
          </section>

          <section className="card stack" aria-label="Treasury balance">
            <div className="card__head">
              <span className="metric__label">Treasury balance</span>
              {snapshot ? <ProvenanceBadge provenance={snapshot.provenance} /> : null}
            </div>
            <p className="metric__value">{formatEthWithUnit(snapshot?.balanceWei ?? null, 5)}</p>
            <p className="metric__hint mono" title={snapshot?.treasuryAddress ?? ''}>
              {shortenAddress(snapshot?.treasuryAddress ?? null)}
            </p>
            <p className="tiny muted">Testnet ETH only. This app never touches real funds.</p>
          </section>

          <section className="card stack" aria-label="Risk summary">
            <span className="metric__label">Risk summary</span>
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }}>
              {counts.map(({ verdict, count }) => (
                <li key={verdict} className="row row--between">
                  <RiskBadge verdict={verdict} />
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {count}
                  </span>
                </li>
              ))}
            </ul>
            <p className="tiny muted">{events.length} events analysed this session.</p>
          </section>

          <section className="card stack" aria-label="Policy status">
            <span className="metric__label">Policy status</span>
            <dl className="kv">
              <dt>Transfer limit</dt>
              <dd>{formatEthWithUnit(policy.maxTransferWei)}</dd>
              <dt>Allowlisted recipients</dt>
              <dd>{policy.allowedRecipients.length}</dd>
              <dt>Allowed methods</dt>
              <dd>{policy.allowedMethods.join(' · ')}</dd>
              <dt>Policy version</dt>
              <dd className="mono">{policy.version}</dd>
            </dl>
            <p className="tiny muted">
              Every rule runs before any AI call and cannot be changed by a model response.
            </p>
          </section>
        </div>
      )}

      <section className="stack" aria-label="Needs attention">
        <div className="row row--between">
          <h2>Needs attention</h2>
          <span className="small muted">
            {needsAttention.length} of {events.length} events
          </span>
        </div>
        <EventTable
          events={needsAttention}
          assessments={assessments}
          onSelect={(id) => navigate({ name: 'event', id })}
          caption="Events the deterministic policy flagged as blocked or needing review."
        />
      </section>

      <section className="stack" aria-label="Recent activity">
        <h2>Recent activity</h2>
        <EventTable
          events={events}
          assessments={assessments}
          onSelect={(id) => navigate({ name: 'event', id })}
          caption={`All events read this session${demoActive ? ' from deterministic fixtures' : ''}. Last check ${formatTimestamp(network?.checkedAt ?? null)}.`}
        />
      </section>

      <p className="tiny muted">
        Verdict vocabulary: {ORDER.map((verdict) => verdictLabel(verdict)).join(' · ')}.
      </p>
    </div>
  );
}
