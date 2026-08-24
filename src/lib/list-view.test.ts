import { describe, expect, test } from "vitest";
import {
  podiumDisplayOrder,
  splitPodium,
  withRanks,
  type ListMovieRow,
} from "./list-view";

const row = (tmdbId: number, partial: Partial<ListMovieRow> = {}): ListMovieRow => ({
  tmdbId,
  title: `Movie ${tmdbId}`,
  posterPath: null,
  releaseYear: 2000 + tmdbId,
  comparisons: tmdbId,
  finalRank: null,
  ...partial,
});

describe("withRanks", () => {
  test("uses stored final_rank when present", () => {
    expect(withRanks([row(1, { finalRank: 7 })])).toEqual([
      expect.objectContaining({ tmdbId: 1, rank: 7 }),
    ]);
  });

  test("falls back to array position when final_rank is missing", () => {
    const ranked = withRanks([row(1, { finalRank: 2 }), row(2, { finalRank: null })]);
    expect(ranked.map((r) => r.rank)).toEqual([2, 2]);
  });
});

describe("splitPodium", () => {
  test("three or more movies: first three podium, remainder below", () => {
    const { podium, rest } = splitPodium([1, 2, 3, 4, 5].map((id) => row(id)));
    expect(podium.map((m) => m.tmdbId)).toEqual([1, 2, 3]);
    expect(rest.map((m) => m.tmdbId)).toEqual([4, 5]);
  });

  test("fewer than three: all podium, empty rest", () => {
    expect(splitPodium([row(1)])).toEqual({ podium: [row(1)], rest: [] });
  });

  test("empty list splits into two empty groups", () => {
    expect(splitPodium([])).toEqual({ podium: [], rest: [] });
  });
});

describe("podiumDisplayOrder", () => {
  test("full podium puts the winner in the center", () => {
    expect(podiumDisplayOrder([1, 2, 3].map((id) => row(id))).map((m) => m.tmdbId)).toEqual([2, 1, 3]);
  });

  test("one or two movies keep rank order", () => {
    expect(podiumDisplayOrder([row(1)]).map((m) => m.tmdbId)).toEqual([1]);
    expect(podiumDisplayOrder([row(1), row(2)]).map((m) => m.tmdbId)).toEqual([1, 2]);
  });
});
