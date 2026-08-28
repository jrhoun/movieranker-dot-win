import { describe, expect, test } from "vitest";
import {
  calculateTotalXp,
  LEVELS,
  MAX_XP_PER_LIST,
  UNLOCKS,
  evaluateAchievements,
  levelFor,
  totalMoviesRanked,
  unlockedAt,
  xpProgress,
} from "./gamification";

describe("levelFor", () => {
  test("threshold boundaries across career ranks and sub-levels", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, title: "Theater Usher" });
    expect(levelFor(4).level).toBe(1);
    expect(levelFor(5).level).toBe(2);
    expect(levelFor(40)).toMatchObject({ level: 9, title: "Theater Usher" });
    expect(levelFor(45)).toMatchObject({ level: 10, title: "Theater Usher" });
    expect(levelFor(50)).toMatchObject({ level: 11, title: "Film Buff" });
    expect(levelFor(100)).toMatchObject({ level: 21, title: "Cinephile" });
    expect(levelFor(150)).toMatchObject({ level: 31, title: "Projectionist" });
    expect(levelFor(200)).toMatchObject({ level: 41, title: "Film Critic" });
    expect(levelFor(250)).toMatchObject({ level: 51, title: "Festival Programmer" });
    expect(levelFor(300)).toMatchObject({ level: 61, title: "Screenwriter" });
    expect(levelFor(350)).toMatchObject({ level: 71, title: "Director" });
    expect(levelFor(400)).toMatchObject({ level: 81, title: "Executive Producer" });
    expect(levelFor(450)).toMatchObject({ level: 91, title: "Cinema Legend" });
    expect(levelFor(495)).toMatchObject({ level: 100, title: "Cinema Legend" });
  });

  test("prestige beyond max level 100", () => {
    expect(levelFor(495)).toMatchObject({ level: 100, title: "Cinema Legend", prestige: 0 });
    // 495 + 100 = 595 is Level 100, Prestige 1
    expect(levelFor(595)).toMatchObject({ level: 100, title: "Cinema Legend", prestige: 1 });
    // 495 + 200 = 695 is Level 100, Prestige 2
    expect(levelFor(695)).toMatchObject({ level: 100, title: "Cinema Legend", prestige: 2 });
  });

  test("negative XP clamps to level 1", () => {
    expect(levelFor(-10).level).toBe(1);
  });

  test("catalog has 100 ascending levels with no duplicate thresholds", () => {
    expect(LEVELS).toHaveLength(100);
    const xps = LEVELS.map((l) => l.xp);
    expect([...xps].sort((a, b) => a - b)).toEqual(xps);
    expect(new Set(xps).size).toBe(xps.length);
  });
});

describe("xpProgress", () => {
  test("mid-level progress fraction within sub-level", () => {
    // Level 3 (10 XP) -> Level 4 (15 XP). At 12 XP = 2/5 = 40%
    expect(xpProgress(12)).toEqual({
      level: 3,
      title: "Theater Usher",
      prestige: 0,
      current: 12,
      next: { level: 4, xp: 15 },
      progress01: 0.4,
    });
  });

  test("prestige progress tracking past max level 100", () => {
    const p = xpProgress(545); // 495 base + 50 (halfway to 595)
    expect(p.level).toBe(100);
    expect(p.prestige).toBe(0);
    expect(p.next).toEqual({ level: 100, xp: 595 });
    expect(p.progress01).toBeCloseTo(0.5);
  });

  test("progress clamps into [0,1]", () => {
    expect(xpProgress(-5).progress01).toBe(0);
  });
});

describe("unlockedAt", () => {
  test("level 1 has nothing unlocked, all locked", () => {
    const { unlocked, locked } = unlockedAt(1);
    expect(unlocked).toEqual([]);
    expect(locked.map((u) => u.name)).toHaveLength(UNLOCKS.length);
  });

  test("level 25 unlocks early tiers", () => {
    const { unlocked, locked } = unlockedAt(25);
    expect(unlocked.map((u) => u.atLevel)).toEqual([10, 20, 25]);
    expect(locked.map((u) => u.atLevel)).toEqual([50, 75, 90, 100]);
  });

  test("max level 100 unlocks everything", () => {
    const { locked } = unlockedAt(100);
    expect(locked).toEqual([]);
  });
});

describe("evaluateAchievements", () => {
  test("exactly-at-threshold counts unlock", () => {
    for (const stats of [
      { doneLists: 1, moviesRanked: 0 }, // first_premiere boundary
      { doneLists: 5, moviesRanked: 0 }, // the_full_picture boundary
      { doneLists: 10, moviesRanked: 0 }, // marathoner boundary
      { doneLists: 25, moviesRanked: 0 }, // final_cut boundary
      { doneLists: 0, moviesRanked: 100 }, // centurion boundary
      { doneLists: 50, moviesRanked: 0 }, // master_curator boundary
      { doneLists: 1, moviesRanked: 5, firstToMarquee: true }, // marquee_pioneer
      { doneLists: 1, moviesRanked: 5, top10Marquee: true }, // front_row_10
      { doneLists: 1, moviesRanked: 5, marqueeConnectionsSolved: 1 }, // codebreaker
      { doneLists: 1, moviesRanked: 5, top100Marquee: true }, // century_marquee
      { doneLists: 1, moviesRanked: 12, maxMoviesInSingleList: 12 }, // heavyweight
      { doneLists: 1, moviesRanked: 5, coCuratedLists: 1 }, // double_feature
    ]) {
      const result = Object.fromEntries(
        evaluateAchievements(stats).map((a) => [a.key, a.unlocked]),
      );
      expect(Object.values(result).some(Boolean)).toBe(true);
      expect(result).toMatchObject({
        first_premiere: stats.doneLists >= 1,
        codebreaker: (stats.marqueeConnectionsSolved ?? 0) >= 1,
        the_full_picture: stats.doneLists >= 5,
        double_feature: (stats.coCuratedLists ?? 0) >= 1,
        marathoner: stats.doneLists >= 10,
        heavyweight: (stats.maxMoviesInSingleList ?? 0) >= 12,
        final_cut: stats.doneLists >= 25,
        centurion: stats.moviesRanked >= 100,
        master_curator: stats.doneLists >= 50,
        marquee_pioneer: !!stats.firstToMarquee,
        front_row_10: !!stats.top10Marquee,
        century_marquee: !!stats.top100Marquee,
      });
    }
  });

  test("just below threshold stays locked", () => {
    const result = evaluateAchievements({
      doneLists: 0,
      moviesRanked: 99,
      maxMoviesInSingleList: 11,
      coCuratedLists: 0,
      marqueeConnectionsSolved: 0,
    });
    expect(result.every((a) => !a.unlocked)).toBe(true);
  });
});

describe("totalMoviesRanked & anti-gaming caps", () => {
  test("sums movie counts across lists within per-list limit", () => {
    expect(totalMoviesRanked([{ movieCount: 8 }, { movieCount: 6 }, { movieCount: 0 }])).toBe(14);
  });

  test("caps individual lists exceeding MAX_XP_PER_LIST", () => {
    // 500-movie spam list should only give MAX_XP_PER_LIST (20)
    expect(totalMoviesRanked([{ movieCount: 500 }, { movieCount: 10 }])).toBe(MAX_XP_PER_LIST + 10);
  });

  test("empty shelf is zero XP", () => {
    expect(totalMoviesRanked([])).toBe(0);
  });
});

describe("calculateTotalXp", () => {
  test("combines movie XP and referral bonuses", () => {
    expect(calculateTotalXp({ lists: [{ movieCount: 10 }], referralCount: 2 })).toBe(10 + 2 * 15);
  });
});
