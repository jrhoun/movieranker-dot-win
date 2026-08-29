import { describe, expect, it } from "vitest";
import { isWorthCelebrating, summariseCompletion } from "./completion";

const snap = (xp: number, stats: Partial<Parameters<typeof summariseCompletion>[0]["stats"]> = {}) => ({
  xp,
  stats: { doneLists: 0, moviesRanked: 0, ...stats },
});

describe("summariseCompletion", () => {
  it("reports the XP this ranking contributed", () => {
    const s = summariseCompletion(snap(0), snap(12, { doneLists: 1, moviesRanked: 12 }));
    expect(s.xpEarned).toBe(12);
    expect(s.totalXp).toBe(12);
  });

  it("names the achievement the ranking just unlocked, and only that one", () => {
    // first_premiere fires at one finished list. Nothing else should come with it.
    const s = summariseCompletion(
      snap(0),
      snap(10, { doneLists: 1, moviesRanked: 10 }),
    );
    expect(s.newAchievements.map((a) => a.key)).toEqual(["first_premiere"]);
  });

  it("does not re-announce an achievement that was already held", () => {
    // The whole point of diffing rather than listing what is unlocked: a second
    // ranking must not celebrate the badge the first one earned.
    const s = summariseCompletion(
      snap(10, { doneLists: 1, moviesRanked: 10 }),
      snap(20, { doneLists: 2, moviesRanked: 20 }),
    );
    expect(s.newAchievements.map((a) => a.key)).not.toContain("first_premiere");
  });

  it("reports a level-up only when the level actually changed", () => {
    const up = summariseCompletion(snap(0), snap(10, { doneLists: 1, moviesRanked: 10 }));
    expect(up.leveledUp).toBe(true);
    expect(up.level).toBeGreaterThan(up.previousLevel);

    const flat = summariseCompletion(
      snap(10, { doneLists: 1, moviesRanked: 10 }),
      snap(11, { doneLists: 2, moviesRanked: 11 }),
    );
    expect(flat.leveledUp).toBe(false);
  });

  it("carries a career rank and progress toward the next level", () => {
    const s = summariseCompletion(snap(0), snap(12, { doneLists: 1, moviesRanked: 12 }));
    expect(s.rank).toBeTruthy();
    expect(s.progress01).toBeGreaterThanOrEqual(0);
    expect(s.progress01).toBeLessThanOrEqual(1);
  });

  it("never reports negative XP if a list disappeared between reads", () => {
    const s = summariseCompletion(
      snap(30, { doneLists: 3, moviesRanked: 30 }),
      snap(20, { doneLists: 2, moviesRanked: 20 }),
    );
    expect(s.xpEarned).toBe(0);
  });
});

describe("isWorthCelebrating", () => {
  it("is false when nothing changed", () => {
    const s = summariseCompletion(
      snap(20, { doneLists: 2, moviesRanked: 20 }),
      snap(20, { doneLists: 2, moviesRanked: 20 }),
    );
    expect(isWorthCelebrating(s)).toBe(false);
  });

  it("is true when the ranking earned anything at all", () => {
    const s = summariseCompletion(snap(0), snap(8, { doneLists: 1, moviesRanked: 8 }));
    expect(isWorthCelebrating(s)).toBe(true);
  });
});
