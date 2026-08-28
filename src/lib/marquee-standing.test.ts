import { describe, expect, it } from "vitest";
import { marqueeStanding, themeCompletionRank, type ThemeCompletion } from "./marquee-standing";

/** Helper: build a completion n hours after a fixed epoch. */
const at = (ownerId: string, themeSlug: string, hour: number): ThemeCompletion => ({
  ownerId,
  themeSlug,
  createdAt: new Date(Date.UTC(2026, 7, 24, hour)).toISOString(),
});

describe("themeCompletionRank", () => {
  const completions = [
    at("alice", "theme-x", 1),
    at("bob", "theme-x", 2),
    at("carol", "theme-x", 3),
    at("alice", "theme-y", 4),
  ];

  it("ranks the earliest completion as 1", () => {
    expect(themeCompletionRank(completions, "alice", "theme-x")).toBe(1);
  });

  it("ranks subsequent completions in chronological order", () => {
    expect(themeCompletionRank(completions, "bob", "theme-x")).toBe(2);
    expect(themeCompletionRank(completions, "carol", "theme-x")).toBe(3);
  });

  it("scopes ranking to the given theme", () => {
    expect(themeCompletionRank(completions, "alice", "theme-y")).toBe(1);
  });

  it("returns null when the user has no completion for the theme", () => {
    expect(themeCompletionRank(completions, "dave", "theme-x")).toBeNull();
    expect(themeCompletionRank(completions, "bob", "theme-y")).toBeNull();
  });

  it("uses the user's earliest completion when they have several", () => {
    const dupes = [...completions, at("carol", "theme-x", 0)];
    expect(themeCompletionRank(dupes, "carol", "theme-x")).toBe(1);
  });

  it("is unaffected by input order", () => {
    const shuffled = [...completions].reverse();
    expect(themeCompletionRank(shuffled, "bob", "theme-x")).toBe(2);
  });

  it("returns null for an empty set", () => {
    expect(themeCompletionRank([], "alice", "theme-x")).toBeNull();
  });

  it("breaks identical timestamps deterministically by ownerId", () => {
    const tied = [at("zoe", "t", 5), at("adam", "t", 5)];
    expect(themeCompletionRank(tied, "adam", "t")).toBe(1);
    expect(themeCompletionRank(tied, "zoe", "t")).toBe(2);
  });
});

describe("marqueeStanding", () => {
  /** n other users completing "theme-x" before the subject. */
  const before = (n: number): ThemeCompletion[] =>
    Array.from({ length: n }, (_, i) => at(`user${i}`, "theme-x", i + 1));

  it("awards all three tiers to the very first finisher", () => {
    const s = marqueeStanding([at("me", "theme-x", 1)], "me");
    expect(s).toEqual({ firstToMarquee: true, top10Marquee: true, top100Marquee: true });
  });

  it("awards top10 and top100 but not first at rank 2", () => {
    const s = marqueeStanding([...before(1), at("me", "theme-x", 50)], "me");
    expect(s.firstToMarquee).toBe(false);
    expect(s.top10Marquee).toBe(true);
    expect(s.top100Marquee).toBe(true);
  });

  it("awards top10 at exactly rank 10", () => {
    const s = marqueeStanding([...before(9), at("me", "theme-x", 50)], "me");
    expect(s.top10Marquee).toBe(true);
  });

  it("drops top10 at rank 11 but keeps top100", () => {
    const s = marqueeStanding([...before(10), at("me", "theme-x", 50)], "me");
    expect(s.top10Marquee).toBe(false);
    expect(s.top100Marquee).toBe(true);
  });

  it("awards top100 at exactly rank 100", () => {
    const s = marqueeStanding([...before(99), at("me", "theme-x", 500)], "me");
    expect(s.top100Marquee).toBe(true);
  });

  it("drops top100 at rank 101", () => {
    const s = marqueeStanding([...before(100), at("me", "theme-x", 500)], "me");
    expect(s.top100Marquee).toBe(false);
  });

  it("awards nothing to a user with no completions", () => {
    expect(marqueeStanding(before(5), "me")).toEqual({
      firstToMarquee: false,
      top10Marquee: false,
      top100Marquee: false,
    });
  });

  it("takes the user's BEST standing across all themes", () => {
    // 30th on theme-x (top100 only), but 1st on theme-y (all three).
    const completions = [
      ...Array.from({ length: 29 }, (_, i) => at(`u${i}`, "theme-x", i + 1)),
      at("me", "theme-x", 100),
      at("me", "theme-y", 1),
    ];
    const s = marqueeStanding(completions, "me");
    expect(s).toEqual({ firstToMarquee: true, top10Marquee: true, top100Marquee: true });
  });
});
