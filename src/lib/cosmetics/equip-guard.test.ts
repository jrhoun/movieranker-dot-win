// src/lib/cosmetics/equip-guard.test.ts
import { describe, expect, it } from "vitest";
import { validateEquipPatch } from "./equip-guard";
import { starterFor } from "./catalogue";
import { ownedItemIds } from "./ownership";

const owned = ownedItemIds({ userId: "u", level: 1, unlockedAchievementKeys: [], finishedThemeSlugs: [] });
const films = new Set([155, 550]);

describe("validateEquipPatch", () => {
  it("accepts an owned item", () => {
    expect(validateEquipPatch({ frame: starterFor("frame").id }, owned, films)).toEqual({ ok: true });
  });

  it("refuses an unowned item", () => {
    const r = validateEquipPatch({ frame: "frame.neon-cyan" }, owned, films);
    expect(r.ok).toBe(false);
  });

  it("refuses an unknown id", () => {
    expect(validateEquipPatch({ frame: "frame.nope" }, owned, films).ok).toBe(false);
  });

  it("accepts an avatar from a film the user finished ranking", () => {
    expect(validateEquipPatch({ avatarTmdbId: 155 }, owned, films)).toEqual({ ok: true });
  });

  it("refuses an avatar the user never ranked", () => {
    // Otherwise anyone could pin any poster and the avatar stops meaning
    // "a film I actually ranked".
    expect(validateEquipPatch({ avatarTmdbId: 999999 }, owned, films).ok).toBe(false);
  });

  it("accepts an empty patch", () => {
    expect(validateEquipPatch({}, owned, films)).toEqual({ ok: true });
  });
});

// avatarPosterPath is what ProfileCanvas actually renders — it never reads
// avatarTmdbId. Without pinning the poster to the real path for the chosen
// film, the avatarTmdbId ownership check above is cosmetic: a client could
// equip an owned tmdbId paired with an arbitrary poster string.
describe("validateEquipPatch avatarPosterPath", () => {
  const posterPathByTmdbId = new Map([
    [155, "/real-batman-poster.jpg"],
    [550, "/real-fight-club-poster.jpg"],
  ]);

  it("accepts a poster that matches the selected film's real path", () => {
    expect(
      validateEquipPatch(
        { avatarTmdbId: 155, avatarPosterPath: "/real-batman-poster.jpg" },
        owned,
        films,
        posterPathByTmdbId,
      ),
    ).toEqual({ ok: true });
  });

  it("refuses a poster that does not match the selected film", () => {
    const r = validateEquipPatch(
      { avatarTmdbId: 155, avatarPosterPath: "/some-other-poster.jpg" },
      owned,
      films,
      posterPathByTmdbId,
    );
    expect(r.ok).toBe(false);
  });

  it("refuses a poster sent without its avatarTmdbId in the same patch", () => {
    const r = validateEquipPatch(
      { avatarPosterPath: "/real-batman-poster.jpg" },
      owned,
      films,
      posterPathByTmdbId,
    );
    expect(r.ok).toBe(false);
  });

  it("refuses any avatarPosterPath when no poster map is supplied", () => {
    const r = validateEquipPatch(
      { avatarTmdbId: 155, avatarPosterPath: "/real-batman-poster.jpg" },
      owned,
      films,
    );
    expect(r.ok).toBe(false);
  });
});
