/**
 * Header: one compact row — mark, name, network badge, wallet.
 *
 * The tab strip lives under the header on wide screens and becomes a bottom
 * nav below 820px, so the header never eats the mobile viewport.
 */
import { shortenAddress } from '../lib/address';
import { hrefFor, type Route } from '../state/router';
import { useApp } from '../state/useApp';
import { NetworkBadge } from './Badges';
import { IconHistory, IconOverview, IconSettings, IconWallet } from './Icons';

interface NavItem {
  readonly label: string;
  readonly short: string;
  readonly route: Route;
  readonly icon: (props: { size?: number }) => React.JSX.Element;
}

const NAV: readonly NavItem[] = [
  { label: 'Treasury overview', short: 'Treasury', route: { name: 'overview' }, icon: IconOverview },
  { label: 'Activity history', short: 'History', route: { name: 'history' }, icon: IconHistory },
  { label: 'Settings and about', short: 'Settings', route: { name: 'settings' }, icon: IconSettings },
];

/** Routes that are reached from a list rather than from the nav. */
const PARENT_OF: Partial<Record<Route['name'], Route['name']>> = {
  event: 'overview',
  analysis: 'overview',
  approve: 'overview',
};

function isCurrent(item: NavItem, route: Route): boolean {
  return route.name === item.route.name || PARENT_OF[route.name] === item.route.name;
}

export function TopBar({ route }: { route: Route }): React.JSX.Element {
  const { wallet, connect, network } = useApp();
  const wrongNetwork = network?.state === 'WRONG_NETWORK';

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__mark">TG</span>
            <span>Treasury Guardian</span>
          </div>

          <div className="topbar__right">
            <NetworkBadge />
            {wallet.address ? (
              <span
                className="chip chip--unknown mono"
                title={`${wallet.address}${wrongNetwork ? ' — wrong network' : ''}`}
              >
                {shortenAddress(wallet.address, 4, 4)}
              </span>
            ) : (
              <button
                type="button"
                className="btn btn--sm btn--wallet"
                onClick={() => void connect()}
                disabled={wallet.connecting}
                aria-label={wallet.connecting ? 'Connecting wallet' : 'Connect wallet'}
                title={wallet.connecting ? 'Connecting…' : 'Connect wallet'}
              >
                <IconWallet size={15} />
                <span className="btn__label">{wallet.connecting ? 'Connecting…' : 'Connect wallet'}</span>
              </button>
            )}
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.label}
              className="nav__item"
              href={hrefFor(item.route)}
              aria-current={isCurrent(item, route) ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <nav className="bottomnav" aria-label="Primary">
        <div className="bottomnav__inner">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                className="bottomnav__item"
                href={hrefFor(item.route)}
                aria-current={isCurrent(item, route) ? 'page' : undefined}
              >
                <Icon size={18} />
                {item.short}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
