// src/lib/cosmetics/ownership.test.ts
import { describe, expect, it } from "vitest";
import { CATALOGUE, itemsForSlot } from "./catalogue";
import { canEquip, ownedItemIds, type OwnershipStats } from "./ownership";

const stats = (over: Partial<OwnershipStats> = {}): OwnershipStats => ({
  userId: "user-1",
  level: 1,
  unlockedAchievementKeys: [],
  finishedThemeSlugs: [],
  ...over,
});

describe("ownedItemIds", () => {
  it("a brand-new profile owns every starter and nothing else", () => {
    const owned = ownedItemIds(stats());
    const starters = CATALOGUE.filter((i) => i.unlock.kind === "starter");
    expect(owned.size).toBe(starters.length);
    for (const s of starters) expect(owned.has(s.id)).toBe(true);
  });

  it("grants add a real item without touching anything else, and ignore an id that is gone", () => {
    const withGrant = ownedItemIds(stats(), ["frame.prism", "frame.vhs"]);
    expect(withGrant.has("frame.prism")).toBe(true);
    // frame.vhs left the catalogue on 2026-09-28. A stale grant must not put
    // an unrenderable id into `owned`.
    expect(withGrant.has("frame.vhs")).toBe(false);
    expect(withGrant.size).toBe(ownedItemIds(stats()).size + 1);
  });

  it("level unlocks appear at their threshold and not before", () => {
    const gated = CATALOGUE.find((i) => i.unlock.kind === "level");
    if (!gated || gated.unlock.kind !== "level") throw new Error("no level item to test");
    expect(ownedItemIds(stats({ level: gated.unlock.level - 1 })).has(gated.id)).toBe(false);
    expect(ownedItemIds(stats({ level: gated.unlock.level })).has(gated.id)).toBe(true);
  });

  it("challenge unlocks require the achievement", () => {
    expect(ownedItemIds(stats()).has("frame.prism")).toBe(false);
    expect(
      ownedItemIds(stats({ unlockedAchievementKeys: ["cryptologist"] })).has("frame.prism"),
    ).toBe(true);
  });

  it("unlocks the Beta Test Screener avatar, frame and tagline together when beta_pioneer is met", () => {
    const owned = ownedItemIds({
      userId: "test-user",
      level: 1,
      unlockedAchievementKeys: ["beta_pioneer"],
      finishedThemeSlugs: [],
    });

    expect(owned.has("frame.beta")).toBe(true);
    expect(owned.has("tagline.betamax")).toBe(true);
    expect(owned.has("avatar.gen.beta-reel")).toBe(true);
  });

  it("is monotonic — more level never removes an item", () => {
    let previous = ownedItemIds(stats({ level: 1 }));
    for (let level = 2; level <= 100; level += 1) {
      const now = ownedItemIds(stats({ level }));
      for (const id of previous) expect(now.has(id), `lost ${id} at ${level}`).toBe(true);
      previous = now;
    }
  });

  it("a new profile owns nothing that needs earning", () => {
    // The wardrobe's opening state, pinned by count so a starter creeping in
    // (or a level-gated avatar creeping back) is visible here.
    const owned = ownedItemIds(stats());
    expect(owned.size).toBe(33); // 2 frames, 1 background, 1 overlay, 3 lines, 18 faces, 8 gradients
  });

  it("each finished Marquee yields exactly one drop", () => {
    const one = ownedItemIds(stats({ finishedThemeSlugs: ["w1"] }));
    const two = ownedItemIds(stats({ finishedThemeSlugs: ["w1", "w2"] }));
    expect(two.size).toBe(one.size + 1);
  });

  it("drops never duplicate — the set grows by exactly one per week until the pool runs out", () => {
    // A duplicate draw would make `owned` lag behind the week count. The previous
    // version of this test compared a Set's size to a copy of itself, which could
    // never fail.
    const droppableCount = CATALOGUE.filter((i) => i.unlock.kind === "drop").length;
    const base = ownedItemIds(stats()).size;
    for (let weeks = 1; weeks <= droppableCount + 5; weeks += 1) {
      const slugs = Array.from({ length: weeks }, (_, i) => `w${i}`);
      const size = ownedItemIds(stats({ finishedThemeSlugs: slugs })).size;
      expect(size, `after ${weeks} weeks`).toBe(base + Math.min(weeks, droppableCount));
    }
  });

  it("stops growing once the drop pool is exhausted", () => {
    const many = Array.from({ length: 200 }, (_, i) => `w${i}`);
    const owned = ownedItemIds(stats({ finishedThemeSlugs: many }));
    const droppable = CATALOGUE.filter((i) => i.unlock.kind === "drop");
    for (const d of droppable) expect(owned.has(d.id)).toBe(true);
  });

  it("two users at the same week hold different sets", () => {
    const a = ownedItemIds(stats({ userId: "alice", finishedThemeSlugs: ["w1", "w2"] }));
    const b = ownedItemIds(stats({ userId: "bob", finishedThemeSlugs: ["w1", "w2"] }));
    expect([...a].sort()).not.toEqual([...b].sort());
  });

  it("is deterministic for the same inputs", () => {
    const args = stats({ finishedThemeSlugs: ["w1", "w2", "w3"] });
    expect([...ownedItemIds(args)].sort()).toEqual([...ownedItemIds(args)].sort());
  });

  it("draws the exact same Marquee drops it drew after the 2026-09-28 cut", () => {
    // A PINNED SEQUENCE, AND IT IS SUPPOSED TO BE BRITTLE.
    //
    // `drawFrom` scales its seeded ticket by the pool's TOTAL rarity weight,
    // so adding, removing, reordering or re-rarity-ing ANY droppable item
    // silently re-rolls every past week for every user — an item someone has
    // been shown as owned becomes unowned, and /u/profile (live redraw) starts
    // disagreeing with /u/[handle] (stored snapshot). The whole test suite
    // once stayed green through exactly that change; nothing else in it can
    // see this.
    //
    // These ids were RE-CAPTURED on 2026-09-28, when the catalogue cut removed
    // 24 drop items (four decade tagline sets, one Small Print line, Velvet,
    // Toxic, the two Neons) and re-rolled every draw once, on purpose. The
    // previous capture, at 53fb725, is gone with the pool it described.
    //
    // If this test fails, the catalogue change that broke it is retroactive.
    // Do not re-capture these values to make it pass unless that is a decision
    // someone has deliberately made and accepted the reshuffle for.
    const dropsFor = (userId: string, weeks: string[]) => {
      const owned = ownedItemIds(stats({ userId, finishedThemeSlugs: weeks }));
      const byId = new Map(CATALOGUE.map((i) => [i.id, i]));
      return [...owned].filter((id) => byId.get(id)?.unlock.kind === "drop");
    };
    const weeks = ["w1", "w2", "w3", "w4", "w5"];

    // Ten seeds rather than one, because a pool change does not shift every
    // user: adding a single item left the first two of these untouched while
    // moving most others. One seed is a coin flip; ten is a net.
    const expected: [string, string[]][] = [
      ["regression-user", ["tagline.print.on-location", "tagline.trailer.personal", "tagline.print.aspect-ratio", "tagline.trailer.one-last-job", "overlay.dust"]],
      ["second-user", ["tagline.trailer.unprepared", "tagline.print.no-animals", "tagline.print.on-location", "tagline.trailer.one-last-job", "tagline.trailer.personal"]],
      ["pinned-1", ["tagline.print.aspect-ratio", "tagline.print.no-animals", "overlay.flicker", "tagline.trailer.one-last-job", "tagline.print.fictitious"]],
      ["pinned-2", ["tagline.trailer.never-the-same", "tagline.print.aspect-ratio", "tagline.trailer.unprepared", "overlay.dust", "tagline.trailer.one-last-job"]],
      ["pinned-3", ["tagline.trailer.personal", "tagline.print.no-animals", "tagline.print.on-location", "tagline.trailer.one-last-job", "tagline.print.aspect-ratio"]],
      ["pinned-4", ["overlay.flicker", "tagline.trailer.personal", "tagline.print.no-animals", "tagline.print.aspect-ratio", "tagline.trailer.never-the-same"]],
      ["pinned-5", ["tagline.trailer.personal", "tagline.trailer.one-last-job", "tagline.print.no-animals", "tagline.trailer.unprepared", "tagline.print.on-location"]],
      ["pinned-6", ["tagline.trailer.unprepared", "tagline.trailer.one-last-job", "tagline.trailer.personal", "tagline.print.on-location", "tagline.trailer.never-the-same"]],
      ["pinned-7", ["overlay.dust", "tagline.trailer.one-last-job", "tagline.trailer.personal", "overlay.flicker", "tagline.trailer.unprepared"]],
      ["pinned-8", ["tagline.trailer.one-last-job", "tagline.print.on-location", "tagline.trailer.personal", "tagline.print.no-animals", "tagline.print.aspect-ratio"]],
    ];

    for (const [userId, picks] of expected) {
      expect(dropsFor(userId, weeks), userId).toEqual(picks);
    }
  });

  it("adds claimed poster avatars to owned set without perturbing the drop sequence", () => {
    const withoutClaims = ownedItemIds(stats({ finishedThemeSlugs: ["w1", "w2", "w3"] }));
    const withClaims = ownedItemIds(
      stats({ finishedThemeSlugs: ["w1", "w2", "w3"], avatarClaims: [155, 680] }),
    );

    expect(withClaims.has("avatar.poster.155")).toBe(true);
    expect(withClaims.has("avatar.poster.680")).toBe(true);
    expect(withoutClaims.has("avatar.poster.155")).toBe(false);

    // Drop sequence invariant: the non-claim items in both sets must be strictly identical
    const withClaimsNonPoster = [...withClaims].filter((id) => !id.startsWith("avatar.poster."));
    expect(withClaimsNonPoster.sort()).toEqual([...withoutClaims].sort());
  });
});

describe("canEquip", () => {
  it("permits an owned id and refuses an unowned or unknown one", () => {
    const owned = ownedItemIds(stats({ avatarClaims: [155] }));
    const starter = itemsForSlot("frame").find((i) => i.unlock.kind === "starter")!;
    expect(canEquip(starter.id, owned)).toBe(true);
    expect(canEquip("frame.prism", owned)).toBe(false);
    expect(canEquip("frame.not-a-real-id", owned)).toBe(false);
    expect(canEquip("avatar.poster.155", owned)).toBe(true);
    expect(canEquip("avatar.poster.999", owned)).toBe(false);
  });
});
