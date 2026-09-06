import { marqueeNumber } from "./shortlist";

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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW LONG DOES A MARQUEE STAY MASKED? The NYT Games rule.
 *
 * Wordle and Connections protect an answer while the puzzle is live, publish it
 * the next day (the Wordle Review, the Connections Companion), and still never
 * print it on the puzzle page itself — the Wordle Archive replays old puzzles
 * whose answers are public knowledge. That is the model here:
 *
 *   LIVE WEEK   — masked on every surface. The puzzle is what everyone on the
 *                 site is playing right now.
 *   PAST WEEKS  — revealed on BROWSING surfaces (profile grids, the Community
 *                 Spotlight, list rows): the answer is public, and the evocative
 *                 title is the interesting half of a card.
 *   PAST WEEKS  — still masked on the PUZZLE surface, /l/[id], because the
 *                 connection game is rendered on every finished marquee list
 *                 with no week check and `POST /api/marquee-solve` scores any
 *                 theme. The heading there stays masked until THIS reader has
 *                 solved it — the existing client-side <MarqueeListTitle>
 *                 reveal, reading connection-state.ts in localStorage — so a
 *                 latecomer who finds an old list still gets a puzzle.
 *
 * "Live" is decided from the week the LIST was made (`marqueeListNumber`, i.e.
 * created_at), not from the theme: the rotation cannot be inverted from a slug
 * (see shortlist.ts), but a row's week is always knowable. A fork of an old
 * theme started this week therefore reads as live for a week — a mask where
 * none was needed, never a leak.
 *
 * The previous revision masked forever, on the argument that nothing ends a
 * puzzle. That was the reversible choice and it was right to start there; the
 * user chose the NYT model on 2026-09-05 once the puzzle surface itself was
 * kept honest.
 *
 * THE ONE EXEMPTION is `reveal` below: the owner's own private dashboard
 * (/u/profile), and only for a FINISHED list. See that flag's note.
 */
export function marqueeDisplayTitle(
  title: string,
  themeSlug: string | null | undefined,
  marqueeNum: number | null,
): string {
  if (!themeSlug) return title;
  return marqueeNum ? `Weekly Marquee #${marqueeNum}` : "Weekly Marquee";
}

/**
 * WHICH weekly puzzle a saved list belongs to, or null when it is not a
 * marquee list at all.
 *
 * Anchored to the week the room was MADE, never to the week someone happens to
 * be reading it: calling `marqueeNumber()` bare relabels every past marquee
 * with the current week's number, which the list page, the OG card and the
 * share text each had to learn separately. It lives here now so a fourth
 * surface cannot get it wrong.
 *
 * The one case created_at gets wrong is a room saved after the UTC Monday flip
 * but played before it (Sunday evening in the Americas), which reads one week
 * high — a wrong label, never a leak.
 */
export function marqueeListNumber(
  themeSlug: string | null | undefined,
  createdAt: string | Date | null | undefined,
): number | null {
  if (!themeSlug) return null;
  if (!createdAt) return null;
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return marqueeNumber(date);
}

export interface ListTitleInput {
  /** The stored list title. For a marquee list this IS the theme title. */
  title: string;
  /** Non-empty when the list came from a weekly marquee theme. */
  themeSlug?: string | null;
  /** The list's `created_at`; identifies which week's puzzle this is. */
  createdAt?: string | Date | null;
  /**
   * Show the real title anyway. TRUE ONLY on the owner's own private dashboard
   * (/u/profile), and only for a list they have already FINISHED.
   *
   * Never on /u/[handle], which is public and must render identically for
   * every viewer, and never for a DRAFT — the draft case is the leak the list
   * page already documents at length: the home hero withholds the theme, so
   * someone part-way through a marquee has never seen it, and the person still
   * playing is exactly the person a spoiler costs the most.
   *
   * The residual risk is deliberate and small: an owner who finished without
   * opening the quiz sees the answer on a page only they can load. That is a
   * self-spoiler on a private dashboard, not a leak to another player, and the
   * server has no honest way to distinguish it — the reveal state lives in the
   * reader's localStorage, not in the database.
   */
  reveal?: boolean;
  /**
   * Which kind of page is rendering the title. "browse" (the default) is a
   * card, row or feed summary: masked only while the list's week is live.
   * "puzzle" is /l/[id], where the connection game sits under the heading:
   * masked regardless of week, until the reader's own client-side reveal.
   */
  surface?: TitleSurface;
}

export type TitleSurface = "browse" | "puzzle";

/**
 * Is this list's marquee week the one everybody is playing right now?
 * `now` is injectable so the rule is testable without faking the clock.
 */
export function isLiveMarqueeWeek(
  themeSlug: string | null | undefined,
  createdAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const week = marqueeListNumber(themeSlug, createdAt);
  return week !== null && week === marqueeNumber(now);
}

/**
 * THE ONE CALL every list card, row, heading, ticket and feed summary makes.
 *
 * Prefer this over `marqueeDisplayTitle` at a render site: it takes the row as
 * it comes out of the database, so a caller cannot forget to anchor the week
 * (the failure that relabels a past marquee) or forget the rule entirely (the
 * failure that leaks the answer).
 */
export function maskListTitle(input: ListTitleInput, now: Date = new Date()): string {
  if (!input.themeSlug) return input.title;
  if (input.reveal) return input.title;
  const week = marqueeListNumber(input.themeSlug, input.createdAt);
  // A row whose week cannot be worked out (missing or unparseable created_at)
  // cannot prove its puzzle is over, so it stays masked: the rule fails closed.
  const over = week !== null && week < marqueeNumber(now);
  if (input.surface !== "puzzle" && over) return input.title;
  return marqueeDisplayTitle(input.title, input.themeSlug, week);
}
