import { describe, expect, test } from "vitest";
import {
  ACHIEVEMENTS,
  LEVELS,
  UNLOCKS,
  evaluateAchievements,
  levelFor,
  totalMoviesRanked,
  unlockedAt,
  xpProgress,
} from "./gamification";

describe("levelFor", () => {
  test("threshold boundaries", () => {
    expect(levelFor(0).title).toBe("Usher");
    expect(levelFor(24).title).toBe("Usher");
    expect(levelFor(25).title).toBe("Film Buff");
    expect(levelFor(75).title).toBe("Critic");
    expect(levelFor(200).title).toBe("Projectionist");
    expect(levelFor(500).title).toBe("Commissioner");
  });

  test("beyond max stays at top level", () => {
    expect(levelFor(99999)).toEqual({ level: 5, title: "Commissioner", xp: 500 });
  });

  test("negative XP clamps to level 1", () => {
    expect(levelFor(-10).level).toBe(1);
  });

  test("catalog is ascending with no duplicate thresholds", () => {
    const xps = LEVELS.map((l) => l.xp);
    expect([...xps].sort((a, b) => a - b)).toEqual(xps);
    expect(new Set(xps).size).toBe(xps.length);
  });
});

describe("xpProgress", () => {
  test("mid-level progress fraction", () => {
    // Film Buff (25) -> Critic (75): 50 XP span.
    expect(xpProgress(50)).toEqual({
      level: 2,
      title: "Film Buff",
      current: 50,
      next: { level: 3, xp: 75 },
      progress01: 0.5,
    });
  });

  test("max level: no next, full bar", () => {
    const p = xpProgress(1000);
    expect(p.next).toBeNull();
    expect(p.progress01).toBe(1);
  });

  test("progress clamps into [0,1]", () => {
    expect(xpProgress(-5).progress01).toBe(0);
    expect(xpProgress(60).progress01).toBeCloseTo(0.7);
  });
});

describe("unlockedAt", () => {
  test("level 1 has nothing unlocked, all locked", () => {
    const { unlocked, locked } = unlockedAt(1);
    expect(unlocked).toEqual([]);
    expect(locked.map((u) => u.name)).toHaveLength(UNLOCKS.length);
  });

  test("level 4 unlocks through Projectionist tier only", () => {
    const { unlocked, locked } = unlockedAt(4);
    expect(unlocked.map((u) => u.atLevel)).toEqual([2, 3, 4]);
    expect(locked).toEqual([UNLOCKS[3]]);
  });

  test("max level unlocks everything", () => {
    const { locked } = unlockedAt(5);
    expect(locked).toEqual([]);
  });
});

describe("evaluateAchievements", () => {
  test("exactly-at-threshold counts unlock", () => {
    for (const stats of [
      { doneLists: 1, moviesRanked: 0 }, // first_premiere boundary
      { doneLists: 10, moviesRanked: 0 }, // marathoner boundary
      { doneLists: 0, moviesRanked: 100 }, // centurion boundary
    ]) {
      const result = Object.fromEntries(
        evaluateAchievements(stats).map((a) => [a.key, a.unlocked]),
      );
      expect(Object.values(result).some(Boolean)).toBe(true);
      expect(result).toMatchObject({
        first_premiere: stats.doneLists >= 1,
        marathoner: stats.doneLists >= 10,
        centurion: stats.moviesRanked >= 100,
      });
    }
  });

  test("just below threshold stays locked", () => {
    const result = evaluateAchievements({ doneLists: 0, moviesRanked: 99 });
    expect(result.every((a) => !a.unlocked)).toBe(true);
  });

  test("all locked on empty stats", () => {
    const result = evaluateAchievements({ doneLists: 0, moviesRanked: 0 });
    expect(result.every((a) => !a.unlocked)).toBe(true);
    expect(result.map((a) => a.key)).toEqual(ACHIEVEMENTS.map((a) => a.key));
  });

  test("everything unlocks past all thresholds", () => {
    const result = evaluateAchievements({ doneLists: 10, moviesRanked: 100 });
    expect(result.every((a) => a.unlocked)).toBe(true);
    expect(result[0]).toEqual({
      key: "first_premiere",
      name: "First Premiere",
      description: "Finished your first ranking",
      unlocked: true,
    });
  });
});

describe("totalMoviesRanked", () => {
  test("sums movie counts across lists", () => {
    expect(totalMoviesRanked([{ movieCount: 8 }, { movieCount: 6 }, { movieCount: 0 }])).toBe(14);
  });

  test("empty shelf is zero XP", () => {
    expect(totalMoviesRanked([])).toBe(0);
  });
});
