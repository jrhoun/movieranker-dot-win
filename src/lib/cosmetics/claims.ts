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
 *
 * Absent and `null` both mean "no claims", NOT "malformed". That distinction is
 * load-bearing: `parseShowcase` turns a `null` from here into a null for the
 * WHOLE showcase, and `mergeShowcase` then falls back to `EMPTY_SHOWCASE` — so
 * treating a stored `avatarClaims: null` as malformed would silently wipe the
 * user's achievements, favourite list and equipped cosmetics on their next
 * write. `null` is also this codebase's established "clear this slot" value
 * (see NULLABLE_FIELDS in equipped.ts), so it is exactly what a future caller
 * following local idiom will send.
 *
 * Shape validation only. Whether these films are really the user's own finished
 * rankings, and whether the count fits `claimAllowance`, are server-side
 * questions asked where the database is in reach — this is not a trust boundary.
 */
export function parseAvatarClaims(input: unknown): number[] | null {
  if (input === undefined || input === null) return [];
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
