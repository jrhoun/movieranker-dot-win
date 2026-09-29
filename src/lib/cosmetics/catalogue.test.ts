// src/lib/cosmetics/catalogue.test.ts
import { describe, expect, it } from "vitest";
import { CATALOGUE, itemById, itemsForSlot, starterFor, SLOTS } from "./catalogue";
import { SHORTLIST_THEMES } from "@/lib/shortlist-themes";

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
    for (const slot of SLOTS) {
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

  it("no avatar is droppable, so avatars cannot perturb the drop pool", () => {
    // `droppablePool` is ONE pool spanning every slot, and `drawFrom` scales
    // its seeded ticket by the pool's total rarity weight — so a droppable
    // avatar re-rolls every user's entire drop history. Giving avatars a drop
    // path means giving them their own pool and their own seed. See the note
    // above GRADIENTS in avatars.ts.
    for (const item of itemsForSlot("avatar")) {
      expect(item.unlock.kind, `${item.id} is droppable`).not.toBe("drop");
    }
  });

  it("is the size the 2026-09-28 cut left it, per slot", () => {
    // Pinned so the catalogue cannot silently regrow into the 220-item shop it
    // was. Sixty-three of the taglines are one souvenir per weekly theme, so
    // that slot tracks SHORTLIST_THEMES rather than a hand-written number.
    const count = (slot: (typeof SLOTS)[number]) => itemsForSlot(slot).length;
    expect(count("frame")).toBe(13);
    expect(count("background")).toBe(6);
    expect(count("overlay")).toBe(4);
    expect(count("avatar")).toBe(18 + 1 + 8);
    expect(count("tagline")).toBe(3 + 8 + SHORTLIST_THEMES.length + 4 + 1);
  });

  it("nothing is level-gated except a frame, a room or an atmosphere", () => {
    // Spec §1.1: levelling must not award cosmetic clutter. An avatar or a
    // tagline behind a level was exactly that.
    for (const item of CATALOGUE.filter((i) => i.unlock.kind === "level")) {
      expect(["frame", "background", "overlay"], item.id).toContain(item.slot);
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
