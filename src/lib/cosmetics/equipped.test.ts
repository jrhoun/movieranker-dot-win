import { describe, expect, it } from "vitest";
import { parseEquipped, resolveEquipped, sanitizeEquipped } from "./equipped";
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

  it("falls back to the starter for an avatar the user does not own", () => {
    // A poster avatar is owned only via a CLAIM, so an unclaimed one must not
    // render — otherwise the claim allowance would be advisory.
    const r = resolveEquipped({ avatar: "avatar.poster.155" }, newUser());
    expect(r.avatar).toBe(starterFor("avatar").id);
  });

  it("keeps an avatar the user has claimed", () => {
    const owned = ownedItemIds({
      userId: "u",
      level: 1,
      unlockedAchievementKeys: [],
      finishedThemeSlugs: [],
      avatarClaims: [155],
    });
    expect(resolveEquipped({ avatar: "avatar.poster.155" }, owned).avatar).toBe(
      "avatar.poster.155",
    );
  });

  it("passes the avatar through untouched — it is validated separately", () => {
    const r = resolveEquipped({ avatarTmdbId: 155, avatarPosterPath: "/x.jpg" }, newUser());
    expect(r.avatarTmdbId).toBe(155);
  });
});

describe("sanitizeEquipped", () => {
  it("renders a challenge-gated, legendary item that a limited-stats caller could not derive ownership for", () => {
    // frame.prism is unlock: {kind: "challenge", key: "cryptologist"} — a
    // page whose achievement stats are RLS-limited (no visibility into
    // private lists or another user's marquee_solves) can never prove this
    // was earned. sanitizeEquipped takes no `owned` set at all: it trusts
    // /api/profile already validated this against the real owner's full
    // stats when it was written, which is exactly the point of this fix.
    const r = sanitizeEquipped({ frame: "frame.prism" });
    expect(r.frame).toBe("frame.prism");
  });

  it("still drops a stale id no longer in the catalogue", () => {
    // A catalogue change (removed/renamed item) is something this function
    // CAN verify correctly on its own, unlike ownership — falls back to the
    // slot's starter rather than rendering a dead id.
    const r = sanitizeEquipped({ frame: "frame.does-not-exist" });
    expect(r.frame).toBe(starterFor("frame").id);
  });

  it("drops an id that exists but belongs to a different slot", () => {
    const r = sanitizeEquipped({ frame: "background.velvet" });
    expect(r.frame).toBe(starterFor("frame").id);
  });

  it("falls back to the starter when nothing is equipped", () => {
    const r = sanitizeEquipped({});
    expect(r.frame).toBe(starterFor("frame").id);
    expect(r.background).toBe(starterFor("background").id);
    expect(r.overlay).toBe(starterFor("overlay").id);
  });

  it("keeps a valid tagline id and drops a stale one, with no starter forced", () => {
    expect(sanitizeEquipped({ tagline: "tagline.trailer.in-a-world" }).tagline).toBe(
      "tagline.trailer.in-a-world",
    );
    expect(sanitizeEquipped({ tagline: "tagline.nope" }).tagline).toBeUndefined();
    expect(sanitizeEquipped({}).tagline).toBeUndefined();
  });

  it("passes the avatar and taglineText through untouched", () => {
    const r = sanitizeEquipped({
      avatarTmdbId: 155,
      avatarPosterPath: "/x.jpg",
      taglineText: "104 films ranked. No regrets.",
    });
    expect(r.avatarTmdbId).toBe(155);
    expect(r.taglineText).toBe("104 films ranked. No regrets.");
  });
});
