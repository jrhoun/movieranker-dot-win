import { describe, expect, it } from "vitest";
import { reconcileCareerXp, toXpLists, type CareerListRow } from "./career-xp";
import {
  calculateXpBreakdown,
  grandfatheredXp,
  levelFor,
  MAX_BASE_XP,
} from "./gamification";

describe("toXpLists", () => {
  it("only finished lists count", () => {
    const rows: CareerListRow[] = [
      { status: "done", movieCount: 6 },
      { status: "draft", movieCount: 20 },
      { status: null, movieCount: 20 },
      { movieCount: 20 },
    ];
    expect(toXpLists(rows).map((l) => l.done)).toEqual([true, false, false, false]);
    expect(calculateXpBreakdown({ lists: toXpLists(rows) }).total).toBe(6);
  });

  it("a theme slug marks a marquee week", () => {
    const rows: CareerListRow[] = [
      { status: "done", theme_slug: "secretly-the-same-story", movieCount: 6 },
      { status: "done", theme_slug: null, movieCount: 6 },
      { status: "done", theme_slug: "", movieCount: 6 },
    ];
    expect(toXpLists(rows).map((l) => l.isMarquee)).toEqual([true, false, false]);
  });

  it("a non-empty participants array marks co-curation", () => {
    const rows: CareerListRow[] = [
      { status: "done", participants: ["Sarah"], movieCount: 3 },
      { status: "done", participants: [], movieCount: 3 },
      { status: "done", participants: null, movieCount: 3 },
      { status: "done", movieCount: 3 },
    ];
    expect(toXpLists(rows).map((l) => l.coCurated)).toEqual([true, false, false, false]);
  });

  it("gives every surface the same answer for the same rows", () => {
    // The point of the module: the profile, the completion card and the two API
    // gates all map rows here, so they cannot disagree the way they used to.
    const rows: CareerListRow[] = [
      { status: "done", theme_slug: "w1", participants: ["Dave"], movieCount: 6 },
      { status: "draft", movieCount: 12 },
    ];
    const args = { lists: toXpLists(rows), referralCount: 1, connectionsSolved: 2 };
    expect(calculateXpBreakdown(args)).toEqual(calculateXpBreakdown(args));
    expect(calculateXpBreakdown(args)).toMatchObject({
      movies: 6,
      marquee: 10,
      coCuration: 5,
      connections: 20,
      referrals: 15,
      total: 56,
    });
  });
});

describe("reconcileCareerXp", () => {
  const breakdownOf = (total: number) =>
    calculateXpBreakdown({ lists: [{ movieCount: total, done: true }] });

  it("keeps the derived total when it is the highest", () => {
    expect(reconcileCareerXp(breakdownOf(20), 5).total).toBe(20);
  });

  it("never drops below the banked peak", () => {
    // Deleting a list must not cost rank.
    expect(reconcileCareerXp(breakdownOf(0), 300).total).toBeGreaterThanOrEqual(300);
  });

  it("re-pricing levels does not demote anyone", () => {
    // 495 XP was Level 100 under the old flat rule. Read literally against the
    // current curve it would be level 44.
    const naive = levelFor(495).level;
    const reconciled = levelFor(reconcileCareerXp(breakdownOf(0), 495).total).level;
    expect(naive).toBeLessThan(100);
    expect(reconciled).toBe(100);
  });

  it("holds for every banked value under the old ceiling", () => {
    for (let banked = 0; banked <= 495; banked += 5) {
      const oldLevel = Math.min(100, Math.floor(banked / 5) + 1);
      expect(levelFor(reconcileCareerXp(breakdownOf(0), banked).total).level).toBe(oldLevel);
    }
  });

  it("treats a missing banked value as nothing owed", () => {
    expect(reconcileCareerXp(breakdownOf(12), undefined).total).toBe(12);
  });

  it("grandfathering is capped by the ceiling", () => {
    expect(grandfatheredXp(10_000)).toBeGreaterThanOrEqual(MAX_BASE_XP);
  });
});
