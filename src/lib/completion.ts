import {
  evaluateAchievements,
  levelFor,
  rankForLevel,
  xpProgress,
  type AchievementStats,
  type EvaluatedAchievement,
  type Unlock as LevelUnlock,
} from "./gamification";
import { resolveTaglineText } from "./cosmetics/taglines";
import { diffUnlocks, type NewCosmeticGroup } from "./cosmetics/unlock-diff";

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
 *
 * Cosmetics are derived the same way (see cosmetics/ownership.ts), so the
 * caller resolves ownership twice as well and hands both sets in; this file
 * only subtracts. `stats` must carry every achievement input — including
 * `publicDoneLists`, `hasHandle` and `isSignedIn` — or the achievements that
 * read them (Beta Test Screener) can never be announced here.
 */

export interface CompletionSnapshot {
  /** Total XP at this point in time. */
  xp: number;
  stats: AchievementStats;
  /**
   * Cosmetic ids owned at this point, as `ownedItemIds` resolves them. Optional
   * so a caller that has no ownership inputs still gets XP and achievements;
   * when either side is missing, no cosmetics are reported.
   */
  owned?: Set<string>;
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
  /** UNLOCKS entries crossed by this level-up (abilities, nameplates). Empty when not levelled up. */
  levelUnlocks: LevelUnlock[];
  /** Cosmetics owned now and not before, grouped by slot. Empty when nothing dropped. */
  newCosmetics: NewCosmeticGroup[];
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

  // Earned taglines carry a "{count}" template in the catalogue; the diff
  // prints whatever text it is handed, so resolve each new one against the
  // stats that earned it. The map is keyed by id and only the after-side ids
  // matter — a line was either owned before (and is not in the diff) or not.
  const taglineTexts: Record<string, string> = {};
  if (after.owned) {
    for (const id of after.owned) {
      if (!id.startsWith("tagline.") || before.owned?.has(id)) continue;
      const text = resolveTaglineText(id, after.stats);
      if (text) taglineTexts[id] = text;
    }
  }
  const unlocks = diffUnlocks(
    { owned: before.owned ?? new Set(), level: previousLevel },
    // Without both ownership sides, subtracting would announce everything the
    // user has ever owned as new. Report nothing instead.
    { owned: before.owned && after.owned ? after.owned : new Set(), level: progress.level },
    taglineTexts,
  );

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
    levelUnlocks: unlocks.levelUp?.unlocks ?? [],
    newCosmetics: unlocks.cosmetics,
  };
}

/**
 * True when there is something worth interrupting someone for. A ranking that
 * earned no XP, no level, no badge and no cosmetic does not deserve a
 * celebration panel.
 */
export function isWorthCelebrating(summary: CompletionSummary): boolean {
  return (
    summary.xpEarned > 0 ||
    summary.leveledUp ||
    summary.newAchievements.length > 0 ||
    summary.newCosmetics.length > 0
  );
}
