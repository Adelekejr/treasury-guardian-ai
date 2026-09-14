/**
 * Wallet adapter.
 *
 * The app talks to one selected EIP-1193 provider, picked in the wallet modal
 * from the wallets that announced themselves over EIP-6963. That choice is
 * held here so later chain reads, switch requests and contract writes all go
 * to the same wallet instead of whichever one last claimed `window.ethereum`.
 *
 * No private key is ever requested, read or stored.
 */
import { ARBITRUM_SEPOLIA, SUPPORTED_CHAIN_ID } from '../../config/network';
import type { Eip1193Provider } from '../../types/eip1193';
import { legacyInjectedProvider, type Eip6963ProviderDetail } from './eip6963';

export interface WalletConnection {
  readonly address: string;
  readonly chainId: number;
  readonly walletName: string;
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

let active: Eip6963ProviderDetail | null = null;

export function setActiveWallet(detail: Eip6963ProviderDetail | null): void {
  active = detail;
}

export function getActiveWallet(): Eip6963ProviderDetail | null {
  return active;
}

/**
 * The provider the app should use. That is the one the human picked, falling
 * back to `window.ethereum` when nothing has been picked yet.
 */
export function getActiveProvider(): Eip1193Provider | null {
  if (active) return active.provider;
  return legacyInjectedProvider()?.provider ?? null;
}

export function hasInjectedWallet(): boolean {
  return getActiveProvider() !== null;
}

function parseChainId(value: unknown): number {
  if (typeof value === 'string') return Number.parseInt(value, 16);
  if (typeof value === 'number') return value;
  throw new WalletError('Wallet returned an unreadable chain id.');
}

/** Turns a provider rejection into something worth showing a human. */
export function describeWalletError(error: unknown): string {
  const code = (error as { code?: number })?.code;
  if (code === 4001) return 'Connection request rejected in the wallet.';
  if (code === -32002) return 'A connection request is already open. Check the wallet window.';
  const message = error instanceof Error ? error.message : String(error);
  return message || 'The wallet did not respond.';
}

export async function getChainId(): Promise<number | null> {
  const provider = getActiveProvider();
  if (!provider) return null;
  try {
    return parseChainId(await provider.request({ method: 'eth_chainId' }));
  } catch {
    return null;
  }
}

export async function getConnectedAccounts(): Promise<readonly string[]> {
  const provider = getActiveProvider();
  if (!provider) return [];
  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    return Array.isArray(accounts) ? (accounts as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Connect to one specific announced wallet. The caller decides which one. This
 * never guesses, and never falls back to a different provider on failure.
 */
export async function connectWithProvider(detail: Eip6963ProviderDetail): Promise<WalletConnection> {
  const { provider, info } = detail;
  if (typeof provider?.request !== 'function') {
    throw new WalletError(`${info.name} did not expose an EIP-1193 provider.`);
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const address = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
  if (!address) throw new WalletError(`${info.name} returned no account.`);

  const chainId = parseChainId(await provider.request({ method: 'eth_chainId' }));
  setActiveWallet(detail);
  return { address, chainId, walletName: info.name };
}

/**
 * Ask the connected wallet to switch to Arbitrum Sepolia, adding it with the
 * verified public parameters if the wallet does not know it yet.
 */
export async function switchToArbitrumSepolia(): Promise<void> {
  const provider = getActiveProvider();
  if (!provider) throw new WalletError('No wallet is connected.');

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARBITRUM_SEPOLIA.hexId }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    // 4902: the wallet does not know this chain yet.
    if (code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: ARBITRUM_SEPOLIA.hexId,
          chainName: ARBITRUM_SEPOLIA.name,
          nativeCurrency: { name: 'Ether', symbol: ARBITRUM_SEPOLIA.gasToken, decimals: 18 },
          rpcUrls: [ARBITRUM_SEPOLIA.defaultRpcUrl],
          blockExplorerUrls: [ARBITRUM_SEPOLIA.explorerUrl],
        },
      ],
    });
  }
}

export function isSupportedWalletChain(chainId: number | null): boolean {
  return chainId === SUPPORTED_CHAIN_ID;
}

/** Subscribe to the active wallet's events. Returns an unsubscribe function. */
export function subscribeToWallet(handlers: {
  onAccountsChanged?: (accounts: readonly string[]) => void;
  onChainChanged?: (chainId: number) => void;
}): () => void {
  const provider = getActiveProvider();
  if (!provider?.on || !provider.removeListener) return () => {};

  const accountsListener = (...args: never[]): void => {
    const accounts = args[0] as unknown;
    handlers.onAccountsChanged?.(Array.isArray(accounts) ? (accounts as string[]) : []);
  };
  const chainListener = (...args: never[]): void => {
    const chainId = args[0] as unknown;
    try {
      handlers.onChainChanged?.(parseChainId(chainId));
    } catch {
      /* ignore an unreadable chain id from the wallet */
    }
  };

  provider.on('accountsChanged', accountsListener);
  provider.on('chainChanged', chainListener);

  return () => {
    provider.removeListener?.('accountsChanged', accountsListener);
    provider.removeListener?.('chainChanged', chainListener);
  };
}
