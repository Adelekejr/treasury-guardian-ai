/**
 * Fixture addresses. These are synthetic testnet placeholders used only when
 * Demo Mode is active; nothing here is claimed to hold funds or to exist
 * on-chain. Every record built from them carries provenance DEMO_FIXTURE.
 */

export const DEMO_TREASURY_ADDRESS = '0x7Ae2C5b0F1c0B3fF2D9a41E6b8c73d5A2E0f19B4';
export const DEMO_GUARDIAN_ADDRESS = '0x3F41d2C9aE07b5c6D8f0A1B2c3D4e5F60718293A';
export const DEMO_APPROVER_ADDRESS = '0x9B0d4E6f8A1c2D3e4F5061728394a5B6C7d8E9F0';

/** Allowlisted recipients — mirrors what the deployed contract would hold. */
export const DEMO_ALLOWED_RECIPIENTS = [
  '0x1C4bE8a3D5f60718293a4B5c6D7e8F90A1b2C3d4', // grants payout wallet
  '0x5D8fA1b2C3d4E5f60718293a4B5c6D7e8F90A1b2', // infrastructure reimbursement
  '0x2E7cB9a0D1f23456789aBcDeF0123456789AbCdE', // buildathon prize escrow
] as const;

/** Deliberately NOT on the allowlist — used for the review-required fixture. */
export const DEMO_UNKNOWN_RECIPIENT = '0xAf12345678901234567890123456789012345678';

/** Deliberately NOT on the allowlist — used for the blocked fixture. */
export const DEMO_DRAIN_RECIPIENT = '0xBe98765432109876543210987654321098765432';

export const DEMO_ALLOWED_METHODS = ['transferNative', 'approvePayout'] as const;

/** Human labels shown next to fixture addresses in the UI. */
export const DEMO_ADDRESS_LABELS: Readonly<Record<string, string>> = {
  [DEMO_TREASURY_ADDRESS.toLowerCase()]: 'Treasury (demo)',
  [DEMO_GUARDIAN_ADDRESS.toLowerCase()]: 'TreasuryGuardian contract (demo)',
  [DEMO_APPROVER_ADDRESS.toLowerCase()]: 'Approver (demo)',
  [DEMO_ALLOWED_RECIPIENTS[0].toLowerCase()]: 'Grants payout (allowlisted)',
  [DEMO_ALLOWED_RECIPIENTS[1].toLowerCase()]: 'Infra reimbursement (allowlisted)',
  [DEMO_ALLOWED_RECIPIENTS[2].toLowerCase()]: 'Prize escrow (allowlisted)',
  [DEMO_UNKNOWN_RECIPIENT.toLowerCase()]: 'Unknown recipient',
  [DEMO_DRAIN_RECIPIENT.toLowerCase()]: 'Unknown recipient',
};

export function demoLabelFor(address: string | null): string | null {
  if (!address) return null;
  return DEMO_ADDRESS_LABELS[address.toLowerCase()] ?? null;
}
