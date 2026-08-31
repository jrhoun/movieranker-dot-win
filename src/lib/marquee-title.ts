/**
 * THE SPOILER RULE, in one place.
 *
 * For a marquee list, the stored title IS the theme title — and a theme title
 * paraphrases the answer to the connection quiz. "The Golden Age of Hollywood"
 * sits above a quiz whose correct option is "All were made inside the old
 * studio system"; "Secretly The Same Story" sits above one about the monomyth.
 * Showing the title anywhere the quiz has not yet been answered hands the
 * player the answer.
 *
 * Every other surface already withheld it — the home hero (whose own comment
 * notes the hook "only works because the theme is withheld"), the share text,
 * the OG card, and the finished list page. The play room did not, so a player
 * ranked for twenty votes under a header naming the thing they were about to
 * be asked to guess.
 *
 * This exists as a shared function because two independent implementations of
 * a rule like this drift, and the failure is silent: nothing breaks, the puzzle
 * just quietly stops being a puzzle.
 *
 * WHAT IT DOES NOT DO: strip the title from storage. The saved list genuinely
 * is that theme, `loadSession` re-asserts the real title on every rehydration,
 * and the quiz reveals it once answered. This is a DISPLAY rule, applied where
 * the words would be read.
 */
export function marqueeDisplayTitle(
  title: string,
  themeSlug: string | null | undefined,
  marqueeNumber: number | null,
): string {
  if (!themeSlug) return title;
  return marqueeNumber ? `Weekly Marquee #${marqueeNumber}` : "Weekly Marquee";
}
