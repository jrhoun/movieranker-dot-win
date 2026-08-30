// src/lib/cosmetics/avatars.test.ts
import { describe, expect, it } from "vitest";
import { posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "./avatars";
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
