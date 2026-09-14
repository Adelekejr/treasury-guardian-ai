/**
 * Runtime configuration.
 *
 * Everything read here comes from `import.meta.env.VITE_*`, which is bundled
 * into the browser build and is public. No secret is read here. The deployer
 * key lives only in contracts/.env, and the AI provider key is typed in at
 * runtime and held in memory for the session.
 */
import { parseAddressList, parseStringList } from '../lib/address';
import { parseEthToWei } from '../lib/format';
import { ARBITRUM_SEPOLIA, SUPPORTED_CHAIN_ID } from './network';

export interface AppConfig {
  readonly chainId: number;
  readonly chainName: string;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  readonly guardianAddress: string | null;
  readonly treasuryAddress: string | null;
  readonly allowedRecipients: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly maxTransferWei: bigint;
  readonly maxTransferEth: string;
  readonly pollIntervalMs: number;
  readonly lookbackBlocks: bigint;
  readonly demoMode: boolean;
  readonly repoUrl: string;
  readonly aiEndpoint: string | null;
  readonly aiModel: string | null;
  /** Non-fatal configuration problems, surfaced on the Settings screen. */
  readonly warnings: readonly string[];
}

type RawEnv = Record<string, string | boolean | undefined>;

function str(env: RawEnv, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function bool(env: RawEnv, key: string, fallback: boolean): boolean {
  const value = str(env, key);
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function int(env: RawEnv, key: string, fallback: number, min: number): number {
  const value = str(env, key);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

/**
 * Build the config. Any chain id other than Arbitrum Sepolia is refused, so the
 * app cannot be configured onto another network.
 */
export function loadConfig(env: RawEnv): AppConfig {
  const warnings: string[] = [];

  const configuredChainId = int(env, 'VITE_CHAIN_ID', SUPPORTED_CHAIN_ID, 0);
  if (configuredChainId !== SUPPORTED_CHAIN_ID) {
    throw new Error(
      `Unsupported VITE_CHAIN_ID "${configuredChainId}". Treasury Guardian AI runs on ` +
        `${ARBITRUM_SEPOLIA.name} (${SUPPORTED_CHAIN_ID}) only.`,
    );
  }

  const guardianAddressRaw = str(env, 'VITE_GUARDIAN_ADDRESS');
  const guardianAddress = parseAddressList(guardianAddressRaw)[0] ?? null;
  if (guardianAddressRaw && !guardianAddress) {
    warnings.push('VITE_GUARDIAN_ADDRESS is set but is not a valid address; treating the contract as unavailable.');
  }

  const treasuryAddressRaw = str(env, 'VITE_TREASURY_ADDRESS');
  const treasuryAddress = parseAddressList(treasuryAddressRaw)[0] ?? guardianAddress;
  if (treasuryAddressRaw && !parseAddressList(treasuryAddressRaw)[0]) {
    warnings.push('VITE_TREASURY_ADDRESS is set but is not a valid address; falling back to the contract address.');
  }

  const allowedRecipients = parseAddressList(str(env, 'VITE_ALLOWED_RECIPIENTS'));
  const allowedMethods = parseStringList(str(env, 'VITE_ALLOWED_METHODS')) ;

  const maxTransferEth = str(env, 'VITE_MAX_TRANSFER_ETH') ?? '0.05';
  let maxTransferWei: bigint;
  try {
    maxTransferWei = parseEthToWei(maxTransferEth);
  } catch {
    warnings.push(`VITE_MAX_TRANSFER_ETH "${maxTransferEth}" is not a number; using 0.05 ETH.`);
    maxTransferWei = parseEthToWei('0.05');
  }

  const demoMode = bool(env, 'VITE_DEMO_MODE', true);
  if (!demoMode && !guardianAddress) {
    warnings.push('Live mode is on but no contract address is configured, so contract actions are unavailable.');
  }

  const aiEndpoint = str(env, 'VITE_AI_ENDPOINT') ?? null;

  return {
    chainId: SUPPORTED_CHAIN_ID,
    chainName: str(env, 'VITE_CHAIN_NAME') ?? ARBITRUM_SEPOLIA.name,
    rpcUrl: str(env, 'VITE_RPC_URL') ?? ARBITRUM_SEPOLIA.defaultRpcUrl,
    explorerUrl: str(env, 'VITE_EXPLORER_URL') ?? ARBITRUM_SEPOLIA.explorerUrl,
    guardianAddress,
    treasuryAddress,
    allowedRecipients,
    allowedMethods: allowedMethods.length > 0 ? allowedMethods : ['transferNative', 'approvePayout'],
    maxTransferWei,
    maxTransferEth,
    pollIntervalMs: int(env, 'VITE_POLL_INTERVAL_MS', 8000, 4000),
    lookbackBlocks: BigInt(int(env, 'VITE_LOOKBACK_BLOCKS', 5000, 1)),
    demoMode,
    repoUrl: str(env, 'VITE_REPO_URL') ?? 'https://github.com/adelekejr/treasury-guardian-ai',
    aiEndpoint,
    aiModel: str(env, 'VITE_AI_MODEL') ?? null,
    warnings,
  };
}

/** The config used by the running app. */
export const appConfig: AppConfig = loadConfig(import.meta.env as unknown as RawEnv);
