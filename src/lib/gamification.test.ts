import { describe, expect, test } from "vitest";
import {
  ACHIEVEMENTS,
  CO_CURATION_XP,
  CONNECTION_SOLVE_XP,
  LEGACY_XP_PER_LEVEL,
  LEVELS,
  MARQUEE_COMPLETION_XP,
  MAX_BASE_XP,
  MAX_LEVEL,
  MAX_XP_PER_LIST,
  MIN_PIN_LIST_LEVEL,
  MIN_PROPOSAL_LEVEL,
  REFERRAL_XP_BONUS,
  UNLOCKS,
  calculateTotalXp,
  calculateXpBreakdown,
  countMoviesRanked,
  evaluateAchievements,
  grandfatheredXp,
  levelCost,
  levelFor,
  movieXp,
  nameplateTier,
  unlockedAt,
  xpForLevel,
  xpProgress,
} from "./gamification";

const done = (movieCount: number, extra: Record<string, unknown> = {}) => ({
  movieCount,
  done: true,
  ...extra,
});

describe("the curve", () => {
  test("levels get more expensive every ten levels", () => {
    expect(levelCost(1)).toBe(10);
    expect(levelCost(9)).toBe(10);
    expect(levelCost(10)).toBe(13);
    expect(levelCost(50)).toBe(25);
    expect(levelCost(99)).toBe(37);
  });

  test("the ceiling costs 2340 XP, not the old 495", () => {
    expect(MAX_BASE_XP).toBe(2340);
    expect(xpForLevel(MAX_LEVEL)).toBe(2340);
  });

  test("cumulative thresholds match the per-level costs", () => {
    let running = 0;
    for (let level = 1; level < MAX_LEVEL; level += 1) {
      expect(xpForLevel(level)).toBe(running);
      running += levelCost(level);
    }
  });

  test("catalog has 100 ascending levels with no duplicate thresholds", () => {
    expect(LEVELS).toHaveLength(100);
    const xps = LEVELS.map((l) => l.xp);
    expect([...xps].sort((a, b) => a - b)).toEqual(xps);
    expect(new Set(xps).size).toBe(xps.length);
  });

  test("one list is a nudge up the ladder, not five rungs", () => {
    // A single twenty-film list used to jump you 1 -> 5 and was 4% of the whole
    // climb. It should still feel good and still be a rounding error.
    const oneBigList = calculateTotalXp({ lists: [done(20)] });
    expect(levelFor(oneBigList).level).toBe(3);
    expect(oneBigList / MAX_BASE_XP).toBeLessThan(0.01);
  });

  test("Cinema Legend is a year of use, not a weekend", () => {
    const twentyFiveMaxLists = calculateTotalXp({
      lists: Array.from({ length: 25 }, () => done(20)),
    });
    // This exact shelf used to be Level 100.
    expect(levelFor(twentyFiveMaxLists).level).toBeLessThan(50);
  });

  test("a year of weekly Marquee outranks pure recruiting", () => {
    // The old curve let 33 referrals reach Cinema Legend while 52 weeks of
    // actually playing reached level 63.
    const playedAYear = calculateTotalXp({
      lists: Array.from({ length: 52 }, () => done(6, { isMarquee: true })),
      connectionsSolved: 52,
    });
    const recruitedThirtyThree = calculateTotalXp({ lists: [], referralCount: 33 });
    expect(levelFor(playedAYear).level).toBeGreaterThan(levelFor(recruitedThirtyThree).level);
  });
});

describe("levelFor", () => {
  test("threshold boundaries", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, title: "Theater Usher" });
    expect(levelFor(9).level).toBe(1);
    expect(levelFor(10).level).toBe(2);
    expect(levelFor(89).level).toBe(9);
    expect(levelFor(90)).toMatchObject({ level: 10, title: "Theater Usher" });
    expect(levelFor(103)).toMatchObject({ level: 11, title: "Film Buff" });
    expect(levelFor(220)).toMatchObject({ level: 20, title: "Film Buff" });
    expect(levelFor(236)).toMatchObject({ level: 21, title: "Cinephile" });
    expect(levelFor(MAX_BASE_XP)).toMatchObject({ level: 100, title: "Cinema Legend" });
  });

  test("prestige beyond max level", () => {
    expect(levelFor(MAX_BASE_XP)).toMatchObject({ level: 100, prestige: 0 });
    expect(levelFor(MAX_BASE_XP + 250)).toMatchObject({ level: 100, prestige: 1 });
    expect(levelFor(MAX_BASE_XP + 500)).toMatchObject({ level: 100, prestige: 2 });
  });

  test("negative XP clamps to level 1", () => {
    expect(levelFor(-10).level).toBe(1);
  });

  test("every level in the catalog round-trips through levelFor", () => {
    for (const l of LEVELS) {
      expect(levelFor(l.xp).level).toBe(l.level);
    }
  });
});

describe("xpProgress", () => {
  test("fraction spans the actual cost of the current level", () => {
    // Level 1 -> 2 costs 10, so 5 XP is half way.
    expect(xpProgress(5)).toMatchObject({ level: 1, next: { level: 2, xp: 10 }, progress01: 0.5 });
    // Late levels cost more, and the bar must stretch over the real span rather
    // than a fixed five. Derived, so this asserts the relationship and not my
    // arithmetic.
    const base = xpForLevel(90);
    const cost = levelCost(90);
    expect(cost).toBeGreaterThan(levelCost(1));
    const late = xpProgress(base + cost / 2);
    expect(late.level).toBe(90);
    expect(late.next).toEqual({ level: 91, xp: base + cost });
    expect(late.progress01).toBeCloseTo(0.5);
  });

  test("prestige progress past the ceiling", () => {
    const p = xpProgress(MAX_BASE_XP + 125);
    expect(p.level).toBe(100);
    expect(p.prestige).toBe(0);
    expect(p.next).toEqual({ level: 100, xp: MAX_BASE_XP + 250 });
    expect(p.progress01).toBeCloseTo(0.5);
  });

  test("progress clamps into [0,1]", () => {
    expect(xpProgress(-5).progress01).toBe(0);
    for (const xp of [0, 7, 90, 500, MAX_BASE_XP, MAX_BASE_XP + 10]) {
      const p = xpProgress(xp);
      expect(p.progress01).toBeGreaterThanOrEqual(0);
      expect(p.progress01).toBeLessThanOrEqual(1);
    }
  });
});

describe("grandfathering the curve change", () => {
  test("XP banked under the flat rule keeps the level it bought", () => {
    for (const bankedXp of [0, 5, 20, 75, 200, 495]) {
      const oldLevel = Math.min(MAX_LEVEL, Math.floor(bankedXp / LEGACY_XP_PER_LEVEL) + 1);
      expect(levelFor(grandfatheredXp(bankedXp)).level).toBe(oldLevel);
    }
  });

  test("the old ceiling still reads as the new ceiling", () => {
    expect(grandfatheredXp(495)).toBe(MAX_BASE_XP);
  });

  test("never returns less than what was banked", () => {
    for (const xp of [0, 1, 999, 5000]) {
      expect(grandfatheredXp(xp)).toBeGreaterThanOrEqual(xp);
    }
  });
});

describe("XP sources", () => {
  test("draft lists earn nothing", () => {
    // The regression: XP counted movies merely ADDED to a list, so dumping
    // twenty films into a draft and never ranking them paid four levels.
    const draftsOnly = calculateXpBreakdown({
      lists: [
        { movieCount: 20, done: false },
        { movieCount: 20, done: false, isMarquee: true, coCurated: true },
      ],
    });
    expect(draftsOnly.total).toBe(0);
  });

  test("pays exactly the prices the guide quotes", () => {
    const b = calculateXpBreakdown({
      lists: [done(6, { isMarquee: true, coCurated: true })],
      referralCount: 1,
      connectionsSolved: 1,
    });
    expect(b).toEqual({
      movies: 6,
      marquee: MARQUEE_COMPLETION_XP,
      coCuration: CO_CURATION_XP,
      connections: CONNECTION_SOLVE_XP,
      referrals: REFERRAL_XP_BONUS,
      total: 6 + MARQUEE_COMPLETION_XP + CO_CURATION_XP + CONNECTION_SOLVE_XP + REFERRAL_XP_BONUS,
    });
  });

  test("the breakdown always sums to the total", () => {
    const b = calculateXpBreakdown({
      lists: [done(30), done(4, { isMarquee: true }), { movieCount: 9, done: false }],
      referralCount: 3,
      connectionsSolved: 2,
    });
    expect(b.movies + b.marquee + b.coCuration + b.connections + b.referrals).toBe(b.total);
  });

  test("solving a connection is worth XP, not just a badge", () => {
    // The explainer promised "bonus XP toward your career rank" and paid zero.
    expect(calculateTotalXp({ lists: [], connectionsSolved: 1 })).toBe(CONNECTION_SOLVE_XP);
  });

  test("the per-list cap bounds movies, not the completion bonuses", () => {
    const huge = calculateXpBreakdown({
      lists: [done(500, { isMarquee: true, coCurated: true })],
    });
    expect(huge.movies).toBe(MAX_XP_PER_LIST);
    expect(huge.total).toBe(MAX_XP_PER_LIST + MARQUEE_COMPLETION_XP + CO_CURATION_XP);
  });

  test("movieXp caps per list; countMoviesRanked reports the truth", () => {
    const lists = [done(500), done(10), { movieCount: 40, done: false }];
    expect(movieXp(lists)).toBe(MAX_XP_PER_LIST + 10);
    expect(countMoviesRanked(lists)).toBe(510);
  });

  test("an empty shelf is zero", () => {
    expect(calculateTotalXp({ lists: [] })).toBe(0);
    expect(countMoviesRanked([])).toBe(0);
  });

  test("negative counts cannot drain XP", () => {
    expect(
      calculateTotalXp({
        lists: [{ movieCount: -50, done: true }],
        referralCount: -3,
        connectionsSolved: -2,
      }),
    ).toBe(0);
  });
});

describe("unlocks", () => {
  test("every unlock states a real effect", () => {
    for (const u of UNLOCKS) {
      expect(u.effect.trim().length).toBeGreaterThan(0);
      expect(u.atLevel).toBeGreaterThan(0);
    }
  });

  test("the two ability unlocks match the levels the code actually enforces", () => {
    const abilities = UNLOCKS.filter((u) => u.kind === "ability").map((u) => u.atLevel);
    expect(abilities).toEqual([MIN_PIN_LIST_LEVEL, MIN_PROPOSAL_LEVEL]);
  });

  test("nameplate tiers rise with level and never exceed the tier count", () => {
    const tiers = UNLOCKS.filter((u) => u.kind === "nameplate").length;
    expect(nameplateTier(1)).toBe(0);
    expect(nameplateTier(24)).toBe(0);
    expect(nameplateTier(25)).toBe(1);
    expect(nameplateTier(50)).toBe(2);
    expect(nameplateTier(75)).toBe(3);
    expect(nameplateTier(100)).toBe(tiers);
    let previous = 0;
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const t = nameplateTier(level);
      expect(t).toBeGreaterThanOrEqual(previous);
      expect(t).toBeLessThanOrEqual(tiers);
      previous = t;
    }
  });

  test("splits by whether the level has reached them", () => {
    expect(unlockedAt(1).unlocked).toEqual([]);
    expect(unlockedAt(1).locked).toHaveLength(UNLOCKS.length);
    expect(unlockedAt(25).unlocked.map((u) => u.atLevel)).toEqual([10, 20, 25]);
    expect(unlockedAt(100).locked).toEqual([]);
  });
});

describe("achievements", () => {
  const base = { doneLists: 0, moviesRanked: 0 };

  test("thresholds unlock exactly at the boundary", () => {
    const cases: [string, Parameters<typeof evaluateAchievements>[0]][] = [
      ["first_premiere", { ...base, doneLists: 1 }],
      ["the_full_picture", { ...base, doneLists: 5 }],
      ["marathoner", { ...base, doneLists: 10 }],
      ["final_cut", { ...base, doneLists: 25 }],
      ["master_curator", { ...base, doneLists: 50 }],
      ["centurion", { ...base, moviesRanked: 100 }],
      ["heavyweight", { ...base, maxMoviesInSingleList: 12 }],
      ["double_feature", { ...base, coCuratedLists: 1 }],
      ["codebreaker", { ...base, marqueeConnectionsSolved: 1 }],
      ["season_ticket", { ...base, marqueeWeeks: 12 }],
      ["cryptologist", { ...base, marqueeConnectionsSolved: 5 }],
      ["the_long_take", { ...base, maxMoviesInSingleList: 24 }],
      ["the_programmer", { ...base, marqueeWeeks: 52 }],
      ["marquee_pioneer", { ...base, firstToMarquee: true }],
      ["front_row_10", { ...base, top10Marquee: true }],
      ["century_marquee", { ...base, top100Marquee: true }],
    ];
    for (const [key, stats] of cases) {
      const hit = evaluateAchievements(stats).find((a) => a.key === key);
      expect(hit, `${key} should unlock at its stated threshold`).toMatchObject({ unlocked: true });
    }
  });

  test("nothing unlocks just below every threshold", () => {
    const result = evaluateAchievements({
      doneLists: 0,
      moviesRanked: 99,
      maxMoviesInSingleList: 11,
      coCuratedLists: 0,
      marqueeWeeks: 11,
      marqueeConnectionsSolved: 0,
    });
    expect(result.every((a) => !a.unlocked)).toBe(true);
  });

  test("Centurion counts films, and cannot be bought with referrals", () => {
    // It used to read total XP, so seven invites unlocked "ranked 100 movies".
    const sevenReferrals = calculateTotalXp({ lists: [], referralCount: 7 });
    expect(sevenReferrals).toBeGreaterThan(100);
    const stats = { doneLists: 0, moviesRanked: countMoviesRanked([]) };
    expect(evaluateAchievements(stats).find((a) => a.key === "centurion")?.unlocked).toBe(false);
  });

  test("keys are unique and descriptions do not promise unchecked conditions", () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const a of ACHIEVEMENTS) {
      // "Completed 5 full rankings with 100% consensus" only ever checked the
      // count; consensus was never part of it.
      expect(a.description.toLowerCase()).not.toContain("consensus");
      expect(a.description.trim()).not.toMatch(/\.$/);
    }
  });

  test("the challenge tier rewards difficulty, never speed", () => {
    const challenges = ACHIEVEMENTS.filter((a) => a.challenge);
    expect(challenges.length).toBeGreaterThanOrEqual(3);
    for (const a of challenges) {
      // Speed-based standing must not gate a challenge achievement.
      expect(a.check({ doneLists: 0, moviesRanked: 0, firstToMarquee: true })).toBe(false);
    }
  });
});
