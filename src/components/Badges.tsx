/**
 * Status marks.
 *
 * Risk carries an icon with its own silhouette, the word, and a colour, so it
 * survives greyscale. Provenance is a fact about where data came from rather
 * than a warning, so it renders as quiet monospace text with a small dot.
 */
import type { Provenance, RiskVerdict } from '../types';
import { ARBITRUM_SEPOLIA } from '../config/network';
import { verdictLabel } from '../services/policy/rules';
import { IconBlocked, IconLow, IconReview, IconUnknown, type IconProps } from './Icons';

export function NetworkBadge(): React.JSX.Element {
  return (
    <span className="chip chip--network" title={`Chain id ${ARBITRUM_SEPOLIA.id}`}>
      ARBITRUM SEPOLIA
    </span>
  );
}

const VERDICT_ICON: Record<RiskVerdict, (props: IconProps) => React.JSX.Element> = {
  LOW_RISK: IconLow,
  REVIEW_REQUIRED: IconReview,
  BLOCKED: IconBlocked,
  INSUFFICIENT_DATA: IconUnknown,
};

const VERDICT_CLASS: Record<RiskVerdict, string> = {
  LOW_RISK: 'chip--low',
  REVIEW_REQUIRED: 'chip--review',
  BLOCKED: 'chip--blocked',
  INSUFFICIENT_DATA: 'chip--unknown',
};

export function RiskIcon({ verdict, size = 14 }: { verdict: RiskVerdict; size?: number }): React.JSX.Element {
  const Icon = VERDICT_ICON[verdict];
  return <Icon size={size} />;
}

export function RiskBadge({ verdict }: { verdict: RiskVerdict }): React.JSX.Element {
  return (
    <span className={`chip ${VERDICT_CLASS[verdict]}`}>
      <RiskIcon verdict={verdict} />
      {verdictLabel(verdict)}
    </span>
  );
}

/**
 * Provenance, rendered quietly on every event. `compact` drops the word and
 * keeps the dot plus a tooltip.
 */
export function ProvenanceMark({
  provenance,
  compact = false,
}: {
  provenance: Provenance;
  compact?: boolean;
}): React.JSX.Element {
  const demo = provenance === 'DEMO_FIXTURE';
  const title = demo
    ? 'Demo fixture. Deterministic sample data, not read from the chain'
    : 'Read from Arbitrum Sepolia';
  return (
    <span className="prov" title={title}>
      <span className={`prov__dot ${demo ? 'prov__dot--demo' : 'prov__dot--onchain'}`} />
      {compact ? <span className="sr-only">{demo ? 'demo fixture' : 'on-chain'}</span> : demo ? 'demo' : 'on-chain'}
    </span>
  );
}
