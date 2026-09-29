import { isLiveMarqueeTheme, marqueeDisplayTitle } from "@/lib/marquee-title";
import { marqueeNumber } from "@/lib/shortlist";
import { isEarnedTagline } from "./taglines";
import type { CosmeticItem, Unlock } from "./types";
import { ACHIEVEMENTS } from "../gamification";

/**
 * Display strings shared by the collection gallery (a server component) and the
 * customise modal (a client one).
 *
 * They live here rather than in either component because the two must never
 * disagree about what a locked item says — and because importing one
 * component's helper into the other created a cycle across the client boundary.
 */

/**
 * What a locked item actually asks of you.
 *
 * The specific path, never "Coming Soon" and never a blur. An earlier build hid
 * locked names behind a blurred chip; it was removed deliberately, because a
 * collection that hides its contents cannot make anyone want anything. The
 * whole persuasive force of a gallery is a legible thing you do not have yet.
 */
export function unlockLabel(unlock: Unlock): string {
  switch (unlock.kind) {
    case "starter":
      return "Yours from the start";
    case "level":
      return `Level ${unlock.level}`;
    case "challenge":
      return ACHIEVEMENTS.find((a) => a.key === unlock.key)?.name ?? "An achievement";
    case "marquee":
      return "Finish that week's Marquee";
    case "drop":
      return "From a weekly Marquee";
  }
}

/**
 * What to call an item.
 *
 * For a tagline the line IS the label, so `name` and `text` are the same string
 * and printing both shows it twice. But NEVER fall back to `item.name` for an
 * EARNED line: all four carry a literal "{count}" in both fields, and
 * tagline.earned.pioneer's is the display text a user who has not earned it is
 * not shown.
 *
 * The test is MEMBERSHIP, not the absence of a `taglineTexts` entry — a caller
 * passing an incomplete map must not silently turn every static line into a
 * withheld one. (Sniffing the text for "{" was tried once and failed for
 * pioneer, which has no placeholder at all.)
 *
 * Locked STATIC lines still show their words, which is the point of a
 * collection: with a tagline, the line is the thing you want — WITH ONE
 * EXCEPTION. A Marquee souvenir line IS the week's theme title, and the theme
 * title paraphrases the answer to that week's connection quiz (see the spoiler
 * rule in marquee-title.ts). While that week is live, a locked souvenir is
 * the answer printed in the wardrobe of everyone who has not finished yet, so
 * it is masked the way every other surface masks it: "Weekly Marquee #N".
 * `owned` is what lifts the mask — a player who finished the week has seen
 * the title — and it defaults to false so a caller that forgets it fails
 * closed. Past weeks are revealed here as on every browsing surface.
 */
export function labelFor(
  item: CosmeticItem,
  taglineTexts: Record<string, string>,
  owned = false,
  now: Date = new Date(),
): string {
  if (item.slot !== "tagline") return item.name;
  if (item.unlock.kind === "marquee" && !owned && isLiveMarqueeTheme(item.unlock.themeSlug, now)) {
    return marqueeDisplayTitle(item.name, item.unlock.themeSlug, marqueeNumber(now));
  }
  const text = taglineTexts[item.id];
  if (text) return `“${text}”`;
  return isEarnedTagline(item.id) ? "An earned line" : `“${item.name}”`;
}
