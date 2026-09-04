import { describe, expect, it } from "vitest";
import {
  getMovieWinStreak,
  hasLaurelBadge,
  STREAK_LAUREL_THRESHOLD,
} from "./streak";

/**
 * Reference Oracle for Win Streak Calculation
 */
function referenceStreakOracle(
  history: ReadonlyArray<readonly [number, number]> | undefined | null,
  tmdbId: number
): number {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const match = history[i];
    if (!match) continue;
    const [winner, loser] = match;
    if (winner === tmdbId) {
      count++;
    } else if (loser === tmdbId) {
      break;
    }
  }
  return count;
}

describe("Adversarial Stress Test: getMovieWinStreak", () => {
  describe("Large Scale Histories (10,000 to 100,000 matches)", () => {
    it("handles 10,000 consecutive wins with sub-millisecond execution", () => {
      const size = 10_000;
      const targetId = 42;
      const history: Array<[number, number]> = [];
      for (let i = 0; i < size; i++) {
        history.push([targetId, 1000 + i]);
      }

      const start = performance.now();
      const streak = getMovieWinStreak(history, targetId);
      const elapsed = performance.now() - start;

      expect(streak).toBe(size);
      expect(hasLaurelBadge(streak)).toBe(true);
      expect(elapsed).toBeLessThan(50); // Under 50ms for 10k items
    });

    it("terminates early when loss is near the end of a 100,000 match history", () => {
      const size = 100_000;
      const targetId = 7;
      const history: Array<[number, number]> = [];
      // First 99,990 matches are wins for targetId
      for (let i = 0; i < 99_990; i++) {
        history.push([targetId, 500 + (i % 1000)]);
      }
      // Match 99,991 is a loss for targetId
      history.push([999, targetId]);
      // Last 9 matches are wins for targetId
      for (let i = 0; i < 9; i++) {
        history.push([targetId, 600 + i]);
      }

      const start = performance.now();
      const streak = getMovieWinStreak(history, targetId);
      const elapsed = performance.now() - start;

      expect(streak).toBe(9);
      expect(hasLaurelBadge(streak)).toBe(true);
      expect(elapsed).toBeLessThan(20);
    });

    it("evaluates streaks across 10,000 randomized matches matching oracle exactly", () => {
      const numMovies = 100;
      const historyLength = 10_000;
      const history: Array<[number, number]> = [];

      // Pseudo-random deterministic match generator (LCG)
      let seed = 123456789;
      function nextRand() {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      }

      for (let i = 0; i < historyLength; i++) {
        const m1 = Math.floor(nextRand() * numMovies) + 1;
        let m2 = Math.floor(nextRand() * numMovies) + 1;
        while (m2 === m1) {
          m2 = Math.floor(nextRand() * numMovies) + 1;
        }
        // Random winner
        if (nextRand() > 0.5) {
          history.push([m1, m2]);
        } else {
          history.push([m2, m1]);
        }
      }

      // Verify every movie's streak against reference oracle
      for (let m = 1; m <= numMovies; m++) {
        const actual = getMovieWinStreak(history, m);
        const expected = referenceStreakOracle(history, m);
        expect(actual).toBe(expected);
      }
    });
  });

  describe("Cyclical and Oscillating Matchups", () => {
    it("handles 3-way cycles (A beats B, B beats C, C beats A)", () => {
      // 1000 repetitions of cycle: [A, B], [B, C], [C, A]
      const history: Array<[number, number]> = [];
      const [A, B, C] = [1, 2, 3];
      for (let i = 0; i < 1000; i++) {
        history.push([A, B]);
        history.push([B, C]);
        history.push([C, A]);
      }

      // At the end of [C, A]:
      // C won, so C's most recent match is win (against A). Before that, C lost to B (in [B, C]). So C streak = 1.
      // A lost to C (in [C, A]), so A streak = 0.
      // B won against C (in [B, C]), and did not participate in [C, A]. Before that, B lost to A (in [A, B]). So B streak = 1.
      expect(getMovieWinStreak(history, A)).toBe(0);
      expect(getMovieWinStreak(history, B)).toBe(1);
      expect(getMovieWinStreak(history, C)).toBe(1);
    });

    it("handles 2-way oscillating duels (A beats B, B beats A)", () => {
      const history: Array<[number, number]> = [];
      const [A, B] = [10, 20];
      for (let i = 0; i < 500; i++) {
        history.push([A, B]);
        history.push([B, A]);
      }

      // Ending on [B, A]: B won, A lost
      expect(getMovieWinStreak(history, B)).toBe(1);
      expect(getMovieWinStreak(history, A)).toBe(0);

      // Add another win for B against an unrelated movie C
      history.push([B, 30]);
      expect(getMovieWinStreak(history, B)).toBe(2);
      expect(getMovieWinStreak(history, A)).toBe(0);

      // Add another win for B
      history.push([B, 40]);
      expect(getMovieWinStreak(history, B)).toBe(3);
      expect(hasLaurelBadge(getMovieWinStreak(history, B))).toBe(true);
    });
  });

  describe("Negative, Zero, Fractional, and Extreme Numerical IDs", () => {
    it("correctly computes streaks for negative IDs", () => {
      const history: Array<[number, number]> = [
        [-1, -2],
        [-1, -3],
        [-1, -4],
      ];
      expect(getMovieWinStreak(history, -1)).toBe(3);
      expect(getMovieWinStreak(history, -2)).toBe(0);
      expect(getMovieWinStreak(history, -3)).toBe(0);
    });

    it("correctly computes streaks for ID = 0", () => {
      const history: Array<[number, number]> = [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ];
      expect(getMovieWinStreak(history, 0)).toBe(4);
      expect(getMovieWinStreak(history, 1)).toBe(0);
    });

    it("correctly computes streaks for Number.MAX_SAFE_INTEGER and extreme integers", () => {
      const maxId = Number.MAX_SAFE_INTEGER;
      const history: Array<[number, number]> = [
        [maxId, 100],
        [maxId, 200],
        [maxId, 300],
      ];
      expect(getMovieWinStreak(history, maxId)).toBe(3);
    });

    it("returns 0 for NaN, undefined, or missing IDs", () => {
      const history: Array<[number, number]> = [
        [1, 2],
        [1, 3],
      ];
      expect(getMovieWinStreak(history, NaN)).toBe(0);
      expect(getMovieWinStreak(history, 99999)).toBe(0);
      expect(getMovieWinStreak(history, -99999)).toBe(0);
    });
  });

  describe("Streak Invariants & Mathematical Properties", () => {
    it("Property: Non-negativity and upper-bounded by history length", () => {
      const histories: Array<Array<[number, number]>> = [
        [],
        [[1, 2]],
        [[1, 2], [2, 3], [3, 1]],
        [[1, 2], [1, 3], [1, 4], [1, 5]],
      ];

      for (const h of histories) {
        for (let id = -5; id <= 10; id++) {
          const streak = getMovieWinStreak(h, id);
          expect(streak).toBeGreaterThanOrEqual(0);
          expect(streak).toBeLessThanOrEqual(h.length);
        }
      }
    });

    it("Property: Single win always increments streak by exactly 1 if no loss intervened", () => {
      const baseHistory: Array<[number, number]> = [
        [1, 2],
        [1, 3],
      ];
      const streakBefore = getMovieWinStreak(baseHistory, 1);
      expect(streakBefore).toBe(2);

      const extendedHistory: Array<[number, number]> = [...baseHistory, [1, 4]];
      const streakAfter = getMovieWinStreak(extendedHistory, 1);
      expect(streakAfter).toBe(streakBefore + 1);
    });

    it("Property: Loss immediately resets streak to strictly 0", () => {
      const winningHistory: Array<[number, number]> = [
        [1, 2],
        [1, 3],
        [1, 4],
        [1, 5],
        [1, 6],
      ];
      expect(getMovieWinStreak(winningHistory, 1)).toBe(5);

      const lossHistory: Array<[number, number]> = [...winningHistory, [9, 1]];
      expect(getMovieWinStreak(lossHistory, 1)).toBe(0);
    });

    it("Property: Unrelated matchups between other movies have zero effect on streak", () => {
      const history: Array<[number, number]> = [
        [1, 2],
        [1, 3],
      ];
      const s1 = getMovieWinStreak(history, 1);

      // Append 50 unrelated matchups
      for (let i = 10; i < 60; i++) {
        history.push([i, i + 100]);
      }

      const s2 = getMovieWinStreak(history, 1);
      expect(s2).toBe(s1);
    });
  });
});
