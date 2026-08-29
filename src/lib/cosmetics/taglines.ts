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

export const TAGLINES: TaglineItem[] = [
  // The Trailer
  line("trailer.in-a-world", "The Trailer", "In a world…", STARTER),
  line("trailer.this-summer", "The Trailer", "Coming this summer.", STARTER),
  line("trailer.one-last-job", "The Trailer", "One man. One last job.", DROP),
  // Documented as the marketing tagline of Jaws: The Revenge (1987) — a real
  // film's copy, not a generic trailer cliché — so it may be a free drop but
  // never purchasable. See the rights invariant in taglines.test.ts.
  line("trailer.personal", "The Trailer", "This time, it's personal.", DROP, "common", "referential"),
  line("trailer.unprepared", "The Trailer", "Nothing could prepare them.", DROP),
  line("trailer.never-the-same", "The Trailer", "You'll never look at it the same way again.", DROP, "rare"),

  // The Small Print
  line("print.true-story", "The Small Print", "Based on a true story.", STARTER),
  line("print.no-animals", "The Small Print", "No animals were harmed.", DROP),
  line("print.on-location", "The Small Print", "Filmed on location.", DROP),
  line("print.live-audience", "The Small Print", "Filmed before a live studio audience.", DROP),
  line("print.aspect-ratio", "The Small Print", "Presented in the original aspect ratio.", DROP),
  line("print.fictitious", "The Small Print", "All persons fictitious.", DROP, "rare"),

  // The 80s
  line("80s.rewind", "The 80s", "Please rewind before returning.", DROP),
  line("80s.tracking", "The 80s", "Tracking adjusted.", DROP),
  line("80s.sp-mode", "The 80s", "Recorded in SP mode.", DROP),
  line("80s.videocassette", "The 80s", "Coming soon to videocassette.", DROP),
  line("80s.taped-over", "The 80s", "Taped over a wedding.", DROP, "rare"),

  // The 90s
  line("90s.new-release", "The 90s", "New release wall.", DROP),
  line("90s.widescreen", "The 90s", "Widescreen edition.", DROP),
  line("90s.two-discs", "The 90s", "Two discs. One vision.", DROP),
  line("90s.staff-pick", "The 90s", "Staff pick.", DROP),
  line("90s.last-copy", "The 90s", "Last copy on the shelf.", DROP, "rare"),

  // The 2000s
  line("00s.unrated", "The 2000s", "Unrated extended cut.", DROP),
  line("00s.remastered", "The 2000s", "Digitally remastered.", DROP),
  line("00s.commentary", "The 2000s", "With commentary.", DROP),
  line("00s.deleted-scenes", "The 2000s", "Deleted scenes included.", DROP),
  line("00s.explain", "The 2000s", "The director would like to explain.", DROP, "rare"),

  // The 2010s
  line("10s.skip-intro", "The 2010s", "Skip intro.", DROP),
  line("10s.because-you-watched", "The 2010s", "Because you watched.", DROP),
  line("10s.exclusive", "The 2010s", "Streaming exclusive.", DROP),
  line("10s.leaving", "The 2010s", "Leaving at the end of the month.", DROP),
  line("10s.still-watching", "The 2010s", "Are you still watching?", DROP, "rare"),

  ...MARQUEE_LINES,
  ...EARNED_TAGLINES,
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
 * checks the same achievement) refuses it. Never purchasable and never
 * droppable: the point is that they cannot be obtained any other way.
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
  const item = taglineById(id);
  if (!item) return undefined;
  // An earned id the user has not qualified for resolves to nothing rather
  // than to its raw template.
  return item.text.includes("{") ? undefined : item.text;
}
