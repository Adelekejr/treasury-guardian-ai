import { describe, expect, it } from 'vitest';
import { loadConfig } from './env';
import { SUPPORTED_CHAIN_ID } from './network';

const BASE = {
  VITE_CHAIN_ID: '421614',
  VITE_RPC_URL: 'https://sepolia-rollup.arbitrum.io/rpc',
  VITE_ALLOWED_RECIPIENTS: '0x1C4bE8a3D5f60718293a4B5c6D7e8F90A1b2C3d4',
  VITE_MAX_TRANSFER_ETH: '0.05',
};

describe('app configuration', () => {
  it('defaults to Arbitrum Sepolia and Demo Mode', () => {
    const config = loadConfig({});
    expect(config.chainId).toBe(SUPPORTED_CHAIN_ID);
    expect(config.demoMode).toBe(true);
    expect(config.rpcUrl).toBe('https://sepolia-rollup.arbitrum.io/rpc');
  });

  it('refuses any other chain id, including Arbitrum One and mainnet', () => {
    for (const chainId of ['1', '42161', '42170', '11155111']) {
      expect(() => loadConfig({ ...BASE, VITE_CHAIN_ID: chainId })).toThrow(/Unsupported VITE_CHAIN_ID/);
    }
  });

  it('parses the allowlist and the transfer limit', () => {
    const config = loadConfig({
      ...BASE,
      VITE_ALLOWED_RECIPIENTS: `${BASE.VITE_ALLOWED_RECIPIENTS},not-an-address,${BASE.VITE_ALLOWED_RECIPIENTS}`,
    });
    expect(config.allowedRecipients).toEqual([BASE.VITE_ALLOWED_RECIPIENTS]);
    expect(config.maxTransferWei).toBe(50_000_000_000_000_000n);
  });

  it('warns instead of throwing on a malformed contract address', () => {
    const config = loadConfig({ ...BASE, VITE_GUARDIAN_ADDRESS: '0xnope' });
    expect(config.guardianAddress).toBeNull();
    expect(config.warnings.join(' ')).toContain('VITE_GUARDIAN_ADDRESS');
  });

  it('falls back to a safe limit when the configured one is unreadable', () => {
    const config = loadConfig({ ...BASE, VITE_MAX_TRANSFER_ETH: 'lots' });
    expect(config.maxTransferWei).toBe(50_000_000_000_000_000n);
    expect(config.warnings.join(' ')).toContain('VITE_MAX_TRANSFER_ETH');
  });

  it('keeps the polling interval above the floor (no websocket watcher exists)', () => {
    expect(loadConfig({ ...BASE, VITE_POLL_INTERVAL_MS: '100' }).pollIntervalMs).toBe(4000);
  });
});
