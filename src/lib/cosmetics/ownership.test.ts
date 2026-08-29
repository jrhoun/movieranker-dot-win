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

  it("purchase items are never derived while grants are empty", () => {
    const owned = ownedItemIds(stats({ level: 100, unlockedAchievementKeys: ["cryptologist"] }));
    for (const item of CATALOGUE.filter((i) => i.unlock.kind === "purchase")) {
      expect(owned.has(item.id), `${item.id} was derived`).toBe(false);
    }
  });

  it("grants add purchased items without touching anything else", () => {
    const withGrant = ownedItemIds(stats(), ["frame.vhs"]);
    expect(withGrant.has("frame.vhs")).toBe(true);
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

  it("is monotonic — more level never removes an item", () => {
    let previous = ownedItemIds(stats({ level: 1 }));
    for (let level = 2; level <= 100; level += 1) {
      const now = ownedItemIds(stats({ level }));
      for (const id of previous) expect(now.has(id), `lost ${id} at ${level}`).toBe(true);
      previous = now;
    }
  });

  it("each finished Marquee yields exactly one drop", () => {
    const one = ownedItemIds(stats({ finishedThemeSlugs: ["w1"] }));
    const two = ownedItemIds(stats({ finishedThemeSlugs: ["w1", "w2"] }));
    expect(two.size).toBe(one.size + 1);
  });

  it("drops never duplicate", () => {
    const weeks = Array.from({ length: 40 }, (_, i) => `w${i}`);
    const owned = ownedItemIds(stats({ finishedThemeSlugs: weeks }));
    expect(owned.size).toBe(new Set(owned).size);
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
});

describe("canEquip", () => {
  it("permits an owned id and refuses an unowned or unknown one", () => {
    const owned = ownedItemIds(stats());
    const starter = itemsForSlot("frame").find((i) => i.unlock.kind === "starter")!;
    expect(canEquip(starter.id, owned)).toBe(true);
    expect(canEquip("frame.neon-cyan", owned)).toBe(false);
    expect(canEquip("frame.not-a-real-id", owned)).toBe(false);
  });
});
