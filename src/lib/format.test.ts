import { describe, expect, it } from 'vitest';
import { formatEth, formatEthWithUnit, formatTimestamp, parseEthToWei } from './format';
import { isAllowlisted, parseAddressList, shortenAddress } from './address';

describe('formatting', () => {
  it('formats wei exactly, without floating point drift', () => {
    expect(formatEth(0n)).toBe('0');
    expect(formatEth(1_000_000_000_000_000_000n)).toBe('1');
    expect(formatEth(12_000_000_000_000_000n)).toBe('0.012');
    expect(formatEthWithUnit(null)).toBe('—');
  });

  it('round-trips ETH strings', () => {
    expect(parseEthToWei('0.05')).toBe(50_000_000_000_000_000n);
    expect(formatEth(parseEthToWei('1.234567'))).toBe('1.234567');
    expect(() => parseEthToWei('abc')).toThrow();
  });

  it('formats timestamps as fixed UTC strings', () => {
    expect(formatTimestamp(1_789_290_000)).toBe('2026-09-13 09:00:00 UTC');
    expect(formatTimestamp(null)).toBe('—');
  });

  it('compares addresses case-insensitively', () => {
    const address = '0x1C4bE8a3D5f60718293a4B5c6D7e8F90A1b2C3d4';
    expect(isAllowlisted(address.toLowerCase(), [address])).toBe(true);
    expect(isAllowlisted('0xAf12345678901234567890123456789012345678', [address])).toBe(false);
    expect(parseAddressList('bad, 0x00')).toEqual([]);
    expect(shortenAddress(address)).toBe('0x1C4b…C3d4');
  });
});
