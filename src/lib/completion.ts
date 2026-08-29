import {
  evaluateAchievements,
  levelFor,
  rankForLevel,
  xpProgress,
  type AchievementStats,
  type EvaluatedAchievement,
} from "./gamification";

/**
 * What finishing a ranking just earned you.
 *
 * WHY A DIFF AND NOT A LEDGER: achievements in this codebase are derived from
 * list data rather than recorded when they happen — there is no awards table
 * and no event hooks (see the note above AchievementStats). That is a good
 * property and this keeps it. To answer "what did this list unlock" we evaluate
 * the same pure functions twice, once against the user's totals and once against
 * those totals minus the list they just finished, and subtract. Exact, no new
 * state, and it stays correct if a list is later deleted.
 */

export interface CompletionSnapshot {
  /** Total XP at this point in time. */
  xp: number;
  stats: AchievementStats;
}

export interface CompletionSummary {
  /** XP this one ranking contributed. */
  xpEarned: number;
  totalXp: number;
  level: number;
  /** Career rank title for the level, e.g. "Runner". */
  rank: string;
  /** 0..1 toward the next level or prestige tier. */
  progress01: number;
  /** XP needed for the next level; null at the ceiling. */
  nextLevelXp: number | null;
  leveledUp: boolean;
  previousLevel: number;
  /** Unlocked now, locked before. Empty most of the time, which is the point. */
  newAchievements: EvaluatedAchievement[];
}

export function summariseCompletion(
  before: CompletionSnapshot,
  after: CompletionSnapshot,
): CompletionSummary {
  const wasUnlocked = new Set(
    evaluateAchievements(before.stats)
      .filter((a) => a.unlocked)
      .map((a) => a.key),
  );
  const newAchievements = evaluateAchievements(after.stats).filter(
    (a) => a.unlocked && !wasUnlocked.has(a.key),
  );

  const progress = xpProgress(after.xp);
  const previousLevel = levelFor(before.xp).level;

  return {
    // Clamped: deleting a list between page loads should never render as a
    // negative gain.
    xpEarned: Math.max(0, after.xp - before.xp),
    totalXp: after.xp,
    level: progress.level,
    rank: rankForLevel(progress.level),
    progress01: progress.progress01,
    nextLevelXp: progress.next?.xp ?? null,
    leveledUp: progress.level > previousLevel,
    previousLevel,
    newAchievements,
  };
}

/**
 * True when there is something worth interrupting someone for. A ranking that
 * earned no XP, no level and no badge does not deserve a celebration panel.
 */
export function isWorthCelebrating(summary: CompletionSummary): boolean {
  return summary.xpEarned > 0 || summary.leveledUp || summary.newAchievements.length > 0;
}
