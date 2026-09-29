// src/lib/cosmetics/taglines.ts
import { evaluateAchievements, type AchievementStats } from "@/lib/gamification";
import { SHORTLIST_THEMES } from "@/lib/shortlist-themes";
import type { Rarity, Rights, TaglineItem, Unlock } from "./types";

function line(
  id: string,
  set: string,
  text: string,
  unlock: Unlock,
  rarity: Rarity = "common",
  rights: Rights = "owned",
): TaglineItem {
  return { id: `tagline.${id}`, slot: "tagline", name: text, text, set, unlock, rarity, rights };
}

const STARTER: Unlock = { kind: "starter" };
/**
 * Every `DROP` line below is APPEND-ONLY. `drawFrom` walks cumulative rarity
 * weights positionally over the droppable slice of `CATALOGUE`, so a line's
 * position and rarity in the TAGLINES array are part of what every user has
 * already drawn. Adding, removing, reordering or re-rarity-ing an existing
 * `DROP` line retroactively rewrites their whole Marquee drop history. Full
 * explanation on `CATALOGUE` in catalogue.ts. New lines go at the end of their
 * set; the sets themselves must keep their current order too.
 *
 * EIGHT DROP LINES, IN TWO SETS. The four decade sets (twenty lines of "Skip
 * intro." and "Staff pick.") were cut on 2026-09-28: a drop that lands one of
 * forty near-identical fragments is a drop nobody notices, and a wardrobe of
 * forty dimmed lines read as a shop. That cut re-rolled every past draw once,
 * knowingly; the pinned sequence in ownership.test.ts was re-captured against
 * this pool and must not move again by accident.
 */
const DROP: Unlock = { kind: "drop" };

/**
 * One souvenir per weekly theme, unlocked only by finishing that week. Already
 * written and already owned by the site, so the library grows by one every
 * Monday at no authoring cost.
 */
const MARQUEE_LINES: TaglineItem[] = SHORTLIST_THEMES.map((theme) => ({
  id: `tagline.marquee.${theme.slug}`,
  slot: "tagline",
  name: theme.title,
  text: theme.title,
  set: "Marquee",
  unlock: { kind: "marquee", themeSlug: theme.slug },
  rarity: "rare",
  rights: "owned",
}));

/**
 * Static catalogue entries for earned lines, carrying a literal `{count}`
 * placeholder where a number is interpolated at call time. These reach
 * `CATALOGUE`/`TAGLINES` so ownership (derived by iterating `CATALOGUE`) and
 * equipping can see them like any other `{ kind: "challenge" }` item —
 * `earnedTaglines` below only fills in the number, it does not invent ids.
 */
export const EARNED_TAGLINES: TaglineItem[] = [
  {
    id: "tagline.earned.attendance",
    slot: "tagline",
    name: "{count} Marquees, and counting.",
    text: "{count} Marquees, and counting.",
    set: "Earned",
    unlock: { kind: "challenge", key: "season_ticket" },
    rarity: "common",
    rights: "owned",
  },
  {
    id: "tagline.earned.solver",
    slot: "tagline",
    name: "{count} connections, cracked.",
    text: "{count} connections, cracked.",
    set: "Earned",
    unlock: { kind: "challenge", key: "cryptologist" },
    rarity: "rare",
    rights: "owned",
  },
  {
    id: "tagline.earned.centurion",
    slot: "tagline",
    name: "{count} films ranked. No regrets.",
    text: "{count} films ranked. No regrets.",
    set: "Earned",
    unlock: { kind: "challenge", key: "centurion" },
    rarity: "rare",
    rights: "owned",
  },
  {
    id: "tagline.earned.pioneer",
    slot: "tagline",
    name: "First through the door.",
    text: "First through the door.",
    set: "Earned",
    unlock: { kind: "challenge", key: "marquee_pioneer" },
    rarity: "legendary",
    rights: "owned",
  },
];

/**
 * Membership set for the earned ids, so `resolveTaglineText` can recognise an
 * unqualified earned line by WHICH line it is rather than by inspecting its
 * text. Text is not a reliable signal: `tagline.earned.pioneer` reads "First
 * through the door." and carries no `{count}` placeholder at all, so a
 * `text.includes("{")` sniff would hand its real display text to a user who
 * has not earned it.
 */
const EARNED_IDS = new Set(EARNED_TAGLINES.map((t) => t.id));

/**
 * Membership, never a text sniff — see the note above. UI that has to decide
 * whether a tagline's own words may be shown asks this: a STATIC line is safe
 * to display while locked (the line is the thing you want), an EARNED one is
 * not, because its `name` and `text` are either a "{count}" template or the
 * display text of something not yet earned.
 */
export function isEarnedTagline(id: string): boolean {
  return EARNED_IDS.has(id);
}

export const TAGLINES: TaglineItem[] = [
  // The Trailer
  line("trailer.in-a-world", "The Trailer", "In a world…", STARTER),
  line("trailer.this-summer", "The Trailer", "Coming this summer.", STARTER),
  line("trailer.one-last-job", "The Trailer", "One man. One last job.", DROP),
  // Documented as the marketing tagline of Jaws: The Revenge (1987) — a real
  // film's copy, not a generic trailer cliché — so it may be a free drop but
  // never sold. See the rights invariant in taglines.test.ts.
  line("trailer.personal", "The Trailer", "This time, it's personal.", DROP, "common", "referential"),
  line("trailer.unprepared", "The Trailer", "Nothing could prepare them.", DROP),
  line("trailer.never-the-same", "The Trailer", "You'll never look at it the same way again.", DROP, "rare"),

  // The Small Print
  line("print.true-story", "The Small Print", "Based on a true story.", STARTER),
  line("print.no-animals", "The Small Print", "No animals were harmed.", DROP),
  line("print.on-location", "The Small Print", "Filmed on location.", DROP),
  line("print.aspect-ratio", "The Small Print", "Presented in the original aspect ratio.", DROP),
  line("print.fictitious", "The Small Print", "All persons fictitious.", DROP, "rare"),

  ...MARQUEE_LINES,
  ...EARNED_TAGLINES,
  {
    id: "tagline.betamax",
    slot: "tagline",
    name: "Betamax",
    text: "Betamax was better",
    set: "Beta Test Screener",
    unlock: { kind: "challenge", key: "beta_pioneer" },
    rarity: "legendary",
    rights: "owned",
  },
];

/** Typed lookup, so callers reach `.text` without narrowing a CosmeticItem. */
export function taglineById(id: string): TaglineItem | undefined {
  return TAGLINES.find((t) => t.id === id);
}

/** Which stat feeds the `{count}` in a given earned line's text, if it has one. */
function countFor(id: string, stats: AchievementStats): number | undefined {
  switch (id) {
    case "tagline.earned.attendance":
      return stats.marqueeWeeks ?? 0;
    case "tagline.earned.solver":
      return stats.marqueeConnectionsSolved ?? 0;
    case "tagline.earned.centurion":
      return stats.moviesRanked;
    default:
      return undefined;
  }
}

/** Substitutes the literal `{count}` placeholder with the real number, if this line has one. */
function interpolate(template: TaglineItem, stats: AchievementStats): TaglineItem {
  const count = countFor(template.id, stats);
  if (count === undefined) return template;
  const text = template.text.replace("{count}", String(count));
  return { ...template, name: text, text };
}

/**
 * Lines drawn from what the user has actually done. The achievement system is
 * the single authority on whether a line is unlocked — `evaluateAchievements`
 * decides eligibility, this function only fills in the `{count}` placeholder.
 * It must never re-derive its own thresholds: two places encoding one rule is
 * exactly the drift that leaves the tagline offered while equip logic (which
 * checks the same achievement) refuses it. Never droppable: the point is that
 * they cannot be obtained any other way.
 */
export function earnedTaglines(stats: AchievementStats): TaglineItem[] {
  const unlocked = new Set(
    evaluateAchievements(stats)
      .filter((a) => a.unlocked)
      .map((a) => a.key),
  );
  return EARNED_TAGLINES.filter((t) => {
    const u = t.unlock;
    return u.kind === "challenge" && unlocked.has(u.key);
  }).map((t) => interpolate(t, stats));
}

/**
 * The single supported way to get a tagline's DISPLAY text.
 *
 * Earned lines live in the catalogue carrying a "{count}" placeholder so the
 * ownership machinery can see them, which means `itemById(id).text` is a
 * template rather than something you can render. Always resolve through here.
 */
export function resolveTaglineText(
  id: string,
  stats: AchievementStats,
): string | undefined {
  const earned = earnedTaglines(stats).find((t) => t.id === id);
  if (earned) return earned.text;
  // An earned id the user has not qualified for resolves to nothing rather
  // than to its catalogue entry. Decided by MEMBERSHIP in EARNED_TAGLINES, not
  // by looking for a "{" in the text: `tagline.earned.pioneer` has no
  // placeholder ("First through the door."), so a text sniff would leak its
  // real display text to someone who has not earned it.
  if (EARNED_IDS.has(id)) return undefined;
  return taglineById(id)?.text;
}
