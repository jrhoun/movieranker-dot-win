import { describe, expect, test } from "vitest";
import {
  canCompare,
  compatibilityTier,
  computeVersus,
  extractListId,
  findSharpestClash,
  findSharedFavorites,
  type SharedMovie,
  type VersusEntry,
} from "./versus";

const m = (tmdbId: number, rank: number): VersusEntry => ({
  tmdbId,
  title: `Movie ${tmdbId}`,
  posterPath: `/p-${tmdbId}.jpg`,
  rank,
});

describe("computeVersus", () => {
  test("full agreement: identical order -> 100%", () => {
    const a = [m(1, 1), m(2, 2), m(3, 3)];
    const r = computeVersus(a, [m(1, 1), m(2, 2), m(3, 3)]);
    expect(r.agreementPct).toBe(100);
    expect(r.shared).toHaveLength(3);
    expect(r.biggestArguments.every((s) => s.delta === 0)).toBe(true);
    expect(r.onlyInA).toEqual([]);
    expect(r.onlyInB).toEqual([]);
  });

  test("full reversal: 0% and every delta negated", () => {
    const r = computeVersus([m(1, 1), m(2, 2), m(3, 3)], [m(1, 3), m(2, 2), m(3, 1)]);
    expect(r.agreementPct).toBe(0);
    // A order kept: movie 1 (rankA 1) first; its B rank is 3.
    expect(r.shared.map((s) => s.tmdbId)).toEqual([1, 2, 3]);
    expect(r.shared[0].delta).toBe(2);
    // Movie 2 keeps its rank (delta 0), so only 1 and 3 moved.
    expect(r.biggestArguments.map((s) => s.tmdbId)).toEqual([1, 3, 2]);
  });

  test("partial agreement: known pairwise percentage", () => {
    // A: 1<2<3 ; B: 2<1<3. Pairs: (1,2) disagree, (1,3) agree, (2,3) agree -> 67%.
    const r = computeVersus([m(1, 1), m(2, 2), m(3, 3)], [m(2, 1), m(1, 2), m(3, 3)]);
    expect(r.agreementPct).toBe(67);
    expect(compatibilityTier(r.agreementPct!)).toBe("Spicy differences");
  });

  test("one shared movie: null score, no arguments", () => {
    const r = computeVersus([m(1, 1)], [m(1, 5)]);
    expect(r.agreementPct).toBeNull();
    // No pairs to agree on, but the single rank gap still surfaces.
    expect(r.biggestArguments).toHaveLength(1);
    expect(r.shared[0].rankA).toBe(1);
    expect(r.shared[0].rankB).toBe(5);
  });

  test("zero shared movies: null score, both exclusives populated", () => {
    const r = computeVersus([m(1, 1), m(2, 2)], [m(3, 1), m(4, 2)]);
    expect(r.agreementPct).toBeNull();
    expect(r.shared).toEqual([]);
    expect(r.onlyInA.map((e) => e.tmdbId)).toEqual([1, 2]);
    expect(r.onlyInB.map((e) => e.tmdbId)).toEqual([3, 4]);
  });

  test("intersection by tmdbId regardless of position or title", () => {
    const a: VersusEntry[] = [
      { tmdbId: 10, title: "A Title", posterPath: null, rank: 1 },
      m(20, 2),
    ];
    const b: VersusEntry[] = [{ tmdbId: 30, title: "Other", posterPath: null, rank: 1 }, { ...a[0], rank: 2 }];
    const r = computeVersus(a, b);
    expect(r.shared).toHaveLength(1);
    expect(r.shared[0].tmdbId).toBe(10);
    expect(r.onlyInB.map((e) => e.tmdbId)).toEqual([30]);
  });

  test("biggestArguments sorted by |delta| desc and capped at 5", () => {
    // Deltas vs A's 1..6: +9, +6, +4, -2, 0, -5.
    const a = [m(1, 1), m(2, 2), m(3, 3), m(4, 4), m(5, 5), m(6, 6)];
    const b = [m(1, 10), m(2, 8), m(3, 7), m(4, 2), m(5, 5), m(6, 1)];
    const args = computeVersus(a, b).biggestArguments;
    expect(args.map((s) => Math.abs(s.delta))).toEqual([9, 6, 5, 4, 2]);
  });
});

describe("compatibilityTier", () => {
  test("tier boundaries", () => {
    expect(compatibilityTier(100)).toBe("Basically twins");
    expect(compatibilityTier(90)).toBe("Basically twins");
    expect(compatibilityTier(89)).toBe("Mostly aligned");
    expect(compatibilityTier(70)).toBe("Mostly aligned");
    expect(compatibilityTier(69)).toBe("Spicy differences");
    expect(compatibilityTier(50)).toBe("Spicy differences");
    expect(compatibilityTier(49)).toBe("Opposite ends of the couch");
  });
});

describe("canCompare", () => {
  const row = (over: Partial<Parameters<typeof canCompare>[0]> = {}) => ({
    status: "done",
    visibility: "public",
    ownerId: "owner-1",
    ...over,
  });

  test("done+public/unlisted readable by anyone", () => {
    expect(canCompare(row(), null)).toBe(true);
    expect(canCompare(row({ visibility: "unlisted" }), null)).toBe(true);
  });

  test("unlisted done lists stay link-comparable (matches /l/[id] access)", () => {
    expect(canCompare(row({ visibility: "unlisted" }), "stranger")).toBe(true);
  });

  test("private only for the owner; drafts never", () => {
    expect(canCompare(row({ visibility: "private" }), "owner-1")).toBe(true);
    expect(canCompare(row({ visibility: "private" }), "other")).toBe(false);
    expect(canCompare(row({ visibility: "private" }), null)).toBe(false);
    expect(canCompare(row({ status: "draft" }), "owner-1")).toBe(false);
  });
});

describe("findSharpestClash", () => {
  test("returns movie with greatest |delta|", () => {
    const shared: SharedMovie[] = [
      { tmdbId: 1, title: "Movie 1", posterPath: null, rankA: 1, rankB: 2, delta: 1 },
      { tmdbId: 2, title: "Movie 2", posterPath: null, rankA: 2, rankB: 10, delta: 8 },
      { tmdbId: 3, title: "Movie 3", posterPath: null, rankA: 3, rankB: 4, delta: 1 },
    ];
    const result = findSharpestClash(shared);
    expect(result?.tmdbId).toBe(2);
    expect(result?.delta).toBe(8);
  });

  test("returns null when no shared movies or all deltas are 0", () => {
    expect(findSharpestClash([])).toBeNull();
    const identical: SharedMovie[] = [
      { tmdbId: 1, title: "Movie 1", posterPath: null, rankA: 1, rankB: 1, delta: 0 },
      { tmdbId: 2, title: "Movie 2", posterPath: null, rankA: 2, rankB: 2, delta: 0 },
    ];
    expect(findSharpestClash(identical)).toBeNull();
  });

  test("tie-breaking: selects film with higher top rank (min rank)", () => {
    const shared: SharedMovie[] = [
      // |delta| = 5 (ranks 1 vs 6) -> minRank = 1
      { tmdbId: 1, title: "Movie 1", posterPath: null, rankA: 1, rankB: 6, delta: 5 },
      // |delta| = 5 (ranks 5 vs 10) -> minRank = 5
      { tmdbId: 2, title: "Movie 2", posterPath: null, rankA: 5, rankB: 10, delta: 5 },
    ];
    const result = findSharpestClash(shared);
    expect(result?.tmdbId).toBe(1);
  });
});

describe("findSharedFavorites", () => {
  test("returns mutual top tier movies sorted by rank sum", () => {
    const shared: SharedMovie[] = [
      { tmdbId: 1, title: "Movie 1", posterPath: null, rankA: 1, rankB: 2, delta: 1 },
      { tmdbId: 2, title: "Movie 2", posterPath: null, rankA: 3, rankB: 3, delta: 0 },
      { tmdbId: 3, title: "Movie 3", posterPath: null, rankA: 1, rankB: 10, delta: 9 },
      { tmdbId: 4, title: "Movie 4", posterPath: null, rankA: 8, rankB: 8, delta: 0 },
    ];
    const favs = findSharedFavorites(shared, 5);
    expect(favs.map((f) => f.tmdbId)).toEqual([1, 2]);
  });

  test("falls back to close top 10 movies when no mutual top 5 exist", () => {
    const shared: SharedMovie[] = [
      { tmdbId: 1, title: "Movie 1", posterPath: null, rankA: 6, rankB: 7, delta: 1 },
      { tmdbId: 2, title: "Movie 2", posterPath: null, rankA: 8, rankB: 9, delta: 1 },
      { tmdbId: 3, title: "Movie 3", posterPath: null, rankA: 1, rankB: 15, delta: 14 },
    ];
    const favs = findSharedFavorites(shared, 5);
    expect(favs.map((f) => f.tmdbId)).toEqual([1, 2]);
  });

  test("returns empty array when shared list is empty", () => {
    expect(findSharedFavorites([])).toEqual([]);
  });
});

describe("computeVersus enhanced outputs", () => {
  test("populates sharpestClash, sharedFavorites, and compatibilityScore", () => {
    const a = [m(1, 1), m(2, 2), m(3, 3), m(4, 4), m(5, 5)];
    const b = [m(1, 1), m(2, 2), m(5, 3), m(4, 4), m(3, 10)];
    const r = computeVersus(a, b);

    expect(r.compatibilityScore).toBe(r.agreementPct);
    expect(r.sharpestClash?.tmdbId).toBe(3);
    expect(r.sharpestClash?.delta).toBe(7);
    expect(r.sharedFavorites.map((f) => f.tmdbId)).toContain(1);
    expect(r.sharedFavorites.map((f) => f.tmdbId)).toContain(2);
  });
});

describe("extractListId", () => {
  test("accepts bare ids and /l/ URLs, rejects everything else", () => {
    expect(extractListId("abc123")).toBe("abc123");
    expect(extractListId(" https://movieranker.win/l/xyz9 ")).toBe("xyz9");
    expect(extractListId("http://localhost:3000/l/q1w2?x=1")).toBe("q1w2");
    expect(extractListId("")).toBeNull();
    expect(extractListId("https://movieranker.win/u/me")).toBeNull();
    expect(extractListId("has space")).toBeNull();
    expect(extractListId("a/b")).toBeNull();
  });
});

