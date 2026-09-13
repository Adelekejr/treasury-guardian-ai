/**
 * Address helpers with no chain-library dependency, so the policy engine and
 * the views can use them without importing viem.
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export function isAddressLike(value: string | null | undefined): value is string {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

export function isTxHashLike(value: string | null | undefined): value is string {
  return typeof value === 'string' && TX_HASH_RE.test(value);
}

/** Lowercase form used for every comparison. Never shown to the user. */
export function normaliseAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function addressesEqual(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return normaliseAddress(a) === normaliseAddress(b);
}

export function isAllowlisted(address: string | null, allowlist: readonly string[]): boolean {
  if (!address) return false;
  const needle = normaliseAddress(address);
  return allowlist.some((entry) => normaliseAddress(entry) === needle);
}

/** 0x1234…abcd — used in tables where the full value is still in the title. */
export function shortenAddress(value: string | null, lead = 6, tail = 4): string {
  if (!value) return '—';
  if (value.length <= lead + tail + 2) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function shortenHash(value: string | null): string {
  return shortenAddress(value, 10, 6);
}

/** Parse a comma-separated env list into a de-duplicated array of addresses. */
export function parseAddressList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!isAddressLike(value)) continue;
    const key = normaliseAddress(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function parseStringList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
