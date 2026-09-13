/**
 * Small labelling components.
 *
 * Every risk signal carries a text label AND a monospace glyph as well as its
 * colour, so the screens stay readable in greyscale.
 */
import type { Provenance, RiskVerdict } from '../types';
import { ARBITRUM_SEPOLIA } from '../config/network';
import { verdictGlyph, verdictLabel } from '../services/policy/rules';

export function NetworkBadge(): React.JSX.Element {
  return (
    <span className="badge badge--network" title={`Chain id ${ARBITRUM_SEPOLIA.id}`}>
      <span className="badge__glyph" aria-hidden="true">
        ◆
      </span>
      ARBITRUM SEPOLIA
    </span>
  );
}

export function ProvenanceBadge({ provenance }: { provenance: Provenance }): React.JSX.Element {
  const demo = provenance === 'DEMO_FIXTURE';
  return (
    <span
      className={`badge ${demo ? 'badge--demo' : 'badge--onchain'}`}
      title={demo ? 'Deterministic demo fixture — not read from the chain' : 'Read from Arbitrum Sepolia'}
    >
      <span className="badge__glyph" aria-hidden="true">
        {demo ? '⌗' : '⛓'}
      </span>
      {demo ? 'Demo fixture' : 'On-chain'}
    </span>
  );
}

const VERDICT_CLASS: Record<RiskVerdict, string> = {
  LOW_RISK: 'badge--low',
  REVIEW_REQUIRED: 'badge--review',
  BLOCKED: 'badge--blocked',
  INSUFFICIENT_DATA: 'badge--unknown',
};

export function RiskBadge({ verdict }: { verdict: RiskVerdict }): React.JSX.Element {
  return (
    <span className={`badge ${VERDICT_CLASS[verdict]}`}>
      <span className="badge__glyph" aria-hidden="true">
        {verdictGlyph(verdict)}
      </span>
      {verdictLabel(verdict)}
    </span>
  );
}

export function DemoModeBadge(): React.JSX.Element {
  return (
    <span className="badge badge--demo" title="Demo Mode is active — no RPC calls, no funds can move">
      <span className="badge__glyph" aria-hidden="true">
        ⌗
      </span>
      Demo Mode
    </span>
  );
}
