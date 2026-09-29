import { describe, expect, it } from "vitest";
import { itemsForSlot, SLOTS } from "./catalogue";
import { SLOT_LABEL } from "./categories";
import { EARNED_TAGLINES, isEarnedTagline } from "./taglines";
import { diffUnlocks, hasUnlocks } from "./unlock-diff";
import { rankForLevel, UNLOCKS } from "../gamification";

// Picked from the live catalogue rather than hard-coded, so the test survives
// items being renamed or cut.
const frame = itemsForSlot("frame")[0];
const overlay = itemsForSlot("overlay").find((o) => o.name !== "None") ?? itemsForSlot("overlay")[0];
const staticTagline = itemsForSlot("tagline").find((t) => !isEarnedTagline(t.id))!;
const earnedTagline = EARNED_TAGLINES[0];

const snap = (ids: string[], level = 1) => ({ owned: new Set(ids), level });

describe("diffUnlocks", () => {
  it("reports nothing when nothing changed", () => {
    const d = diffUnlocks(snap([frame.id], 3), snap([frame.id], 3));
    expect(d.cosmetics).toEqual([]);
    expect(d.levelUp).toBeNull();
    expect(hasUnlocks(d)).toBe(false);
  });

  it("lists only items owned after and not before, grouped by slot with the pane title", () => {
    const d = diffUnlocks(snap([frame.id]), snap([frame.id, overlay.id, staticTagline.id]));
    expect(d.cosmetics.map((g) => g.slot)).toEqual(["overlay", "tagline"]);
    const overlays = d.cosmetics.find((g) => g.slot === "overlay")!;
    expect(overlays.title).toBe(SLOT_LABEL.overlay);
    expect(overlays.items).toEqual([
      {
        id: overlay.id,
        slot: "overlay",
        name: overlay.name,
        label: overlay.name,
        unlock: overlay.unlock.kind,
      },
    ]);
  });

  it("keeps groups in catalogue slot order", () => {
    const one = (slot: (typeof SLOTS)[number]) => itemsForSlot(slot)[0].id;
    const d = diffUnlocks(snap([]), snap([one("avatar"), one("tagline"), one("frame")]));
    expect(d.cosmetics.map((g) => g.slot)).toEqual(["frame", "tagline", "avatar"]);
  });

  it("prints a static tagline in quotes", () => {
    const d = diffUnlocks(snap([]), snap([staticTagline.id]));
    expect(d.cosmetics[0].items[0].label).toBe(`“${staticTagline.name}”`);
  });

  it("never prints an earned tagline's template; uses the resolved text when given", () => {
    const withheld = diffUnlocks(snap([]), snap([earnedTagline.id]));
    expect(withheld.cosmetics[0].items[0].label).toBe("An earned line");
    expect(withheld.cosmetics[0].items[0].label).not.toContain("{count}");

    const resolved = diffUnlocks(snap([]), snap([earnedTagline.id]), {
      [earnedTagline.id]: "12 Marquees, and counting.",
    });
    expect(resolved.cosmetics[0].items[0].label).toBe("“12 Marquees, and counting.”");
  });

  it("ignores ids that are not in the catalogue", () => {
    const d = diffUnlocks(snap([]), snap(["frame.does-not-exist"]));
    expect(d.cosmetics).toEqual([]);
  });

  it("does not report items that were lost", () => {
    const d = diffUnlocks(snap([frame.id, overlay.id]), snap([frame.id]));
    expect(d.cosmetics).toEqual([]);
  });

  it("describes a level-up with the new rank and the unlocks crossed", () => {
    const first = UNLOCKS.reduce((a, b) => (a.atLevel < b.atLevel ? a : b));
    const d = diffUnlocks(snap([], first.atLevel - 1), snap([], first.atLevel));
    expect(d.levelUp).toEqual({
      from: first.atLevel - 1,
      to: first.atLevel,
      rank: rankForLevel(first.atLevel),
      unlocks: [first],
    });
    expect(hasUnlocks(d)).toBe(true);
  });

  it("collects every unlock crossed by a multi-level jump, lowest first", () => {
    const d = diffUnlocks(snap([], 1), snap([], 100));
    expect(d.levelUp?.unlocks).toEqual([...UNLOCKS].sort((a, b) => a.atLevel - b.atLevel));
  });

  it("reports no level-up for a flat or falling level", () => {
    expect(diffUnlocks(snap([], 4), snap([], 4)).levelUp).toBeNull();
    expect(diffUnlocks(snap([], 5), snap([], 4)).levelUp).toBeNull();
  });

  it("a level-up between unlocks carries an empty unlocks list", () => {
    const d = diffUnlocks(snap([], 1), snap([], 2));
    expect(d.levelUp?.to).toBe(2);
    expect(d.levelUp?.unlocks).toEqual([]);
  });
});
