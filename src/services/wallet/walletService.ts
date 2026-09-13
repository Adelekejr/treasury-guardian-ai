/**
 * Wallet adapter (EIP-1193 injected provider).
 *
 * The app will only operate on Arbitrum Sepolia: `connect` reports the chain
 * id it finds, and every caller must treat anything other than 421614 as the
 * wrong-network state. No private key is ever requested, read or stored.
 */
import { ARBITRUM_SEPOLIA, SUPPORTED_CHAIN_ID } from '../../config/network';
import type { Eip1193Provider } from '../../types/eip1193';

export interface WalletConnection {
  readonly address: string;
  readonly chainId: number;
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  return window.ethereum ?? null;
}

export function hasInjectedWallet(): boolean {
  return getInjectedProvider() !== null;
}

function parseChainId(value: unknown): number {
  if (typeof value === 'string') return Number.parseInt(value, 16);
  if (typeof value === 'number') return value;
  throw new WalletError('Wallet returned an unreadable chain id.');
}

export async function getChainId(): Promise<number | null> {
  const provider = getInjectedProvider();
  if (!provider) return null;
  try {
    return parseChainId(await provider.request({ method: 'eth_chainId' }));
  } catch {
    return null;
  }
}

export async function getConnectedAccounts(): Promise<readonly string[]> {
  const provider = getInjectedProvider();
  if (!provider) return [];
  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    return Array.isArray(accounts) ? (accounts as string[]) : [];
  } catch {
    return [];
  }
}

export async function connectWallet(): Promise<WalletConnection> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new WalletError('No browser wallet found. Install an EIP-1193 wallet to continue.');
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const address = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
  if (!address) throw new WalletError('The wallet returned no account.');

  const chainId = parseChainId(await provider.request({ method: 'eth_chainId' }));
  return { address, chainId };
}

/**
 * Ask the wallet to switch to Arbitrum Sepolia, adding it with the verified
 * public parameters if the wallet does not know it yet.
 */
export async function switchToArbitrumSepolia(): Promise<void> {
  const provider = getInjectedProvider();
  if (!provider) throw new WalletError('No browser wallet found.');

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

/** Subscribe to wallet events. Returns an unsubscribe function. */
export function subscribeToWallet(handlers: {
  onAccountsChanged?: (accounts: readonly string[]) => void;
  onChainChanged?: (chainId: number) => void;
}): () => void {
  const provider = getInjectedProvider();
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
