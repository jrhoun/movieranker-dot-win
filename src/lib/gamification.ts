// Profile Era v0 — pure gamification math. XP = movies ranked (derived from
// existing list data; no tracking tables). Levels/unlocks are catalogs only.

export interface Level {
  level: number;
  title: string;
  /** XP required to reach this level. */
  xp: number;
}

export const LEVELS: Level[] = [
  { level: 1, title: "Usher", xp: 0 },
  { level: 2, title: "Film Buff", xp: 25 },
  { level: 3, title: "Critic", xp: 75 },
  { level: 4, title: "Projectionist", xp: 200 },
  { level: 5, title: "Commissioner", xp: 500 },
];

export type UnlockKind = "list-style" | "avatar-frame" | "profile-theme" | "title-flair";

export interface Unlock {
  atLevel: number;
  name: string;
  kind: UnlockKind;
}

export const UNLOCKS: Unlock[] = [
  { atLevel: 2, name: "Gold rank numerals", kind: "list-style" },
  { atLevel: 3, name: "Curtain avatar frame", kind: "avatar-frame" },
  { atLevel: 4, name: "Velvet profile theme", kind: "profile-theme" },
  { atLevel: 5, name: "Marquee title flair", kind: "title-flair" },
];

/** Level for a given XP (highest level whose threshold is met). */
export function levelFor(xp: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  return current;
}

export interface XpProgress {
  level: number;
  title: string;
  /** Current XP. */
  current: number;
  /** Next level's threshold, or null at max level. */
  next: { level: number; xp: number } | null;
  /** 0..1 toward `next` (1 when maxed). */
  progress01: number;
}

/** Progress toward the next level within [0,1]. */
export function xpProgress(xp: number): XpProgress {
  const level = levelFor(xp);
  const next = LEVELS.find((l) => l.level === level.level + 1) ?? null;
  if (!next || next.xp <= level.xp)
    return { level: level.level, title: level.title, current: xp, next: null, progress01: 1 };
  return {
    level: level.level,
    title: level.title,
    current: xp,
    next: { level: next.level, xp: next.xp },
    progress01: Math.min(1, Math.max(0, (xp - level.xp) / (next.xp - level.xp))),
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

/**
 * XP source: one point per movie ranked, summed across owned lists.
 * @param lists owned lists with per-list movie counts.
 */
export function totalMoviesRanked(lists: { movieCount: number }[]): number {
  return lists.reduce((sum, l) => sum + l.movieCount, 0);
}
