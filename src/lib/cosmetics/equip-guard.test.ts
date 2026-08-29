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

  it("refuses an id that is owned but belongs to a different slot", () => {
    // background.filmstrip is a starter (owned by everyone) but it's a
    // background, not a frame — canEquip alone never checked that.
    const r = validateEquipPatch({ frame: "background.filmstrip" }, owned, films);
    expect(r.ok).toBe(false);
  });

  it("accepts null on a slot field as a request to clear it, with no ownership check", () => {
    expect(validateEquipPatch({ tagline: null }, owned, films)).toEqual({ ok: true });
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

  it("refuses a poster that matches a DIFFERENT owned film's real path", () => {
    const r = validateEquipPatch(
      // /real-fight-club-poster.jpg is real, but it's tmdbId 550's poster, not 155's.
      { avatarTmdbId: 155, avatarPosterPath: "/real-fight-club-poster.jpg" },
      owned,
      films,
      posterPathByTmdbId,
    );
    expect(r.ok).toBe(false);
  });

  it("refuses any poster for a film whose stored poster_path is null", () => {
    const mapWithNullPoster = new Map([[155, null]]);
    const r = validateEquipPatch(
      { avatarTmdbId: 155, avatarPosterPath: "/anything.jpg" },
      owned,
      films,
      mapWithNullPoster,
    );
    expect(r.ok).toBe(false);
  });
});
