/**
 * Verified network facts. These values are fixed, and no other chain can become
 * a usable target.
 */

export interface ChainFacts {
  readonly id: number;
  readonly hexId: `0x${string}`;
  readonly name: string;
  readonly shortName: string;
  readonly defaultRpcUrl: string;
  readonly explorerUrl: string;
  readonly settlesTo: string;
  readonly gasToken: string;
  readonly testnet: true;
}

export const ARBITRUM_SEPOLIA: ChainFacts = {
  id: 421614,
  hexId: '0x66eee',
  name: 'Arbitrum Sepolia',
  shortName: 'ARBITRUM SEPOLIA',
  defaultRpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  explorerUrl: 'https://sepolia.arbiscan.io',
  settlesTo: 'Ethereum Sepolia',
  gasToken: 'ETH',
  testnet: true,
};

/** The only chain this application will ever operate on. */
export const SUPPORTED_CHAIN_ID = ARBITRUM_SEPOLIA.id;

/**
 * Chains that must never appear as a usable target. They are listed so the app
 * can name them in an error state, not so it can connect to them.
 */
export const FORBIDDEN_CHAINS: ReadonlyMap<number, string> = new Map([
  [1, 'Ethereum mainnet'],
  [42161, 'Arbitrum One'],
  [42170, 'Arbitrum Nova'],
]);

export function describeChainId(chainId: number | null): string {
  if (chainId === null) return 'no chain';
  if (chainId === SUPPORTED_CHAIN_ID) return ARBITRUM_SEPOLIA.name;
  const forbidden = FORBIDDEN_CHAINS.get(chainId);
  if (forbidden) return `${forbidden} (not supported)`;
  return `chain ${chainId} (not supported)`;
}

export function isSupportedChain(chainId: number | null): boolean {
  return chainId === SUPPORTED_CHAIN_ID;
}

export function explorerTxUrl(hash: string): string {
  return `${ARBITRUM_SEPOLIA.explorerUrl}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${ARBITRUM_SEPOLIA.explorerUrl}/address/${address}`;
}
