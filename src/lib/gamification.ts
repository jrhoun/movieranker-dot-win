// Profile Era — pure gamification math. XP = movies ranked (derived from
// existing list data; no tracking tables). 100 levels over ~1 year.

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

export const XP_PER_LEVEL = 5;
export const MAX_LEVEL = 100;
export const MAX_BASE_XP = (MAX_LEVEL - 1) * XP_PER_LEVEL; // 495 XP (~100 lists / 1 year)
export const PRESTIGE_INTERVAL_XP = 100;
export const MAX_XP_PER_LIST = 20;

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
  return {
    level,
    title: rankForLevel(level),
    xp: i * XP_PER_LEVEL,
  };
});

export type UnlockKind = "list-style" | "avatar-frame" | "profile-theme" | "title-flair";

export interface Unlock {
  atLevel: number;
  name: string;
  kind: UnlockKind;
}

/** Minimum career level required to pin/feature a list on your public profile showcase. */
export const MIN_PIN_LIST_LEVEL = 10;

/** Minimum career level required to propose weekly marquee themes (Mid-tier: Film Buff / Cinephile). */
export const MIN_PROPOSAL_LEVEL = 20;

export const UNLOCKS: Unlock[] = [
  { atLevel: 10, name: "Pin featured list", kind: "list-style" },
  { atLevel: 20, name: "Theme proposals", kind: "title-flair" },
  { atLevel: 25, name: "Curtain avatar frame", kind: "avatar-frame" },
  { atLevel: 50, name: "Velvet profile theme", kind: "profile-theme" },
  { atLevel: 75, name: "Marquee title flair", kind: "title-flair" },
  { atLevel: 90, name: "Director's chair badge", kind: "title-flair" },
  { atLevel: 100, name: "Golden projector halo", kind: "profile-theme" },
];

/** Level for a given XP (1-100, plus prestige beyond max). */
export function levelFor(xp: number): Level {
  const safeXp = Math.max(0, xp);
  const baseLevel = Math.min(MAX_LEVEL, Math.floor(safeXp / XP_PER_LEVEL) + 1);
  const title = rankForLevel(baseLevel);

  if (safeXp >= MAX_BASE_XP) {
    const prestige = Math.floor((safeXp - MAX_BASE_XP) / PRESTIGE_INTERVAL_XP);
    return {
      level: MAX_LEVEL,
      title,
      xp: MAX_BASE_XP,
      prestige,
    };
  }

  return {
    level: baseLevel,
    title,
    xp: (baseLevel - 1) * XP_PER_LEVEL,
    prestige: 0,
  };
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
    const nextXp = currentBase + PRESTIGE_INTERVAL_XP;
    const progress01 = Math.min(1, Math.max(0, (safeXp - currentBase) / PRESTIGE_INTERVAL_XP));
    return {
      level: MAX_LEVEL,
      title: lvl.title,
      prestige,
      current: safeXp,
      next: { level: MAX_LEVEL, xp: nextXp },
      progress01,
    };
  }

  const currentLevelBaseXp = (lvl.level - 1) * XP_PER_LEVEL;
  const nextLevelXp = lvl.level * XP_PER_LEVEL;
  const progress01 = Math.min(1, Math.max(0, (safeXp - currentLevelBaseXp) / XP_PER_LEVEL));

  return {
    level: lvl.level,
    title: lvl.title,
    prestige: 0,
    current: safeXp,
    next: { level: lvl.level + 1, xp: nextLevelXp },
    progress01,
  };
}

/** Unlocks visible on the profile, split by whether `level` has reached them. */
export function unlockedAt(level: number): {
  unlocked: Unlock[];
  locked: Unlock[];
} {
  return {
    unlocked: UNLOCKS.filter((u) => u.atLevel <= level),
    locked: UNLOCKS.filter((u) => u.atLevel > level),
  };
}

// Derivable achievements: lazily computed from existing list data (done-list
// count + ranked-movie total); no awards table, no event hooks.

export interface AchievementStats {
  /** Lists the user has finished ranking. */
  doneLists: number;
  /** Total movies ranked across counted lists. */
  moviesRanked: number;
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
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first_premiere",
    name: "First Premiere",
    description: "Finished your first movie ranking",
    icon: "🎟️",
    rarity: "common",
    check: (s) => s.doneLists >= 1,
  },
  {
    key: "marathoner",
    name: "Marathoner",
    description: "Finished 10 movie rankings",
    icon: "🏃",
    rarity: "common",
    check: (s) => s.doneLists >= 10,
  },
  {
    key: "centurion",
    name: "Centurion",
    description: "Ranked 100 movies in total",
    icon: "💯",
    rarity: "rare",
    check: (s) => s.moviesRanked >= 100,
  },
  {
    key: "master_curator",
    name: "Master Curator",
    description: "Finished 50 movie rankings",
    icon: "🎬",
    rarity: "rare",
    check: (s) => s.doneLists >= 50,
  },
  {
    key: "marquee_pioneer",
    name: "Opening Night Pioneer",
    description: "First person to rank a weekly Marquee theme",
    icon: "✦",
    rarity: "legendary",
    check: (s) => !!s.firstToMarquee,
  },
  {
    key: "front_row_10",
    name: "Front Row 10",
    description: "Ranked among the first 10 on a weekly Marquee theme",
    icon: "🎫",
    rarity: "rare",
    check: (s) => !!s.top10Marquee,
  },
  {
    key: "century_marquee",
    name: "The 100 Club",
    description: "Ranked among the first 100 on a weekly Marquee theme",
    icon: "🏛️",
    rarity: "rare",
    check: (s) => !!s.top100Marquee,
  },
];

export interface EvaluatedAchievement extends Omit<Achievement, "check"> {
  unlocked: boolean;
}

/** Evaluate every achievement against a stats snapshot. */
export function evaluateAchievements(stats: AchievementStats): EvaluatedAchievement[] {
  return ACHIEVEMENTS.map(({ check, ...rest }) => ({ ...rest, unlocked: check(stats) }));
}

/** XP bonus awarded when an invited participant registers and claims their spot. */
export const REFERRAL_XP_BONUS = 15;

/**
 * XP source: one point per movie ranked, summed across owned lists.
 * Enforces an anti-gaming cap of MAX_XP_PER_LIST (20) per list.
 * @param lists owned lists with per-list movie counts.
 */
export function totalMoviesRanked(lists: { movieCount: number }[]): number {
  return lists.reduce((sum, l) => sum + Math.min(Math.max(0, l.movieCount), MAX_XP_PER_LIST), 0);
}

/** Total XP combining ranked movies with referral invite bonuses. */
export function calculateTotalXp(params: {
  lists: { movieCount: number }[];
  referralCount?: number;
}): number {
  const movieXp = totalMoviesRanked(params.lists);
  const referralXp = (params.referralCount ?? 0) * REFERRAL_XP_BONUS;
  return movieXp + referralXp;
}
