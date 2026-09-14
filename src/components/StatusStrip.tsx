/**
 * One compact status line instead of stacked banners, so the treasury data is
 * the first thing on screen. Each condition gets a chip. Tapping the line
 * expands the full explanation and any action it offers.
 */
import { useState } from 'react';
import { ARBITRUM_SEPOLIA } from '../config/network';
import { useApp } from '../state/useApp';
import { IconBlocked, IconChevron, IconInfo, IconReview, IconWallet } from './Icons';

type Tone = 'warn' | 'danger' | 'muted';

interface StatusItem {
  readonly id: string;
  readonly tone: Tone;
  readonly chip: string;
  readonly title: string;
  readonly detail: string;
  readonly icon: React.JSX.Element;
  /** `short` is the label used for the inline button on the status line. */
  readonly action?: { readonly label: string; readonly short: string; readonly run: () => void };
}

const CHIP_CLASS: Record<Tone, string> = {
  warn: 'chip--review',
  danger: 'chip--blocked',
  muted: 'chip--unknown',
};

export function StatusStrip(): React.JSX.Element | null {
  const {
    demoActive,
    demoReason,
    network,
    wallet,
    contractAvailable,
    contractReason,
    chainError,
    switchNetwork,
    connect,
  } = useApp();
  const [open, setOpen] = useState(false);

  const items: StatusItem[] = [];

  if (demoActive) {
    items.push({
      id: 'demo',
      tone: 'warn',
      chip: 'Demo Mode',
      title: 'Demo Mode is active. Every figure on screen is a fixture.',
      detail: `${demoReason ?? ''} No RPC call is made, no transaction is broadcast, and no funds can move.`,
      icon: <IconReview size={13} />,
    });
  }

  if (network?.state === 'WRONG_NETWORK') {
    items.push({
      id: 'wrong-network',
      tone: 'danger',
      chip: 'Wrong network',
      title: `This app only operates on ${ARBITRUM_SEPOLIA.name}.`,
      detail: `${network.message} Chain ${ARBITRUM_SEPOLIA.id} is the only supported target; nothing can be prepared or approved from another chain.`,
      icon: <IconBlocked size={13} />,
      action: {
        label: `Switch to ${ARBITRUM_SEPOLIA.name}`,
        short: 'Switch network',
        run: () => void switchNetwork(),
      },
    });
  }

  if (network?.state === 'RPC_UNREACHABLE') {
    items.push({
      id: 'rpc',
      tone: 'danger',
      chip: 'RPC outage',
      title: 'The RPC endpoint is unreachable.',
      detail: `${network.message} ${chainError ?? ''}`,
      icon: <IconBlocked size={13} />,
    });
  }

  if (!wallet.address && network?.state !== 'WRONG_NETWORK') {
    items.push({
      id: 'wallet',
      tone: 'muted',
      chip: 'No wallet',
      title: 'Wallet not connected. Monitoring only.',
      detail: `${
        wallet.available
          ? 'Connect a wallet to prepare or approve a testnet action. Reading does not need one.'
          : 'No browser wallet was detected. You can still read everything on this screen.'
      }${wallet.error ? ` ${wallet.error}` : ''}`,
      icon: <IconWallet size={13} />,
      action: { label: 'Choose a wallet', short: 'Connect', run: () => void connect() },
    });
  }

  if (!contractAvailable) {
    items.push({
      id: 'contract',
      tone: 'warn',
      chip: 'No contract',
      title: 'Guardian contract unavailable.',
      detail: `${contractReason ?? 'No contract address is configured.'} Monitoring and analysis still work; approval cannot be submitted on chain.`,
      icon: <IconInfo size={13} />,
    });
  }

  if (items.length === 0) return null;

  // The most severe item's action is reachable without expanding anything.
  const primaryAction = items.find((item) => item.action)?.action ?? null;

  return (
    <div className="statusline">
      <div className="statusline__row">
        <button
          type="button"
          className="statusline__toggle"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className="statusline__chips">
            {items.map((item) => (
              <span key={item.id} className={`chip ${CHIP_CLASS[item.tone]}`}>
                {item.icon}
                {item.chip}
              </span>
            ))}
          </span>
          <span className="statusline__more">
            {open ? 'Hide' : 'Details'}
            <IconChevron size={12} />
          </span>
        </button>
        {primaryAction ? (
          <button type="button" className="btn btn--sm" onClick={primaryAction.run}>
            {primaryAction.short}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="statusline__detail">
          {items.map((item) => (
            <div key={item.id} className="statusline__item">
              <strong>{item.title}</strong>
              <span className="muted small">{item.detail}</span>
              {item.action ? (
                <span>
                  <button type="button" className="btn btn--sm" onClick={item.action.run}>
                    {item.action.label}
                  </button>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
