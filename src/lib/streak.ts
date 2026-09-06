/**
 * Win streak calculation pure helpers for duel matchups.
 */

export const STREAK_LAUREL_THRESHOLD = 3;

/**
 * Calculates current consecutive wins for a movie by traversing session history backwards.
 * Unrelated matchups between other movies are ignored.
 * Traversal stops at the first loss for this movie.
 */
export function getMovieWinStreak(
  history: ReadonlyArray<readonly [number, number]> | undefined | null,
  tmdbId: number
): number {
  if (!history || history.length === 0) return 0;
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const [winnerId, loserId] = history[i];
    if (winnerId === tmdbId) {
      streak++;
    } else if (loserId === tmdbId) {
      break;
    }
  }
  return streak;
}

/**
 * Returns true when a movie's current win streak qualifies for the gold laurel badge.
 */
export function hasLaurelBadge(streak: number): boolean {
  return streak >= STREAK_LAUREL_THRESHOLD;
}
