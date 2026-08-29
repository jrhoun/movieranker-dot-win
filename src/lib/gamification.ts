// Profile Era — pure gamification math.
//
// XP is DERIVED from list data rather than recorded by an event system: there
// is no awards table, no XP ledger, no engagement log. That is deliberate and
// worth protecting. It means the whole system is auditable from the same rows
// that render your shelf, a deleted list cannot leave a phantom balance, and we
// never build the tracking apparatus that a points economy usually drags in.
//
// The constraint it imposes: every XP source must be re-derivable from data we
// already query. Anything that cannot be is not an XP source.

export interface CareerRank {
  rank: number;
  title: string;
  minLevel: number;
  maxLevel: number;
}

export const CAREER_RANKS: CareerRank[] = [
  { rank: 1, title: "Theater Usher", minLevel: 1, maxLevel: 10 },
  { rank: 2, title: "Film Buff", minLevel: 11, maxLevel: 20 },
  { rank: 3, title: "Cinephile", minLevel: 21, maxLevel: 30 },
  { rank: 4, title: "Projectionist", minLevel: 31, maxLevel: 40 },
  { rank: 5, title: "Film Critic", minLevel: 41, maxLevel: 50 },
  { rank: 6, title: "Festival Programmer", minLevel: 51, maxLevel: 60 },
  { rank: 7, title: "Screenwriter", minLevel: 61, maxLevel: 70 },
  { rank: 8, title: "Director", minLevel: 71, maxLevel: 80 },
  { rank: 9, title: "Executive Producer", minLevel: 81, maxLevel: 90 },
  { rank: 10, title: "Cinema Legend", minLevel: 91, maxLevel: 100 },
];

export const MAX_LEVEL = 100;

// ---------------------------------------------------------------------------
// The curve
// ---------------------------------------------------------------------------
//
// Levels used to cost a flat 5 XP each, which meant one twenty-film list moved
// you five levels and twenty-five lists reached Cinema Legend. Level-ups became
// confetti and the top rank arrived in about a month.
//
// A level now costs 10 XP, rising by 3 every ten levels. One finished Marquee
// still levels you up on your first visit — the point is to reward someone for
// showing up — but the ceiling is 2340 XP rather than 495, so Cinema Legend is
// a year of real use instead of a month.

/** Cost of the first ten levels. */
export const BASE_XP_PER_LEVEL = 10;
/** Added to a level's cost for every ten levels already climbed. */
export const XP_PER_LEVEL_STEP = 3;

/** XP to advance FROM `level` to `level + 1`. */
export function levelCost(level: number): number {
  return BASE_XP_PER_LEVEL + Math.floor(Math.max(1, level) / 10) * XP_PER_LEVEL_STEP;
}

/** Cumulative XP to stand AT each level. Index 0 is level 1, which costs nothing. */
const LEVEL_THRESHOLDS: number[] = (() => {
  const out = [0];
  for (let level = 1; level < MAX_LEVEL; level += 1) {
    out.push(out[level - 1] + levelCost(level));
  }
  return out;
})();

/** Total XP required to be at `level`. */
export function xpForLevel(level: number): number {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return LEVEL_THRESHOLDS[clamped - 1];
}

/** XP at the ceiling: 2340 under the current curve, up from a flat 495. */
export const MAX_BASE_XP = xpForLevel(MAX_LEVEL);
/** Past the ceiling, a prestige star every this many XP — roughly eight late levels. */
export const PRESTIGE_INTERVAL_XP = 250;

export function rankForLevel(level: number): string {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, level));
  const idx = Math.min(CAREER_RANKS.length - 1, Math.floor((clamped - 1) / 10));
  return CAREER_RANKS[idx]?.title ?? "Theater Usher";
}

export interface Level {
  level: number;
  title: string;
  /** XP required to reach this level. */
  xp: number;
  /** Prestige level (0 for base levels 1-100, >=1 for prestige tiers). */
  prestige?: number;
}

export const LEVELS: Level[] = Array.from({ length: MAX_LEVEL }, (_, i) => {
  const level = i + 1;
  return { level, title: rankForLevel(level), xp: xpForLevel(level) };
});

// ---------------------------------------------------------------------------
// Grandfathering
// ---------------------------------------------------------------------------

/** What a level cost before the curve existed. */
export const LEGACY_XP_PER_LEVEL = 5;

/**
 * Convert XP banked under the old flat rule into what the current curve charges
 * for the same level.
 *
 * WHY: `showcase.lifetimeXp` stores XP, not level, and it exists to promise that
 * nothing you do later costs you rank. Re-pricing levels without this would
 * quietly break that promise — 495 banked XP was Level 100 and would silently
 * become Level 44. Converting to the level's new price keeps everyone exactly
 * where they stood.
 */
export function grandfatheredXp(bankedXp: number): number {
  const safe = Math.max(0, bankedXp);
  const legacyLevel = Math.min(MAX_LEVEL, Math.floor(safe / LEGACY_XP_PER_LEVEL) + 1);
  return Math.max(safe, xpForLevel(legacyLevel));
}

// ---------------------------------------------------------------------------
// Unlocks
// ---------------------------------------------------------------------------

export type UnlockKind = "ability" | "nameplate";

export interface Unlock {
  atLevel: number;
  name: string;
  kind: UnlockKind;
  /**
   * What it actually does, in the reader's words. Every entry in UNLOCKS must
   * have a real effect: five of the original seven were strings that no code
   * ever read, including an avatar frame for an avatar this site does not have.
   */
  effect: string;
}

/** Minimum career level required to pin/feature a list on your public profile showcase. */
export const MIN_PIN_LIST_LEVEL = 10;

/** Minimum career level required to propose weekly marquee themes. */
export const MIN_PROPOSAL_LEVEL = 20;

export const UNLOCKS: Unlock[] = [
  {
    atLevel: MIN_PIN_LIST_LEVEL,
    name: "Featured list",
    kind: "ability",
    effect: "Pin one ranking to the top of your profile",
  },
  {
    atLevel: MIN_PROPOSAL_LEVEL,
    name: "Theme proposals",
    kind: "ability",
    effect: "Pitch themes for a future weekly Marquee",
  },
  {
    atLevel: 25,
    name: "Gilded nameplate",
    kind: "nameplate",
    effect: "Your handle is set in gold",
  },
  {
    atLevel: 50,
    name: "Velvet nameplate",
    kind: "nameplate",
    effect: "Your handle sits on a velvet band",
  },
  {
    atLevel: 75,
    name: "Marquee nameplate",
    kind: "nameplate",
    effect: "Your handle gets marquee bulbs",
  },
  {
    atLevel: 100,
    name: "Projector halo",
    kind: "nameplate",
    effect: "Your handle burns with projector light",
  },
];

/** Nameplate tiers in ascending order; index 0 means no nameplate earned yet. */
export const NAMEPLATE_LEVELS: number[] = UNLOCKS.filter((u) => u.kind === "nameplate").map(
  (u) => u.atLevel,
);

/** Which nameplate tier a level has earned: 0 (none) through NAMEPLATE_LEVELS.length. */
export function nameplateTier(level: number): number {
  return NAMEPLATE_LEVELS.filter((at) => at <= level).length;
}

/** Unlocks visible on the profile, split by whether `level` has reached them. */
export function unlockedAt(level: number): { unlocked: Unlock[]; locked: Unlock[] } {
  return {
    unlocked: UNLOCKS.filter((u) => u.atLevel <= level),
    locked: UNLOCKS.filter((u) => u.atLevel > level),
  };
}

/** Level for a given XP (1-100, plus prestige beyond max). */
export function levelFor(xp: number): Level {
  const safeXp = Math.max(0, xp);

  let baseLevel = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (safeXp >= LEVEL_THRESHOLDS[i]) {
      baseLevel = i + 1;
      break;
    }
  }
  const title = rankForLevel(baseLevel);

  if (safeXp >= MAX_BASE_XP) {
    return {
      level: MAX_LEVEL,
      title,
      xp: MAX_BASE_XP,
      prestige: Math.floor((safeXp - MAX_BASE_XP) / PRESTIGE_INTERVAL_XP),
    };
  }

  return { level: baseLevel, title, xp: xpForLevel(baseLevel), prestige: 0 };
}

export interface XpProgress {
  level: number;
  title: string;
  prestige: number;
  /** Current XP. */
  current: number;
  /** Next level's threshold, or next prestige threshold. */
  next: { level: number; xp: number } | null;
  /** 0..1 toward `next`. */
  progress01: number;
}

/** Progress toward the next level or prestige tier within [0,1]. */
export function xpProgress(xp: number): XpProgress {
  const safeXp = Math.max(0, xp);
  const lvl = levelFor(safeXp);

  if (safeXp >= MAX_BASE_XP) {
    const prestige = lvl.prestige ?? 0;
    const currentBase = MAX_BASE_XP + prestige * PRESTIGE_INTERVAL_XP;
    return {
      level: MAX_LEVEL,
      title: lvl.title,
      prestige,
      current: safeXp,
      next: { level: MAX_LEVEL, xp: currentBase + PRESTIGE_INTERVAL_XP },
      progress01: Math.min(1, Math.max(0, (safeXp - currentBase) / PRESTIGE_INTERVAL_XP)),
    };
  }

  const currentLevelBaseXp = xpForLevel(lvl.level);
  const nextLevelXp = xpForLevel(lvl.level + 1);
  const span = nextLevelXp - currentLevelBaseXp;

  return {
    level: lvl.level,
    title: lvl.title,
    prestige: 0,
    current: safeXp,
    next: { level: lvl.level + 1, xp: nextLevelXp },
    progress01: Math.min(1, Math.max(0, (safeXp - currentLevelBaseXp) / span)),
  };
}

// ---------------------------------------------------------------------------
// XP sources
// ---------------------------------------------------------------------------
//
// Every number below is the price the XP guide quotes. The guide reads these
// constants rather than restating them, because the previous version advertised
// a "+10 XP" marquee bonus and a "+5 XP" group bonus that no code ever paid.

/**
 * Per-list ceiling on MOVIE xp, so a 500-film dump is not a shortcut. It bounds
 * volume only — the completion bonuses below sit outside it deliberately, since
 * they reward a kind of engagement rather than a quantity of it.
 */
export const MAX_XP_PER_LIST = 20;

/** Finishing a weekly Marquee ranking. */
export const MARQUEE_COMPLETION_XP = 10;
/** Finishing a ranking that credits co-curators. */
export const CO_CURATION_XP = 5;
/** Cracking a weekly connection. Pays for thinking, which nothing else did. */
export const CONNECTION_SOLVE_XP = 10;
/** An invited participant registers and claims their spot. */
export const REFERRAL_XP_BONUS = 15;

export interface XpList {
  movieCount: number;
  /**
   * Required, not optional: XP is for rankings you FINISHED. Leaving this
   * inferable is how draft lists silently earned XP for movies merely added.
   */
  done: boolean;
  isMarquee?: boolean;
  coCurated?: boolean;
}

export interface XpSources {
  lists: XpList[];
  referralCount?: number;
  connectionsSolved?: number;
}

export interface XpBreakdown {
  movies: number;
  marquee: number;
  coCuration: number;
  connections: number;
  referrals: number;
  total: number;
}

const doneLists = (lists: XpList[]) => lists.filter((l) => l.done);

/** Movie XP: one per film in a finished ranking, capped per list. */
export function movieXp(lists: XpList[]): number {
  return doneLists(lists).reduce(
    (sum, l) => sum + Math.min(Math.max(0, l.movieCount), MAX_XP_PER_LIST),
    0,
  );
}

/**
 * Films you have actually ranked — uncapped, finished lists only. This is the
 * honest headline stat and what "ranked 100 movies" means; `movieXp` is the
 * capped amount that same activity is worth.
 */
export function countMoviesRanked(lists: XpList[]): number {
  return doneLists(lists).reduce((sum, l) => sum + Math.max(0, l.movieCount), 0);
}

/** Every XP source, itemised, so the profile can show where a total came from. */
export function calculateXpBreakdown(sources: XpSources): XpBreakdown {
  const done = doneLists(sources.lists);
  const movies = movieXp(sources.lists);
  const marquee = done.filter((l) => l.isMarquee).length * MARQUEE_COMPLETION_XP;
  const coCuration = done.filter((l) => l.coCurated).length * CO_CURATION_XP;
  const connections = Math.max(0, sources.connectionsSolved ?? 0) * CONNECTION_SOLVE_XP;
  const referrals = Math.max(0, sources.referralCount ?? 0) * REFERRAL_XP_BONUS;

  return {
    movies,
    marquee,
    coCuration,
    connections,
    referrals,
    total: movies + marquee + coCuration + connections + referrals,
  };
}

export function calculateTotalXp(sources: XpSources): number {
  return calculateXpBreakdown(sources).total;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
// Derived the same way XP is: computed from list data on read, never recorded.

export interface AchievementStats {
  /** Lists the user has finished ranking. */
  doneLists: number;
  /** Films ranked across finished lists — the real count, not XP. */
  moviesRanked: number;
  /** Maximum movies in any single finished list. */
  maxMoviesInSingleList?: number;
  /** Finished lists that credit co-curators. */
  coCuratedLists?: number;
  /** Weekly Marquee themes finished. */
  marqueeWeeks?: number;
  /** Weekly Marquee connections cracked. */
  marqueeConnectionsSolved?: number;
  /** True if the user was the #1 first to complete a weekly Marquee theme. */
  firstToMarquee?: boolean;
  /** True if the user was among the first 10 to complete a weekly Marquee theme. */
  top10Marquee?: boolean;
  /** True if the user was among the first 100 to complete a weekly Marquee theme. */
  top100Marquee?: boolean;
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "legendary";
  check: (stats: AchievementStats) => boolean;
  /**
   * Earned by demonstrating something rather than by accumulating time. These
   * are the hard ones, and they are deliberately not awarded for being fastest.
   */
  challenge?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first_premiere",
    name: "First Premiere",
    description: "Finished your first ranking",
    icon: "🎟️",
    rarity: "common",
    check: (s) => s.doneLists >= 1,
  },
  {
    key: "codebreaker",
    name: "The Codebreaker",
    description: "Cracked a weekly Marquee connection",
    icon: "🔍",
    rarity: "rare",
    check: (s) => (s.marqueeConnectionsSolved ?? 0) >= 1,
  },
  {
    key: "the_full_picture",
    name: "The Full Picture",
    description: "Finished five rankings",
    icon: "🎞️",
    rarity: "common",
    check: (s) => s.doneLists >= 5,
  },
  {
    key: "double_feature",
    name: "Double Feature",
    description: "Finished a ranking that credits a co-curator",
    icon: "🍿",
    rarity: "common",
    check: (s) => (s.coCuratedLists ?? 0) >= 1,
  },
  {
    key: "marathoner",
    name: "Marathoner",
    description: "Finished ten rankings",
    icon: "🏃",
    rarity: "common",
    check: (s) => s.doneLists >= 10,
  },
  {
    key: "heavyweight",
    name: "Heavyweight Division",
    description: "Ranked a single list of twelve films or more",
    icon: "🥊",
    rarity: "rare",
    check: (s) => (s.maxMoviesInSingleList ?? 0) >= 12,
  },
  {
    key: "final_cut",
    name: "The Final Cut",
    description: "Finished twenty-five rankings",
    icon: "✂️",
    rarity: "rare",
    check: (s) => s.doneLists >= 25,
  },
  {
    key: "centurion",
    name: "Centurion",
    description: "Ranked a hundred films across your finished lists",
    icon: "💯",
    rarity: "rare",
    check: (s) => s.moviesRanked >= 100,
  },
  {
    key: "season_ticket",
    name: "Season Ticket",
    description: "Ranked twelve weekly Marquees",
    icon: "🎪",
    rarity: "rare",
    check: (s) => (s.marqueeWeeks ?? 0) >= 12,
  },
  {
    key: "master_curator",
    name: "Master Curator",
    description: "Finished fifty rankings",
    icon: "🎬",
    rarity: "rare",
    check: (s) => s.doneLists >= 50,
  },
  {
    key: "front_row_10",
    name: "Front Row 10",
    description: "Ranked among the first ten on a weekly Marquee",
    icon: "🎫",
    rarity: "rare",
    check: (s) => !!s.top10Marquee,
  },
  {
    key: "century_marquee",
    name: "The 100 Club",
    description: "Ranked among the first hundred on a weekly Marquee",
    icon: "🏛️",
    rarity: "rare",
    check: (s) => !!s.top100Marquee,
  },
  {
    key: "marquee_pioneer",
    name: "Opening Night Pioneer",
    description: "First person to rank a weekly Marquee",
    icon: "✦",
    rarity: "legendary",
    check: (s) => !!s.firstToMarquee,
  },
  // The challenge tier: earned by doing something hard, not by being early.
  {
    key: "cryptologist",
    name: "Cryptologist",
    description: "Cracked five weekly connections",
    icon: "🧩",
    rarity: "legendary",
    challenge: true,
    check: (s) => (s.marqueeConnectionsSolved ?? 0) >= 5,
  },
  {
    key: "the_long_take",
    name: "The Long Take",
    description: "Settled a single ranking of twenty-four films or more",
    icon: "🎥",
    rarity: "legendary",
    challenge: true,
    check: (s) => (s.maxMoviesInSingleList ?? 0) >= 24,
  },
  {
    key: "the_programmer",
    name: "The Programmer",
    description: "Ranked a full year of weekly Marquees",
    icon: "🏆",
    rarity: "legendary",
    challenge: true,
    check: (s) => (s.marqueeWeeks ?? 0) >= 52,
  },
];

export interface EvaluatedAchievement extends Omit<Achievement, "check"> {
  unlocked: boolean;
}

/** Evaluate every achievement against a stats snapshot. */
export function evaluateAchievements(stats: AchievementStats): EvaluatedAchievement[] {
  return ACHIEVEMENTS.map(({ check, ...rest }) => ({ ...rest, unlocked: check(stats) }));
}
