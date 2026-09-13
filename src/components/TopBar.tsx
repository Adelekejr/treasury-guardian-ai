/** Header: identity, the always-visible network badge, nav and wallet state. */
import { shortenAddress } from '../lib/address';
import { hrefFor, type Route } from '../state/router';
import { useApp } from '../state/useApp';
import { DemoModeBadge, NetworkBadge } from './Badges';

const NAV: readonly { readonly label: string; readonly route: Route }[] = [
  { label: 'Treasury overview', route: { name: 'overview' } },
  { label: 'Activity history', route: { name: 'history' } },
  { label: 'Settings and about', route: { name: 'settings' } },
];

export function TopBar({ route }: { route: Route }): React.JSX.Element {
  const { demoActive, wallet, connect, network } = useApp();
  const wrongNetwork = network?.state === 'WRONG_NETWORK';

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="row row--between">
          <div className="brand">
            <span aria-hidden="true" className="mono">
              [TG]
            </span>
            <span>Treasury Guardian AI</span>
          </div>
          <div className="row">
            <NetworkBadge />
            {demoActive ? <DemoModeBadge /> : null}
          </div>
        </div>

        <div className="row row--between">
          <nav className="nav" aria-label="Primary">
            {NAV.map((item) => (
              <a
                key={item.label}
                className="nav__item"
                href={hrefFor(item.route)}
                aria-current={route.name === item.route.name ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {wallet.address ? (
            <span className="badge badge--onchain mono" title={wallet.address}>
              {shortenAddress(wallet.address)}
              {wrongNetwork ? ' · wrong network' : ''}
            </span>
          ) : (
            <button type="button" className="btn btn--sm" onClick={() => void connect()} disabled={wallet.connecting}>
              {wallet.connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
