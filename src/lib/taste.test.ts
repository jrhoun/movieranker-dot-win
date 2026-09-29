import { describe, expect, it } from "vitest";
import {
  computeTaste,
  decadesSentence,
  percentagesSummingTo100,
  tasteListsFromRows,
  tasteSentences,
  type TasteList,
  type TasteMovie,
} from "./taste";
import type { ThemeRoom } from "./theme-stats";

const NOW = new Date("2026-09-28T12:00:00Z");
const LIVE = "2026-09-28T09:00:00Z"; // same week as NOW
const PAST = "2026-09-01T09:00:00Z"; // weeks ago

const film = (tmdbId: number, over: Partial<TasteMovie> = {}): TasteMovie => ({
  tmdbId,
  title: `Film ${tmdbId}`,
  posterPath: `/p${tmdbId}.jpg`,
  releaseYear: 1990,
  finalRank: null,
  ...over,
});

/** A finished list whose movies are ranked in the order given (first = #1). */
const list = (
  id: string,
  createdAt: string,
  ranked: TasteMovie[],
  over: Partial<TasteList> = {},
): TasteList => ({
  id,
  title: `List ${id}`,
  themeSlug: null,
  createdAt,
  movies: ranked.map((m, i) => ({ ...m, finalRank: m.finalRank ?? i + 1 })),
  ...over,
});

const room = (id: string, rankedIds: number[]): ThemeRoom => ({
  id,
  movies: rankedIds.map((tmdbId, i) => ({
    tmdbId,
    title: `Film ${tmdbId}`,
    posterPath: null,
    elo: 1000 - i,
    parked: false,
    finalRank: i + 1,
  })),
});

describe("computeTaste", () => {
  it("returns an empty profile for no finished lists", () => {
    const t = computeTaste({ lists: [], connectionsCracked: 0, now: NOW });
    expect(t.finishedLists).toBe(0);
    expect(t.numberOnes).toEqual([]);
    expect(t.decades).toEqual([]);
    expect(t.agreement).toBeNull();
    expect(t.mostRanked).toBeNull();
    expect(t.connections).toEqual({ cracked: 0, marqueesFinished: 0 });
  });

  it("lists number ones newest first, capped at twelve", () => {
    const lists = Array.from({ length: 15 }, (_, i) =>
      list(`l${i}`, `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`, [film(100 + i), film(1)]),
    );
    const t = computeTaste({ lists, connectionsCracked: 0, now: NOW });
    expect(t.numberOnes).toHaveLength(12);
    expect(t.numberOnes[0]).toMatchObject({ tmdbId: 114, listId: "l14", listTitle: "List l14" });
    expect(t.numberOnes[11].tmdbId).toBe(103);
  });

  it("takes the best-ranked film when rank 1 is missing, and skips a list with no ranks", () => {
    const partial: TasteList = {
      id: "p",
      title: "Partial",
      themeSlug: null,
      createdAt: PAST,
      movies: [film(7, { finalRank: 3 }), film(8, { finalRank: 2 }), film(9)],
    };
    const unranked: TasteList = { ...partial, id: "u", movies: [film(1), film(2)] };
    const t = computeTaste({ lists: [partial, unranked], connectionsCracked: 0, now: NOW });
    expect(t.numberOnes.map((n) => n.tmdbId)).toEqual([8]);
  });

  it("masks the live week's Marquee title and reveals a past week's", () => {
    const lists = [
      list("live", LIVE, [film(1)], { title: "The Golden Age of Hollywood", themeSlug: "golden-age" }),
      list("past", PAST, [film(2)], { title: "Secretly The Same Story", themeSlug: "monomyth" }),
      list("plain", PAST, [film(3)], { title: "My Own List" }),
    ];
    const t = computeTaste({ lists, connectionsCracked: 0, now: NOW });
    const titles = Object.fromEntries(t.numberOnes.map((n) => [n.listId, n.listTitle]));
    expect(titles.live).toMatch(/^Weekly Marquee #\d+$/);
    expect(titles.live).not.toContain("Golden");
    expect(titles.past).toBe("Secretly The Same Story");
    expect(titles.plain).toBe("My Own List");
  });

  it("shares films per decade, sorted, summing to exactly 100", () => {
    const lists = [
      list("a", PAST, [
        film(1, { releaseYear: 1994 }),
        film(2, { releaseYear: 1999 }),
        film(3, { releaseYear: 1975 }),
        film(4, { releaseYear: 2011 }),
        film(5, { releaseYear: 2019 }),
        film(6, { releaseYear: 2020 }),
        film(7, { releaseYear: null }), // no year: not counted
      ]),
    ];
    // A parked film was not seen, so it says nothing about taste.
    lists[0].movies.push(film(8, { releaseYear: 1950, finalRank: null }));
    const t = computeTaste({ lists, connectionsCracked: 0, now: NOW });
    expect(t.decades.map((d) => d.label)).toEqual(["1970s", "1990s", "2010s", "2020s"]);
    expect(t.decades.map((d) => d.count)).toEqual([1, 2, 2, 1]);
    expect(t.decades.reduce((s, d) => s + d.pct, 0)).toBe(100);
    // 1/6 = 16.67, 2/6 = 33.33: largest remainder lifts the two sixths.
    expect(t.decades.map((d) => d.pct)).toEqual([17, 33, 33, 17]);
  });

  it("agreement is null below two comparable Marquees", () => {
    const lists = [
      list("m1", PAST, [film(1), film(2)], { themeSlug: "t1" }),
      list("m2", PAST, [film(3), film(4)], { themeSlug: "t2" }),
    ];
    const roomsByTheme = new Map<string, ThemeRoom[]>([
      // t1: enough other rooms. t2: only one other room, so it does not count.
      ["t1", [room("m1", [1, 2]), room("r1", [1, 2]), room("r2", [1, 2])]],
      ["t2", [room("m2", [3, 4]), room("r3", [3, 4])]],
    ]);
    const t = computeTaste({ lists, roomsByTheme, connectionsCracked: 0, now: NOW });
    expect(t.agreement).toBeNull();
  });

  it("measures agreement against other rooms only, treating a tied top as a match", () => {
    const lists = [
      list("m1", PAST, [film(1), film(2)], { themeSlug: "t1" }), // room says 1: match
      list("m2", PAST, [film(3), film(4)], { themeSlug: "t2" }), // room says 4: miss
      list("m3", PAST, [film(5), film(6)], { themeSlug: "t3" }), // room split 5/6: match
      list("m4", PAST, [film(7), film(8)], { themeSlug: "t4" }), // nobody else played: skipped
      list("m5", PAST, [film(9), film(10)], { themeSlug: "t5" }), // own room only: skipped
    ];
    const roomsByTheme = new Map<string, ThemeRoom[]>([
      ["t1", [room("m1", [1, 2]), room("a", [1, 2]), room("b", [1, 2])]],
      ["t2", [room("m2", [3, 4]), room("c", [4, 3]), room("d", [4, 3])]],
      ["t3", [room("m3", [5, 6]), room("e", [5, 6]), room("f", [6, 5])]],
      ["t5", [room("m5", [9, 10])]],
    ]);
    const t = computeTaste({ lists, roomsByTheme, connectionsCracked: 2, now: NOW });
    expect(t.agreement).toEqual({ pct: 67, compared: 3 });
    expect(t.connections).toEqual({ cracked: 2, marqueesFinished: 5 });
  });

  it("finds the most ranked film, ties going to the most recent appearance", () => {
    const lists = [
      list("new", "2026-03-01T00:00:00Z", [film(1), film(2)]),
      list("mid", "2026-02-01T00:00:00Z", [film(3), film(1)]),
      list("old", "2026-01-01T00:00:00Z", [film(2), film(3)]),
    ];
    // 1, 2 and 3 each appear twice; 1 and 2 both appear in the newest list,
    // and 1 was seen first there, so 1 wins over 2; 3's latest is "mid".
    const t = computeTaste({ lists, connectionsCracked: 0, now: NOW });
    expect(t.mostRanked).toMatchObject({ tmdbId: 1, count: 2 });
  });

  it("has no most-ranked film when nothing repeats", () => {
    const lists = [list("a", PAST, [film(1)]), list("b", PAST, [film(2)])];
    const t = computeTaste({ lists, connectionsCracked: 0, now: NOW });
    expect(t.mostRanked).toBeNull();
  });
});

describe("percentagesSummingTo100", () => {
  it("always sums to 100 for non-empty counts", () => {
    for (const counts of [[1, 1, 1], [1, 2, 3, 4], [7, 1, 1, 1], [99, 1], [1, 1, 1, 1, 1, 1, 1]]) {
      const p = percentagesSummingTo100(counts);
      expect(p.reduce((a, b) => a + b, 0)).toBe(100);
      expect(p.every((x) => x >= 0)).toBe(true);
    }
  });
  it("gives zeros for an empty total", () => {
    expect(percentagesSummingTo100([0, 0])).toEqual([0, 0]);
  });
});

describe("tasteListsFromRows", () => {
  it("keeps done rows only and drops movies without a tmdb id", () => {
    const out = tasteListsFromRows([
      {
        id: "a",
        title: "A",
        theme_slug: "t",
        created_at: PAST,
        status: "done",
        list_movies: [
          { tmdb_id: 1, title: "One", poster_path: null, release_year: 1999, final_rank: 1 },
          { title: "No id", poster_path: null },
        ],
      },
      { id: "b", title: "B", created_at: PAST, status: "draft", list_movies: [] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].movies).toEqual([
      { tmdbId: 1, title: "One", posterPath: null, releaseYear: 1999, finalRank: 1 },
    ]);
  });
});

describe("prose", () => {
  const base = computeTaste({ lists: [], connectionsCracked: 0, now: NOW });

  it("speaks as the visitor's page and as the owner's", () => {
    const t = {
      ...base,
      agreement: { pct: 40, compared: 5 },
      connections: { cracked: 3, marqueesFinished: 6 },
      mostRanked: { tmdbId: 1, title: "Heat", posterPath: null, count: 3 },
    };
    expect(tasteSentences(t, { mode: "visitor", handle: "jr" })).toEqual([
      "@jr agrees with the room 40% of the time across 5 Marquees, and has cracked 3 connections.",
      "The film they come back to most is Heat, ranked in 3 lists.",
    ]);
    expect(tasteSentences(t, { mode: "owner", handle: "jr" })).toEqual([
      "You agree with the room 40% of the time across 5 Marquees, and have cracked 3 connections.",
      "The film you come back to most is Heat, ranked in 3 lists.",
    ]);
  });

  it("falls back to the Marquee count when agreement is null, and says nothing with no Marquees", () => {
    const t = { ...base, connections: { cracked: 1, marqueesFinished: 1 } };
    expect(tasteSentences(t, { mode: "visitor", handle: "jr" })).toEqual([
      "@jr has finished 1 Marquee and has cracked 1 connection.",
    ]);
    expect(tasteSentences(base, { mode: "owner", handle: "jr" })).toEqual([]);
  });

  it("describes the decades in one sentence", () => {
    const decades = [
      { decade: 1970, label: "1970s", count: 1, pct: 10 },
      { decade: 1990, label: "1990s", count: 4, pct: 40 },
      { decade: 2010, label: "2010s", count: 3, pct: 30 },
      { decade: 2020, label: "2020s", count: 2, pct: 20 },
    ];
    expect(decadesSentence(decades, { mode: "visitor", handle: "jr" })).toBe(
      "Their films lean 1990s (40%), then 2010s (30%).",
    );
    expect(decadesSentence([decades[1]], { mode: "owner", handle: "jr" })).toBe(
      "Your films are all from the 1990s.",
    );
    expect(decadesSentence([], { mode: "owner", handle: "jr" })).toBeNull();
  });
});
