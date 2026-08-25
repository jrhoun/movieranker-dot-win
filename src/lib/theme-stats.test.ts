import { describe, expect, it } from "vitest";
import { computeThemeStats, type ThemeRoom } from "./theme-stats";

const m = (tmdbId: number, over: Partial<ThemeRoom["movies"][number]> = {}) => ({
  tmdbId,
  title: `Movie ${tmdbId}`,
  posterPath: null,
  elo: 1000,
  parked: false,
  finalRank: null,
  ...over,
});
const room = (id: string, movies: ThemeRoom["movies"]): ThemeRoom => ({ id, movies });

describe("computeThemeStats", () => {
  const rooms = [
    room("a", [
      m(1, { finalRank: 1, elo: 1100 }),
      m(2, { elo: 900 }),
      m(3, { parked: true }),
    ]),
    room("b", [
      m(1, { finalRank: 2, elo: 1050 }),
      m(2, { finalRank: 1, elo: 1150 }),
      m(4, { parked: true, finalRank: 1 }), // parked + rank=1 must still count as #1
    ]),
  ];

  it("computes percentage math per movie with presence-based denominators", () => {
    const stats = computeThemeStats(rooms);
    expect(stats.rooms).toBe(2);
    const one = stats.movies.find((x) => x.tmdbId === 1)!;
    expect(one.appearances).toBe(2);
    expect(one.firstCount).toBe(1);
    expect(one.pctRankedFirst).toBeCloseTo(0.5);
    expect(one.pctHaventSeen).toBe(0);
    // Movie 3 appears in only one room: denominator is 1, not the room count.
    const three = stats.movies.find((x) => x.tmdbId === 3)!;
    expect(three.appearances).toBe(1);
    expect(three.pctHaventSeen).toBe(1);
    expect(three.pctRankedFirst).toBe(0);
  });

  it("orders divisiveness by highest elo stddev across rooms", () => {
    const stats = computeThemeStats(rooms);
    // Movie 1: elos [1100,1050] sd=25; movie 2: [900,1150] sd=125 -> most divisive.
    expect(stats.mostDivisiveId).toBe(2);
    const two = stats.movies.find((x) => x.tmdbId === 2)!;
    expect(two.eloStdDev).toBeCloseTo(125);
  });

  it("returns null stddev for single-room movies and no divisive pick when nothing repeats", () => {
    const solo = computeThemeStats([room("a", [m(1), m(2)])]);
    for (const mv of solo.movies) expect(mv.eloStdDev).toBeNull();
    expect(solo.mostDivisiveId).toBeUndefined();
  });

  it("detects a champion only at 100% firsts across >=2 rooms and >=2 appearances", () => {
    const champ = computeThemeStats([
      room("a", [m(7, { finalRank: 1 }), m(8)]),
      room("b", [m(7, { finalRank: 1 }), m(8, { finalRank: 1 })]),
      room("c", [m(9, { finalRank: 1 })]), // movie 9: 100% but present once
    ]);
    expect(champ.championId).toBe(7);
  });

  it("picks no champion on a tie between top movies", () => {
    const tied = computeThemeStats([
      room("a", [m(1, { finalRank: 1 }), m(2)]),
      room("b", [m(2, { finalRank: 1 }), m(1)]),
    ]);
    expect(tied.championId).toBeNull();
    expect(tied.mostDivisiveId).toBeDefined();
  });

  it("has no champion with fewer than two rooms even at 100%", () => {
    const single = computeThemeStats([room("a", [m(5, { finalRank: 1 })])]);
    expect(single.championId).toBeNull();
  });

  it("handles empty input", () => {
    expect(computeThemeStats([])).toEqual({
      rooms: 0,
      movies: [],
      mostDivisiveId: undefined,
      championId: null,
    });
  });
});
