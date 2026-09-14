/**
 * EIP-6963 wallet discovery.
 *
 * Multiple injected wallets overwrite each other on `window.ethereum`, so the
 * last one to load wins and the rest become unreachable. EIP-6963 fixes that:
 * the page dispatches `eip6963:requestProvider`, every wallet answers with its
 * own `eip6963:announceProvider` event, and each provider stays addressable
 * separately.
 *
 * `window.ethereum` is used only as a fallback when nothing announces itself.
 */
import type { Eip1193Provider } from '../../types/eip1193';

export interface Eip6963ProviderInfo {
  readonly uuid: string;
  readonly name: string;
  /** Data URI supplied by the wallet itself. */
  readonly icon: string;
  readonly rdns: string;
}

export interface Eip6963ProviderDetail {
  readonly info: Eip6963ProviderInfo;
  readonly provider: Eip1193Provider;
}

interface AnnounceEvent extends Event {
  readonly detail?: Eip6963ProviderDetail;
}

const detailsByKey = new Map<string, Eip6963ProviderDetail>();
const listeners = new Set<(details: readonly Eip6963ProviderDetail[]) => void>();
let listening = false;

function keyFor(detail: Eip6963ProviderDetail): string {
  return detail.info.rdns || detail.info.uuid || detail.info.name;
}

function isUsableDetail(value: unknown): value is Eip6963ProviderDetail {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Eip6963ProviderDetail;
  return (
    typeof candidate.info?.name === 'string' &&
    typeof candidate.provider?.request === 'function'
  );
}

function emit(): void {
  const snapshot = snapshotProviders();
  for (const listener of listeners) listener(snapshot);
}

function onAnnounce(event: Event): void {
  const detail = (event as AnnounceEvent).detail;
  if (!isUsableDetail(detail)) return;
  const key = keyFor(detail);
  if (detailsByKey.has(key)) return;
  detailsByKey.set(key, detail);
  emit();
}

function startListening(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);
}

/** Ask every installed wallet to announce itself. Safe to call repeatedly. */
export function requestProviders(): void {
  if (typeof window === 'undefined') return;
  startListening();
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

export function snapshotProviders(): readonly Eip6963ProviderDetail[] {
  return [...detailsByKey.values()].sort((a, b) => a.info.name.localeCompare(b.info.name));
}

/** Subscribe to discovery. Returns an unsubscribe function. */
export function subscribeToProviders(
  listener: (details: readonly Eip6963ProviderDetail[]) => void,
): () => void {
  startListening();
  listeners.add(listener);
  listener(snapshotProviders());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The legacy path: one provider on `window.ethereum`, with no way to tell which
 * wallet it is beyond its own flags. Only used when EIP-6963 finds nothing.
 */
export function legacyInjectedProvider(): Eip6963ProviderDetail | null {
  if (typeof window === 'undefined') return null;
  const provider = window.ethereum;
  if (!provider || typeof provider.request !== 'function') return null;

  const flags = provider as unknown as Record<string, unknown>;
  const name = flags.isRabby
    ? 'Rabby'
    : flags.isBitKeep || flags.isBitget
      ? 'Bitget Wallet'
      : provider.isMetaMask
        ? 'MetaMask'
        : 'Injected wallet';

  return {
    info: { uuid: 'legacy-injected', name, icon: '', rdns: 'legacy.injected' },
    provider,
  };
}

/** Discovery result: announced providers, or the legacy one, or nothing. */
export function discoveredProviders(): readonly Eip6963ProviderDetail[] {
  const announced = snapshotProviders();
  if (announced.length > 0) return announced;
  const legacy = legacyInjectedProvider();
  return legacy ? [legacy] : [];
}

/** Test seam: drop everything discovered so far. */
export function resetDiscoveryForTests(): void {
  detailsByKey.clear();
}
