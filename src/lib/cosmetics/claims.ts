// src/lib/cosmetics/claims.ts

/**
 * Poster claims economy:
 * Users earn the right to claim film posters from their ranked lists as avatars.
 * Claim allowance is derived from career level plus any bonus claims earned from drops/grants.
 */

export const CLAIMS_PER_LEVEL = 1;

/**
 * Total number of poster avatar claims allowed for a user.
 * Each career level earns `CLAIMS_PER_LEVEL` claims, plus any bonus `dropClaims`.
 */
export function claimAllowance(level: number, dropClaims = 0): number {
  return Math.max(0, Math.floor(level)) * CLAIMS_PER_LEVEL + Math.max(0, Math.floor(dropClaims));
}

/**
 * Validate and parse an unknown input into an array of unique positive integer TMDB IDs.
 * Returns `null` if the input is not a valid array of positive integers or contains duplicates.
 */
export function parseAvatarClaims(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<number>();
  for (const id of input) {
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0 || seen.has(id)) {
      return null;
    }
    seen.add(id);
  }
  return [...seen];
}
