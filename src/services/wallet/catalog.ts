/**
 * The wallet catalogue.
 *
 * These wallets are listed whether or not they are installed, so the dialog
 * shows the same options every time it opens. A missing wallet is shown as
 * "Not installed" with a link to its official download page.
 *
 * Detected wallets render the icon the wallet announces over EIP-6963. The
 * ones that are not installed announce nothing, and this repository carries no
 * brand assets, so they get a neutral monogram tile instead of an
 * approximation of someone's trademark.
 */
import type { Eip6963ProviderDetail } from './eip6963';

export interface KnownWallet {
  readonly id: string;
  readonly name: string;
  /** Official download page. */
  readonly installUrl: string;
  /** rdns values the wallet is known to announce. */
  readonly rdns: readonly string[];
  /** Lowercase fragments matched against an announced name, as a fallback. */
  readonly nameMatches: readonly string[];
  readonly monogram: string;
}

export const KNOWN_WALLETS: readonly KnownWallet[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    installUrl: 'https://metamask.io/download/',
    rdns: ['io.metamask', 'io.metamask.flask', 'io.metamask.mmi'],
    nameMatches: ['metamask'],
    monogram: 'M',
  },
  {
    id: 'bitget',
    name: 'Bitget Wallet',
    installUrl: 'https://web3.bitget.com/en/wallet-download',
    rdns: ['com.bitget.web3', 'com.bitkeep.web3', 'com.bitget.wallet'],
    nameMatches: ['bitget', 'bitkeep'],
    monogram: 'B',
  },
  {
    id: 'rabby',
    name: 'Rabby',
    installUrl: 'https://rabby.io/',
    rdns: ['io.rabby'],
    nameMatches: ['rabby'],
    monogram: 'R',
  },
];

export type WalletOptionStatus = 'DETECTED' | 'NOT_INSTALLED' | 'PLACEHOLDER';

export interface WalletOption {
  readonly id: string;
  readonly name: string;
  readonly status: WalletOptionStatus;
  /** Announced icon (data URI) when detected; empty for the rest. */
  readonly icon: string;
  readonly monogram: string;
  readonly installUrl: string | null;
  readonly detail: Eip6963ProviderDetail | null;
  /** Shown under the name. Explains why the row looks the way it does. */
  readonly note: string;
}

function matches(known: KnownWallet, detail: Eip6963ProviderDetail): boolean {
  const rdns = detail.info.rdns?.toLowerCase() ?? '';
  if (known.rdns.some((candidate) => candidate.toLowerCase() === rdns)) return true;
  const name = detail.info.name.toLowerCase();
  return known.nameMatches.some((fragment) => name.includes(fragment));
}

/**
 * Build the list the modal renders. Catalogue wallets come first in a stable
 * order, detected ones ahead of the rest, then any other wallet that announced
 * itself.
 */
export function buildWalletOptions(detected: readonly Eip6963ProviderDetail[]): WalletOption[] {
  const claimed = new Set<Eip6963ProviderDetail>();

  const fromCatalogue = KNOWN_WALLETS.map<WalletOption>((known) => {
    const match = detected.find((detail) => !claimed.has(detail) && matches(known, detail));
    if (match) claimed.add(match);
    return match
      ? {
          id: known.id,
          name: match.info.name || known.name,
          status: 'DETECTED',
          icon: match.info.icon,
          monogram: known.monogram,
          installUrl: known.installUrl,
          detail: match,
          note: 'Installed in this browser',
        }
      : {
          id: known.id,
          name: known.name,
          status: 'NOT_INSTALLED',
          icon: '',
          monogram: known.monogram,
          installUrl: known.installUrl,
          detail: null,
          note: 'Not installed. Opens the official download page',
        };
  });

  const others = detected
    .filter((detail) => !claimed.has(detail))
    .map<WalletOption>((detail) => ({
      id: detail.info.rdns || detail.info.uuid || detail.info.name,
      name: detail.info.name,
      status: 'DETECTED',
      icon: detail.info.icon,
      monogram: detail.info.name.slice(0, 1).toUpperCase(),
      installUrl: null,
      detail,
      note: 'Announced over EIP-6963 by this browser',
    }));

  const detectedFirst = [...fromCatalogue].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'DETECTED' ? -1 : 1;
  });

  return [...detectedFirst, ...others];
}

/**
 * A slot for WalletConnect. It is deliberately inert: turning it on needs a
 * project id, which this deployment does not have.
 */
export const WALLETCONNECT_PLACEHOLDER: WalletOption = {
  id: 'walletconnect',
  name: 'WalletConnect',
  status: 'PLACEHOLDER',
  icon: '',
  monogram: 'W',
  installUrl: null,
  detail: null,
  note: 'Needs a WalletConnect project id',
};
