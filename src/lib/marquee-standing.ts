/**
 * Marquee completion standing — pure math for the three ordering achievements
 * (marquee_pioneer, front_row_10, century_marquee).
 *
 * These were defined in gamification.ts but never earnable: both profile pages
 * called evaluateAchievements() without the fields that back them. No schema is
 * needed — ordering is derivable from lists.theme_slug + status + created_at,
 * which existing RLS already exposes because marquee lists are saved public.
 *
 * LIMITATION: created_at is insert time. For the normal marquee flow that equals
 * completion time (the session lives in localStorage and the row is inserted
 * already status='done'). A list created as a draft and finished later will rank
 * by its draft time. A precise fix requires a completed_at column; out of scope.
 */

export interface ThemeCompletion {
  ownerId: string;
  themeSlug: string;
  /** ISO timestamp; lists.created_at. */
  createdAt: string;
}

export interface MarqueeStanding {
  firstToMarquee: boolean;
  top10Marquee: boolean;
  top100Marquee: boolean;
}

/**
 * 1-based position of `ownerId`'s earliest completion of `themeSlug` among all
 * completions of that theme, or null if they never completed it.
 * Ties on timestamp break by ownerId so every viewer computes the same answer.
 */
export function themeCompletionRank(
  completions: ThemeCompletion[],
  ownerId: string,
  themeSlug: string,
): number | null {
  const forTheme = completions
    .filter((c) => c.themeSlug === themeSlug)
    .sort(
      (a, b) =>
        Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.ownerId.localeCompare(b.ownerId),
    );

  // Only the user's FIRST completion counts, so scan forward and stop at it.
  const seenOwners = new Set<string>();
  let position = 0;
  for (const c of forTheme) {
    if (seenOwners.has(c.ownerId)) continue;
    seenOwners.add(c.ownerId);
    position += 1;
    if (c.ownerId === ownerId) return position;
  }
  return null;
}

/** Best standing the user achieved across every theme they completed. */
export function marqueeStanding(
  completions: ThemeCompletion[],
  ownerId: string,
): MarqueeStanding {
  const themes = [...new Set(completions.map((c) => c.themeSlug))];
  let best: number | null = null;
  for (const slug of themes) {
    const rank = themeCompletionRank(completions, ownerId, slug);
    if (rank !== null && (best === null || rank < best)) best = rank;
  }
  return {
    firstToMarquee: best === 1,
    top10Marquee: best !== null && best <= 10,
    top100Marquee: best !== null && best <= 100,
  };
}
