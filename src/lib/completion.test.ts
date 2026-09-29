import { describe, expect, it } from "vitest";
import { isWorthCelebrating, summariseCompletion } from "./completion";
import { itemsForSlot } from "./cosmetics/catalogue";
import { SLOT_LABEL } from "./cosmetics/categories";
import { EARNED_TAGLINES } from "./cosmetics/taglines";
import { MIN_PIN_LIST_LEVEL, UNLOCKS, xpForLevel } from "./gamification";

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

describe("summariseCompletion: Beta Test Screener", () => {
  it("announces Beta Test Screener when this list is the first public one", () => {
    const s = summariseCompletion(
      snap(0, { doneLists: 0, publicDoneLists: 0, hasHandle: true, isSignedIn: true }),
      snap(10, {
        doneLists: 1,
        moviesRanked: 10,
        publicDoneLists: 1,
        hasHandle: true,
        isSignedIn: true,
      }),
    );
    expect(s.newAchievements.map((a) => a.key)).toContain("beta_pioneer");
  });

  it("stays quiet about Beta Test Screener without a handle", () => {
    const s = summariseCompletion(
      snap(0, { publicDoneLists: 0, hasHandle: false, isSignedIn: true }),
      snap(10, {
        doneLists: 1,
        moviesRanked: 10,
        publicDoneLists: 1,
        hasHandle: false,
        isSignedIn: true,
      }),
    );
    expect(s.newAchievements.map((a) => a.key)).not.toContain("beta_pioneer");
  });
});

describe("summariseCompletion: levels and cosmetics", () => {
  const owned = (...ids: string[]) => new Set(ids);
  const frame = itemsForSlot("frame")[0];
  const overlay = itemsForSlot("overlay").find((o) => o.name !== "None")!;
  const earnedTagline = EARNED_TAGLINES.find(
    (t) => t.unlock.kind === "challenge" && t.unlock.key === "centurion",
  )!;

  it("reports newly owned cosmetics grouped by slot", () => {
    const s = summariseCompletion(
      { ...snap(10, { doneLists: 1, moviesRanked: 10 }), owned: owned(frame.id) },
      { ...snap(20, { doneLists: 2, moviesRanked: 20 }), owned: owned(frame.id, overlay.id) },
    );
    expect(s.newCosmetics).toEqual([
      {
        slot: "overlay",
        title: SLOT_LABEL.overlay,
        items: [
          {
            id: overlay.id,
            slot: "overlay",
            name: overlay.name,
            label: overlay.name,
            unlock: overlay.unlock.kind,
          },
        ],
      },
    ]);
  });

  it("resolves an earned tagline's text from the stats that earned it", () => {
    const s = summariseCompletion(
      { ...snap(90, { doneLists: 9, moviesRanked: 90 }), owned: owned() },
      { ...snap(110, { doneLists: 10, moviesRanked: 110 }), owned: owned(earnedTagline.id) },
    );
    const line = s.newCosmetics.find((g) => g.slot === "tagline")?.items[0];
    expect(line?.label).toBe("“110 films ranked. No regrets.”");
  });

  it("reports no cosmetics when either snapshot lacks ownership", () => {
    const withoutBefore = summariseCompletion(snap(0), {
      ...snap(10, { doneLists: 1, moviesRanked: 10 }),
      owned: owned(frame.id),
    });
    expect(withoutBefore.newCosmetics).toEqual([]);
    const withoutAny = summariseCompletion(snap(0), snap(10, { doneLists: 1, moviesRanked: 10 }));
    expect(withoutAny.newCosmetics).toEqual([]);
  });

  it("carries the ability unlock crossed by a level-up", () => {
    const featured = UNLOCKS.find((u) => u.atLevel === MIN_PIN_LIST_LEVEL)!;
    const s = summariseCompletion(
      snap(xpForLevel(MIN_PIN_LIST_LEVEL) - 1, { doneLists: 5, moviesRanked: 50 }),
      snap(xpForLevel(MIN_PIN_LIST_LEVEL), { doneLists: 6, moviesRanked: 60 }),
    );
    expect(s.leveledUp).toBe(true);
    expect(s.levelUnlocks).toEqual([featured]);
  });

  it("carries no level unlocks when the level did not change", () => {
    const s = summariseCompletion(
      snap(10, { doneLists: 1, moviesRanked: 10 }),
      snap(11, { doneLists: 2, moviesRanked: 11 }),
    );
    expect(s.levelUnlocks).toEqual([]);
  });

  it("a new cosmetic alone is worth celebrating", () => {
    const s = summariseCompletion(
      { ...snap(20, { doneLists: 2, moviesRanked: 20 }), owned: owned() },
      { ...snap(20, { doneLists: 2, moviesRanked: 20 }), owned: owned(frame.id) },
    );
    expect(isWorthCelebrating(s)).toBe(true);
  });
});
