import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AVATARS, posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "./avatars";
import { itemById, SLOTS } from "./catalogue";

describe("synthetic poster avatars", () => {
  it("round-trips a tmdb id", () => {
    expect(posterAvatarId(155)).toBe("avatar.poster.155");
    expect(posterAvatarTmdbId("avatar.poster.155")).toBe(155);
  });

  it("rejects ids that are not poster avatars", () => {
    for (const id of [
      "frame.brass",
      "avatar.poster.",
      "avatar.poster.abc",
      "avatar.poster.1.5",
      "avatar.poster.-3",
      "avatar.lorelei-01",
      "",
    ]) {
      expect(posterAvatarTmdbId(id), id).toBeNull();
    }
  });

  it("synthesises a catalogue item so existing machinery needs no special case", () => {
    const item = syntheticPosterAvatar("avatar.poster.155");
    expect(item).toMatchObject({ id: "avatar.poster.155", slot: "avatar" });
    expect(syntheticPosterAvatar("frame.brass")).toBeUndefined();
  });

  it("itemById resolves a synthetic poster id", () => {
    // This is the whole point: canEquip() and the slot-correspondence check in
    // validateEquipPatch both go through itemById, so a claimed poster becomes
    // equippable without either of them being modified.
    expect(itemById("avatar.poster.155")?.slot).toBe("avatar");
  });

  it("does not corrupt real catalogue lookups", () => {
    expect(itemById("frame.brass")?.slot).toBe("frame");
    expect(itemById("nope.nothing")).toBeUndefined();
  });

  it("avatar is a real slot", () => {
    expect(SLOTS).toContain("avatar");
  });
});

describe("gradient avatars", () => {
  it("gradient avatar ids are unique and properly namespaced", () => {
    const grads = AVATARS.filter((a) => a.id.startsWith("avatar.grad."));
    expect(grads.length).toBe(6);
    const ids = grads.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of grads) {
      expect(g.slot).toBe("avatar");
      expect(g.id).toMatch(/^avatar\.grad\.[a-z]+$/);
    }
  });

  it("starter invariant: at least one starter gradient avatar exists", () => {
    const starters = AVATARS.filter((a) => a.unlock.kind === "starter");
    expect(starters.length).toBeGreaterThanOrEqual(1);
    expect(starters.map((s) => s.id)).toEqual(["avatar.grad.ember", "avatar.grad.velvet"]);
  });

  it("unlock rules cover level and challenge requirements", () => {
    const nitrate = AVATARS.find((a) => a.id === "avatar.grad.nitrate");
    expect(nitrate?.unlock).toEqual({ kind: "level", level: 5 });
    expect(nitrate?.rarity).toBe("common");

    const cyan = AVATARS.find((a) => a.id === "avatar.grad.cyan");
    expect(cyan?.unlock).toEqual({ kind: "level", level: 10 });
    expect(cyan?.rarity).toBe("rare");

    const magenta = AVATARS.find((a) => a.id === "avatar.grad.magenta");
    expect(magenta?.unlock).toEqual({ kind: "level", level: 20 });
    expect(magenta?.rarity).toBe("rare");

    const toxic = AVATARS.find((a) => a.id === "avatar.grad.toxic");
    expect(toxic?.unlock).toEqual({ kind: "challenge", key: "cryptologist" });
    expect(toxic?.rarity).toBe("legendary");
  });

  it("every gradient avatar has a matching .ca-* rule in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const grads = AVATARS.filter((a) => a.id.startsWith("avatar.grad."));
    for (const item of grads) {
      const cls = item.id.replace(/^avatar\.grad\./, "ca-");
      expect(css, `${item.id} missing .${cls} rule in globals.css`).toMatch(
        new RegExp(`\\.${cls}\\b`),
      );
    }
  });
});
