/**
 * Landing page figures.
 *
 * Every number here is measured from this repository. Nothing is estimated,
 * rounded up, or invented. When the counts change, re-measure and update:
 *
 *   frontendTests  -> npm test                 (Vitest summary line)
 *   contractTests  -> npm run test:contracts   (Mocha summary line)
 *   states         -> counted from IMPLEMENTED_STATES below
 *   chainId        -> src/config/network.ts
 *
 * Last measured: 2026-09-14, commit 38ef598.
 */
import { SUPPORTED_CHAIN_ID } from '../config/network';

/** The nine states the brief requires, each implemented and reachable. */
export const IMPLEMENTED_STATES = [
  'Low risk',
  'Review required',
  'Blocked',
  'Insufficient data',
  'Wallet disconnected',
  'Wrong network',
  'AI unavailable',
  'Contract unavailable',
  'Demo Mode active',
] as const;

/** Deterministic rules in src/services/policy/rules.ts. */
export const POLICY_RULES = [
  'DATA_COMPLETENESS',
  'CHAIN_MATCH',
  'AMOUNT_LIMIT',
  'RECIPIENT_ALLOWLIST',
  'METHOD_ALLOWLIST',
] as const;

export interface LandingStat {
  readonly value: string;
  readonly label: string;
  readonly note: string;
}

export const STATS: readonly LandingStat[] = [
  {
    value: '16',
    label: 'contract tests',
    note: 'Hardhat, covering every allowlist limit and the approval boundary',
  },
  {
    value: '41',
    label: 'frontend tests',
    note: 'Vitest, including proof a hostile model cannot change a verdict',
  },
  {
    value: String(IMPLEMENTED_STATES.length),
    label: 'implemented states',
    note: 'every risk, outage and disconnection state is reachable in the app',
  },
  {
    value: String(SUPPORTED_CHAIN_ID),
    label: 'the only chain id',
    note: 'Arbitrum Sepolia testnet — any other chain id is refused at startup',
  },
];
