/**
 * Wallet selection modal.
 *
 * It opens on every Connect click and always has something to show. The three
 * catalogue wallets are listed every time. Installed ones are marked
 * "Detected" and connect on click, missing ones stay visible as "Not
 * installed" with a link to their official download page, and if no wallet is
 * present at all the modal says what to install. Errors coming back from a
 * wallet are shown here rather than swallowed.
 */
import { useEffect, useRef, useState } from 'react';
import { ARBITRUM_SEPOLIA } from '../config/network';
import { buildWalletOptions, type WalletOption } from '../services/wallet/catalog';
import type { Eip6963ProviderDetail } from '../services/wallet/eip6963';
import { IconCheck, IconInfo, IconWallet, IconX } from './Icons';

export interface WalletModalProps {
  readonly open: boolean;
  readonly detected: readonly Eip6963ProviderDetail[];
  readonly connectingId: string | null;
  readonly error: string | null;
  onSelect(option: WalletOption): void;
  onClose(): void;
}

function OptionIcon({ option }: { option: WalletOption }): React.JSX.Element {
  if (option.icon) {
    return <img className="wallet__icon" src={option.icon} alt="" width={28} height={28} />;
  }
  return (
    <span className="wallet__icon wallet__icon--monogram" aria-hidden="true">
      {option.monogram}
    </span>
  );
}

export function WalletModal({
  open,
  detected,
  connectingId,
  error,
  onSelect,
  onClose,
}: WalletModalProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<readonly WalletOption[]>([]);

  useEffect(() => {
    if (open) setOptions(buildWalletOptions(detected));
  }, [open, detected]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('button, a')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const anyDetected = options.some((option) => option.status === 'DETECTED');

  return (
    <div className="modal" role="presentation" onClick={onClose}>
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <h2 className="modal__title" id="wallet-modal-title">
              Connect a wallet
            </h2>
            <p className="modal__sub">
              {ARBITRUM_SEPOLIA.name} only · chain {ARBITRUM_SEPOLIA.id} · testnet
            </p>
          </div>
          <button type="button" className="btn btn--sm btn--icon" onClick={onClose} aria-label="Close">
            <IconX size={14} />
          </button>
        </div>

        {!anyDetected ? (
          <div className="notice notice--info" style={{ margin: '0 0 12px' }}>
            <span className="notice__glyph" style={{ color: 'var(--muted)' }}>
              <IconInfo size={15} />
            </span>
            <div>
              <p className="notice__title">No wallet detected in this browser.</p>
              <p className="small muted" style={{ marginTop: 4 }}>
                Nothing announced itself over EIP-6963 and there is no injected provider. Install
                one of the wallets below, then reopen this dialog. The app keeps working read-only
                in the meantime.
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="notice notice--danger" style={{ margin: '0 0 12px' }} role="alert">
            <span className="notice__glyph" style={{ color: 'var(--danger)' }}>
              <IconWallet size={15} />
            </span>
            <div>
              <p className="notice__title">That wallet did not connect.</p>
              <p className="small muted" style={{ marginTop: 4 }}>
                {error}
              </p>
            </div>
          </div>
        ) : null}

        <ul className="wallet-list">
          {options.map((option) => {
            const connecting = connectingId === option.id;

            if (option.status === 'DETECTED') {
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    className="wallet"
                    onClick={() => onSelect(option)}
                    disabled={connecting}
                  >
                    <OptionIcon option={option} />
                    <span className="wallet__body">
                      <span className="wallet__name">{option.name}</span>
                      <span className="wallet__note">{option.note}</span>
                    </span>
                    <span className="chip chip--low">
                      <IconCheck size={12} />
                      {connecting ? 'Connecting…' : 'Detected'}
                    </span>
                  </button>
                </li>
              );
            }

            if (option.status === 'PLACEHOLDER') {
              return (
                <li key={option.id}>
                  <div className="wallet wallet--inert" aria-disabled="true">
                    <OptionIcon option={option} />
                    <span className="wallet__body">
                      <span className="wallet__name">{option.name}</span>
                      <span className="wallet__note">{option.note}</span>
                    </span>
                    <span className="chip chip--unknown">Later</span>
                  </div>
                </li>
              );
            }

            return (
              <li key={option.id}>
                <a
                  className="wallet"
                  href={option.installUrl ?? '#'}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <OptionIcon option={option} />
                  <span className="wallet__body">
                    <span className="wallet__name">{option.name}</span>
                    <span className="wallet__note">{option.note}</span>
                  </span>
                  <span className="chip chip--unknown">Not installed ↗</span>
                </a>
              </li>
            );
          })}
        </ul>

        <p className="modal__foot">
          Wallets are discovered with EIP-6963, so each one is listed separately instead of fighting
          over <code>window.ethereum</code>. Connecting on any chain other than {ARBITRUM_SEPOLIA.id}{' '}
          leaves the app in its wrong-network state until you switch.
        </p>
      </div>
    </div>
  );
}
