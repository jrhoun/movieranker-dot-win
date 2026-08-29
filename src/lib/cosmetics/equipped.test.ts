import { describe, expect, it } from "vitest";
import { parseEquipped, resolveEquipped } from "./equipped";
import { starterFor } from "./catalogue";
import { ownedItemIds } from "./ownership";

const newUser = () =>
  ownedItemIds({ userId: "u", level: 1, unlockedAchievementKeys: [], finishedThemeSlugs: [] });

describe("parseEquipped", () => {
  it("accepts an absent or empty block", () => {
    expect(parseEquipped(undefined)).toEqual({});
    expect(parseEquipped({})).toEqual({});
  });

  it("rejects non-objects", () => {
    for (const bad of [null, 3, "x", []]) expect(parseEquipped(bad)).toBeNull();
  });

  it("rejects wrong types for known fields", () => {
    expect(parseEquipped({ frame: 3 })).toBeNull();
    expect(parseEquipped({ avatarTmdbId: "155" })).toBeNull();
    expect(parseEquipped({ avatarTmdbId: 1.5 })).toBeNull();
  });

  it("keeps only known fields, dropping anything else", () => {
    const parsed = parseEquipped({ frame: "frame.brass", nope: "x" });
    expect(parsed).toEqual({ frame: "frame.brass" });
  });

  it("accepts null on the four slot fields as a request to clear them", () => {
    expect(parseEquipped({ frame: null })).toEqual({ frame: null });
    expect(parseEquipped({ tagline: null })).toEqual({ tagline: null });
  });

  it("accepts a real TMDB-shaped avatarPosterPath", () => {
    expect(parseEquipped({ avatarPosterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" })).toEqual({
      avatarPosterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    });
  });

  it("rejects an avatarPosterPath that isn't a real TMDB-shaped path", () => {
    // Traversal-ish: extra slashes/dots inside the path.
    expect(parseEquipped({ avatarPosterPath: "/../../etc/passwd" })).toBeNull();
    // CSS-breakout: ProfileCanvas puts this in an UNQUOTED `url(${POSTER}${avatar})`.
    // Comma-separated backgrounds are valid CSS, so this string closes the
    // first url(), opens a second pointing at an attacker's host, and fetches
    // it for every viewer of the profile.
    expect(
      parseEquipped({ avatarPosterPath: "/x.jpg), url(https://evil.example/track.gif" }),
    ).toBeNull();
  });

  it("accepts a reasonably-sized taglineText string", () => {
    expect(parseEquipped({ taglineText: "13 Marquees, and counting." })).toEqual({
      taglineText: "13 Marquees, and counting.",
    });
  });

  it("accepts null on taglineText as a request to clear it", () => {
    expect(parseEquipped({ taglineText: null })).toEqual({ taglineText: null });
  });

  it("rejects an over-long taglineText", () => {
    // Never supposed to arrive from a client at all (see /api/profile), but
    // shape validation still refuses anything wildly oversized rather than
    // silently truncating it.
    expect(parseEquipped({ taglineText: "x".repeat(121) })).toBeNull();
    expect(parseEquipped({ taglineText: "x".repeat(120) })).toEqual({
      taglineText: "x".repeat(120),
    });
  });

  it("rejects a non-string, non-null taglineText", () => {
    expect(parseEquipped({ taglineText: 42 })).toBeNull();
  });
});

describe("resolveEquipped", () => {
  it("falls back to the starter when nothing is equipped", () => {
    const r = resolveEquipped({}, newUser());
    expect(r.frame).toBe(starterFor("frame").id);
    expect(r.background).toBe(starterFor("background").id);
    expect(r.overlay).toBe(starterFor("overlay").id);
  });

  it("drops an equipped id the user does not own", () => {
    // Re-checked at render, not only at write: this is what makes changing an
    // unlock threshold safe, and what stops a revoked grant still rendering.
    const r = resolveEquipped({ frame: "frame.neon-cyan" }, newUser());
    expect(r.frame).toBe(starterFor("frame").id);
  });

  it("keeps an owned id", () => {
    const id = starterFor("frame").id;
    expect(resolveEquipped({ frame: id }, newUser()).frame).toBe(id);
  });

  it("passes the avatar through untouched — it is validated separately", () => {
    const r = resolveEquipped({ avatarTmdbId: 155, avatarPosterPath: "/x.jpg" }, newUser());
    expect(r.avatarTmdbId).toBe(155);
  });
});
