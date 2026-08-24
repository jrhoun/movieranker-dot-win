import { describe, expect, test } from "vitest";
import { applyWin, nextMatchup, type RankedMovie } from "./ranking";

const K = 32;

function movie(partial: Partial<RankedMovie>): RankedMovie {
  return {
    tmdbId: 1,
    title: "Test",
    posterPath: null,
    releaseYear: null,
    elo: 1000,
    comparisons: 0,
    parked: false,
    ...partial,
  };
}

describe("applyWin", () => {
  test("equal ratings: winner gains exactly K/2", () => {
    const movies = [movie({}), movie({ tmdbId: 2 })];
    const result = applyWin(movies, 1, 2);
    expect(result[0].elo).toBe(1016);
    expect(result[1].elo).toBe(984);
  });

  test("higher-rated winner gains exactly K*(1-1/(1+10^((rl-rw)/400)))", () => {
    const movies = [movie({ tmdbId: 1, elo: 1100 }), movie({ tmdbId: 2, elo: 1000 })];
    const result = applyWin(movies, 1, 2);
    const expected = 1 / (1 + Math.pow(10, (1000 - 1100) / 400));
    expect(result[0].elo).toBeCloseTo(1100 + K * (1 - expected), 10);
    expect(result[1].elo).toBeCloseTo(1000 - K * (1 - expected), 10);
  });

  test("loss is symmetric: loser loses what winner gains", () => {
    const movies = [movie({ tmdbId: 1, elo: 900 }), movie({ tmdbId: 2, elo: 1050 })];
    const result = applyWin(movies, 1, 2);
    const gain = result[0].elo - 900;
    expect(1050 - result[1].elo).toBeCloseTo(gain, 10);
  });

  test("ratings never drop below 1", () => {
    const movies = [movie({ tmdbId: 1, elo: 1 }), movie({ tmdbId: 2, elo: 15 })];
    const result = applyWin(movies, 1, 2);
    expect(result[1].elo).toBe(1); // clamped
    expect(result[0].elo).toBeGreaterThan(1);
  });

  test("increments comparisons for both", () => {
    const movies = [movie({}), movie({ tmdbId: 2, comparisons: 3 })];
    const result = applyWin(movies, 1, 2);
    expect(result[0].comparisons).toBe(1);
    expect(result[1].comparisons).toBe(4);
  });

  test("does not mutate input array or its movies", () => {
    const movies = [movie({}), movie({ tmdbId: 2 })];
    const snapshot = JSON.parse(JSON.stringify(movies));
    applyWin(movies, 1, 2);
    expect(movies).toEqual(snapshot);
  });
});

describe("nextMatchup", () => {
  test("picks closest-rated active pair", () => {
    const movies = [
      movie({ tmdbId: 1, elo: 1000 }),
      movie({ tmdbId: 2, elo: 1200 }),
      movie({ tmdbId: 3, elo: 1190 }),
    ];
    const [a, b] = nextMatchup(movies);
    expect([a.tmdbId, b.tmdbId]).toEqual([3, 2]);
  });

  test("skips parked movies", () => {
    const movies = [
      movie({ tmdbId: 1, elo: 1000 }),
      movie({ tmdbId: 2, elo: 1001 }),
      movie({ tmdbId: 3, elo: 1002, parked: true }),
      movie({ tmdbId: 4, elo: 1400 }),
    ];
    const [a, b] = nextMatchup(movies);
    // closest active pair is 1&2
    expect([a.tmdbId, b.tmdbId]).toEqual([1, 2]);
  });

  test("deterministic tie-break by tmdbId ascending", () => {
    const movies = [
      movie({ tmdbId: 9, elo: 1000 }),
      movie({ tmdbId: 4, elo: 1000 }),
      movie({ tmdbId: 7, elo: 1000 }),
    ];
    const [a, b] = nextMatchup(movies);
    expect([a.tmdbId, b.tmdbId]).toEqual([4, 7]);
  });

  test("throws if fewer than 2 active movies", () => {
    expect(() => nextMatchup([])).toThrow();
    expect(() =>
      nextMatchup([movie({ parked: true }), movie({ tmdbId: 2 })])
    ).toThrow();
  });
});
