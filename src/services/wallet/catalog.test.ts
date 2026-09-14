import { describe, expect, it } from 'vitest';
import { KNOWN_WALLETS, buildWalletOptions } from './catalog';
import type { Eip6963ProviderDetail } from './eip6963';

function detail(name: string, rdns: string): Eip6963ProviderDetail {
  return {
    info: { uuid: `uuid-${rdns}`, name, icon: 'data:image/svg+xml,<svg/>', rdns },
    provider: { request: async () => null },
  };
}

describe('wallet catalogue', () => {
  it('always lists every known wallet, even with nothing installed', () => {
    const options = buildWalletOptions([]);
    expect(options).toHaveLength(KNOWN_WALLETS.length);
    expect(options.map((option) => option.name)).toEqual(['MetaMask', 'Bitget Wallet', 'Rabby']);
    for (const option of options) {
      expect(option.status).toBe('NOT_INSTALLED');
      expect(option.installUrl).toMatch(/^https:\/\//);
    }
  });

  it('marks an announced wallet as detected and keeps its announced icon', () => {
    const options = buildWalletOptions([detail('Rabby', 'io.rabby')]);
    const rabby = options.find((option) => option.id === 'rabby');
    expect(rabby?.status).toBe('DETECTED');
    expect(rabby?.icon).toContain('data:image');
    expect(rabby?.detail).not.toBeNull();
    expect(options.filter((option) => option.status === 'NOT_INSTALLED')).toHaveLength(2);
  });

  it('puts detected wallets first without dropping the rest', () => {
    const options = buildWalletOptions([detail('Rabby', 'io.rabby')]);
    expect(options[0]?.id).toBe('rabby');
    expect(options.map((option) => option.id)).toContain('metamask');
    expect(options.map((option) => option.id)).toContain('bitget');
  });

  it('matches on the announced name when the rdns is unfamiliar', () => {
    const options = buildWalletOptions([detail('Bitget Wallet', 'com.example.unknown')]);
    const bitget = options.find((option) => option.id === 'bitget');
    expect(bitget?.status).toBe('DETECTED');
    expect(options.filter((option) => option.status === 'DETECTED')).toHaveLength(1);
  });

  it('lists an unknown announced wallet as its own row rather than hiding it', () => {
    const options = buildWalletOptions([detail('Frame', 'sh.frame')]);
    expect(options.map((option) => option.name)).toContain('Frame');
    expect(options).toHaveLength(KNOWN_WALLETS.length + 1);
  });

  it('never claims one provider for two rows', () => {
    const options = buildWalletOptions([detail('MetaMask', 'io.metamask'), detail('MetaMask', 'io.metamask.flask')]);
    const claimed = options.filter((option) => option.detail !== null);
    expect(new Set(claimed.map((option) => option.detail)).size).toBe(claimed.length);
    expect(options.filter((option) => option.status === 'DETECTED')).toHaveLength(2);
  });
});
