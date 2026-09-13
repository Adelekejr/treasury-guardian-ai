/**
 * Policy values used while Demo Mode is active. They mirror the constructor
 * arguments a deployed TreasuryGuardian would hold, so the fixtures exercise
 * exactly the same rules as live mode.
 */
import { DEMO_ALLOWED_METHODS, DEMO_ALLOWED_RECIPIENTS, DEMO_TREASURY_ADDRESS } from './demo.accounts';

/** 0.05 ETH, matching .env.example. */
export const DEMO_MAX_TRANSFER_WEI = 50_000_000_000_000_000n;

/**
 * The treasury itself is allowlisted so inbound faucet top-ups evaluate as
 * low risk; outbound payouts are limited to the three payout wallets.
 */
export const DEMO_POLICY_RECIPIENTS: readonly string[] = [
  ...DEMO_ALLOWED_RECIPIENTS,
  DEMO_TREASURY_ADDRESS,
];

export const DEMO_POLICY_METHODS: readonly string[] = [...DEMO_ALLOWED_METHODS];
