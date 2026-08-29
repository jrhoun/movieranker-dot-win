/**
 * Deterministic hashing and pseudo-randomness.
 *
 * Extracted from connection-options.ts, which needed a per-slug shuffle that
 * was identical on server and client (a Math.random() shuffle hydrates
 * mismatched). Canister draws need the same property for a different reason:
 * a seeded draw is re-derivable, so random rewards need no database table.
 */

/** FNV-1a. Stable across processes and releases — do not "improve" it. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small, fast, seedable PRNG. Returns values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
