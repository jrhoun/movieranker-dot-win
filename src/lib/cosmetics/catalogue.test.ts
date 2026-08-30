// src/lib/cosmetics/catalogue.test.ts
import { describe, expect, it } from "vitest";
import { CATALOGUE, itemById, itemsForSlot, starterFor, SLOTS } from "./catalogue";

describe("catalogue integrity", () => {
  it("ids are unique across every slot", () => {
    const ids = CATALOGUE.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ids are namespaced by slot so they read unambiguously", () => {
    for (const item of CATALOGUE) {
      expect(item.id.startsWith(`${item.slot}.`)).toBe(true);
    }
  });

  it("every slot offers at least one starter, so a new profile can be dressed", () => {
    // Task 02 adds gradient avatars and restores this to the full SLOTS list.
    for (const slot of SLOTS.filter((s) => s !== "avatar")) {
      const starters = itemsForSlot(slot).filter((i) => i.unlock.kind === "starter");
      expect(starters.length, `${slot} has no starter`).toBeGreaterThanOrEqual(1);
      expect(starterFor(slot).unlock.kind).toBe("starter");
    }
  });

  it("level unlocks sit inside the real level range", () => {
    for (const item of CATALOGUE) {
      if (item.unlock.kind === "level") {
        expect(item.unlock.level).toBeGreaterThan(1);
        expect(item.unlock.level).toBeLessThanOrEqual(100);
      }
    }
  });

  it("animated items are never common — loud is rare, by policy", () => {
    for (const item of CATALOGUE.filter((i) => i.animated)) {
      expect(item.rarity, item.id).not.toBe("common");
    }
  });

  it("looks items up by id", () => {
    expect(itemById("frame.brass")?.name).toBe("Brass");
    expect(itemById("frame.does-not-exist")).toBeUndefined();
  });
});
