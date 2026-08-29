// src/lib/cosmetics/taglines.ts
import type { AchievementStats } from "@/lib/gamification";
import { SHORTLIST_THEMES } from "@/lib/shortlist-themes";
import type { Rarity, TaglineItem, Unlock } from "./types";

function line(
  id: string,
  set: string,
  text: string,
  unlock: Unlock,
  rarity: Rarity = "common",
): TaglineItem {
  return { id: `tagline.${id}`, slot: "tagline", name: text, text, set, unlock, rarity, rights: "owned" };
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

export const TAGLINES: TaglineItem[] = [
  // The Trailer
  line("trailer.in-a-world", "The Trailer", "In a world…", STARTER),
  line("trailer.this-summer", "The Trailer", "Coming this summer.", STARTER),
  line("trailer.one-last-job", "The Trailer", "One man. One last job.", DROP),
  line("trailer.personal", "The Trailer", "This time, it's personal.", DROP),
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
];

/** Typed lookup, so callers reach `.text` without narrowing a CosmeticItem. */
export function taglineById(id: string): TaglineItem | undefined {
  return TAGLINES.find((t) => t.id === id);
}

/**
 * Lines drawn from what the user has actually done. Never purchasable and never
 * droppable: the point is that they cannot be obtained any other way.
 */
export function earnedTaglines(stats: AchievementStats): TaglineItem[] {
  const out: TaglineItem[] = [];
  const earned = (id: string, text: string, key: string, rarity: Rarity): TaglineItem => ({
    id: `tagline.earned.${id}`,
    slot: "tagline",
    name: text,
    text,
    set: "Earned",
    unlock: { kind: "challenge", key },
    rarity,
    rights: "owned",
  });

  const weeks = stats.marqueeWeeks ?? 0;
  if (weeks > 0) {
    out.push(earned("attendance", `${weeks} Marquees, and counting.`, "season_ticket", "common"));
  }
  const solved = stats.marqueeConnectionsSolved ?? 0;
  if (solved >= 5) {
    out.push(earned("solver", `${solved} connections, cracked.`, "cryptologist", "rare"));
  }
  if (stats.moviesRanked >= 100) {
    out.push(earned("centurion", `${stats.moviesRanked} films ranked. No regrets.`, "centurion", "rare"));
  }
  if (stats.firstToMarquee) {
    out.push(earned("pioneer", "First through the door.", "marquee_pioneer", "legendary"));
  }
  return out;
}
