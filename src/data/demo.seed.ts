/**
 * Deterministic seeding for every demo fixture.
 *
 * No Math.random and no Date.now at module scope anywhere in src/data — the
 * same clone always renders the same screen, so screenshots are stable.
 */

/** Fixed demo clock: 2026-09-13T09:00:00Z, in unix seconds. */
export const DEMO_CLOCK_SECONDS = 1789290000;
export const DEMO_CLOCK_MS = DEMO_CLOCK_SECONDS * 1000;

/** Block height the fixtures pretend to have been read at. */
export const DEMO_BLOCK_NUMBER = 214_500_000n;

/** mulberry32 — small, fast, fully deterministic for a given seed. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stable pseudo-hash for fixtures. Clearly synthetic: fixture rows are always
 * labelled DEMO_FIXTURE in the UI and are never presented as on-chain hashes.
 */
export function demoHash(label: string): `0x${string}` {
  let seed = 0;
  for (let i = 0; i < label.length; i += 1) {
    seed = (Math.imul(seed, 31) + label.charCodeAt(i)) >>> 0;
  }
  const next = createSeededRandom(seed);
  let hex = '';
  while (hex.length < 64) {
    hex += Math.floor(next() * 0xffffffff)
      .toString(16)
      .padStart(8, '0');
  }
  return `0x${hex.slice(0, 64)}`;
}

/** Offsets, in seconds, from the demo clock. Negative = in the past. */
export function demoTime(offsetSeconds: number): number {
  return DEMO_CLOCK_SECONDS + offsetSeconds;
}
