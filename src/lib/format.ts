/** Presentation helpers. Deterministic: no Date.now(), no locale guessing. */

const WEI_PER_ETH = 1_000_000_000_000_000_000n;

/** Exact wei -> ETH string with up to `maxDecimals` significant decimals. */
export function formatEth(wei: bigint | null, maxDecimals = 6): string {
  if (wei === null) return '—';
  const negative = wei < 0n;
  const value = negative ? -wei : wei;
  const whole = value / WEI_PER_ETH;
  const fraction = value % WEI_PER_ETH;
  let fractionStr = fraction.toString().padStart(18, '0').slice(0, maxDecimals);
  fractionStr = fractionStr.replace(/0+$/, '');
  const body = fractionStr.length > 0 ? `${whole}.${fractionStr}` : `${whole}`;
  return negative ? `-${body}` : body;
}

export function formatEthWithUnit(wei: bigint | null, maxDecimals = 6): string {
  if (wei === null) return '—';
  return `${formatEth(wei, maxDecimals)} ETH`;
}

/** ETH decimal string -> wei. Throws on anything that is not a plain number. */
export function parseEthToWei(value: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Not a valid ETH amount: "${value}"`);
  }
  const [whole = '0', fraction = ''] = trimmed.split('.');
  const paddedFraction = (fraction + '0'.repeat(18)).slice(0, 18);
  return BigInt(whole) * WEI_PER_ETH + BigInt(paddedFraction);
}

/** Unix seconds -> fixed UTC string, so screenshots never drift. */
export function formatTimestamp(seconds: number | null): string {
  if (seconds === null) return '—';
  const date = new Date(seconds * 1000);
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

export function formatRelativeSeconds(seconds: number | null, nowSeconds: number): string {
  if (seconds === null) return 'unknown time';
  const delta = Math.max(0, nowSeconds - seconds);
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}
