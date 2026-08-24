import { describe, expect, test } from "vitest";
import {
  STABILITY_VOTES_N,
  SHARPEN_COMFORT_GAP,
  SHARPEN_GAP_THRESHOLD,
  applyWin,
  estimateRemainingVotes,
  finalizeRanks,
  isStable,
  nextMatchup,
  recordMatchupResult,
  sharpenNextPair,
  type RankedMovie,
} from "./ranking";

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

  test("throws when winner and loser are the same movie", () => {
    const movies = [movie({}), movie({ tmdbId: 2 })];
    // guard must fire before the first-match lookup nets a single +delta
    expect(() => applyWin(movies, 1, 1)).toThrow("winner and loser must differ");
  });

  test("throws when winner or loser tmdbId is absent", () => {
    const movies = [movie({}), movie({ tmdbId: 2 })];
    expect(() => applyWin(movies, 99, 2)).toThrow();
    expect(() => applyWin(movies, 1, 99)).toThrow();
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

  test("odd-rotation fallback: lone least-compared pairs with closest-rated peer", () => {
    // 1 has fewest comparisons; among the rest, 3 is closest in elo
    const movies = [
      movie({ tmdbId: 1, elo: 1000, comparisons: 0 }),
      movie({ tmdbId: 2, elo: 1300, comparisons: 2 }),
      movie({ tmdbId: 3, elo: 1010, comparisons: 2 }),
      movie({ tmdbId: 4, elo: 1400, comparisons: 2 }),
    ];
    const [a, b] = nextMatchup(movies);
    expect([a.tmdbId, b.tmdbId]).toEqual([1, 3]);
  });
});

describe("recordMatchupResult", () => {
  test("applies the win and reports order change", () => {
    // 3 beats 2 and jumps over it in the desc-elo order; 1 stays on top
    const movies = [
      movie({ tmdbId: 1, elo: 1100 }),
      movie({ tmdbId: 2, elo: 1060 }),
      movie({ tmdbId: 3, elo: 1055 }),
    ];
    const r1 = recordMatchupResult(movies, 3, 2);
    expect(r1.orderChanged).toBe(true);
    // favorite winning leaves order untouched
    const r2 = recordMatchupResult(movies, 1, 3);
    expect(r2.orderChanged).toBe(false);
    expect(r2.movies[0].comparisons).toBe(1);
  });
});

describe("isStable", () => {
  test(`stable only after ${STABILITY_VOTES_N} votes with all gaps > ${SHARPEN_GAP_THRESHOLD}`, () => {
    const order = [
      movie({ tmdbId: 1, elo: 1200 }),
      movie({ tmdbId: 2, elo: 1100 }),
      movie({ tmdbId: 3, elo: 1000 }),
    ];
    expect(isStable(order, STABILITY_VOTES_N - 1)).toBe(false);
    expect(isStable(order, STABILITY_VOTES_N)).toBe(true);
    expect(isStable(order, STABILITY_VOTES_N + 5)).toBe(true);
    // one gap exactly at threshold is not stable (must be > threshold)
    const tight = [order[0], movie({ tmdbId: 2, elo: 1150 }), order[2]];
    expect(isStable(tight, STABILITY_VOTES_N)).toBe(false);
  });
});

describe("estimateRemainingVotes", () => {
  test("ceil(unstable gaps * 2), min 1", () => {
    const spread = [
      movie({ tmdbId: 1, elo: 1300 }),
      movie({ tmdbId: 2, elo: 1100 }),
      movie({ tmdbId: 3, elo: 900 }),
    ];
    expect(estimateRemainingVotes(spread)).toBe(1); // 0 unstable gaps -> min 1
    const tight = [
      movie({ tmdbId: 1, elo: 1010 }),
      movie({ tmdbId: 2, elo: 1000 }),
      movie({ tmdbId: 3, elo: 990 }),
    ];
    expect(estimateRemainingVotes(tight)).toBe(4); // 2 unstable gaps -> ceil(4)
  });
});

describe("sharpenNextPair", () => {
  test(`returns adjacent pair with smallest gap when <= ${SHARPEN_COMFORT_GAP}`, () => {
    const order = [
      movie({ tmdbId: 1, elo: 1300 }),
      movie({ tmdbId: 2, elo: 1200 }),
      movie({ tmdbId: 3, elo: 1180 }),
    ];
    const [a, b] = sharpenNextPair(order)!;
    expect([a.tmdbId, b.tmdbId]).toEqual([3, 2]); // gap 20 < gap 100
  });

  test(`has work at stability: a ${SHARPEN_GAP_THRESHOLD + 30} gap is above the stability threshold but within comfort`, () => {
    const order = [
      movie({ tmdbId: 1, elo: 1300 }),
      movie({ tmdbId: 2, elo: 1220 }), // gap 80: stable, yet sharpenable
      movie({ tmdbId: 3, elo: 1000 }),
    ];
    expect(isStable(order, STABILITY_VOTES_N)).toBe(true);
    expect(sharpenNextPair(order)).not.toBeNull();
  });

  test(`returns null when no gap <= ${SHARPEN_COMFORT_GAP}`, () => {
    const order = [
      movie({ tmdbId: 1, elo: 1330 }),
      movie({ tmdbId: 2, elo: 1200 }),
      movie({ tmdbId: 3, elo: 1070 }),
    ];
    expect(sharpenNextPair(order)).toBeNull();
  });
});

describe("finalizeRanks", () => {
  test("desc by elo; ties share rank, next skipped", () => {
    const movies = [
      movie({ tmdbId: 1, elo: 1200 }),
      movie({ tmdbId: 2, elo: 1100 }),
      movie({ tmdbId: 3, elo: 1100 }),
      movie({ tmdbId: 4, elo: 900 }),
    ];
    expect(finalizeRanks(movies)).toEqual([
      { tmdbId: 1, rank: 1 },
      { tmdbId: 2, rank: 2 },
      { tmdbId: 3, rank: 2 },
      { tmdbId: 4, rank: 4 },
    ]);
  });
});

describe("property: planted-order recovery", () => {
  // mulberry32 — tiny deterministic PRNG, test-only
  function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function spearman(actualDesc: number[], plantedRank: Record<number, number>): number {
    // actualDesc: tmdbIds in final desc-elo order; plantedRank: tmdbId -> rank 1..n
    const n = actualDesc.length;
    const finalRank = new Map<number, number>();
    actualDesc.forEach((id, i) => finalRank.set(id, i + 1));
    const d2 = actualDesc.reduce(
      (sum, id) => sum + (finalRank.get(id)! - plantedRank[id]) ** 2,
      0,
    );
    return 1 - (6 * d2) / (n * (n * n - 1));
  }

  test("~200 votes at 85% consistency recover planted top-3 and Spearman >= 0.9", () => {
    // seed chosen after checking determinism against thresholds; do not change thresholds instead
    const SEED = 20260823;
    const rand = rng(SEED);
    // planted strength order: tmdbId 101 strongest ... 108 weakest
    const planted = [101, 102, 103, 104, 105, 106, 107, 108];
    const plantedRank: Record<number, number> = {};
    planted.forEach((id, i) => (plantedRank[id] = i + 1));

    let movies = planted.map((id) => movie({ tmdbId: id, elo: 1000 }));
    const nVotes = 200;
    for (let v = 0; v < nVotes; v++) {
      const i = Math.floor(rand() * movies.length);
      let j = Math.floor(rand() * (movies.length - 1));
      if (j >= i) j++;
      const stronger = plantedRank[movies[i].tmdbId] < plantedRank[movies[j].tmdbId] ? i : j;
      const weaker = stronger === i ? j : i;
      const favoriteWins = rand() < 0.85;
      const w = favoriteWins ? stronger : weaker;
      const l = w === i ? j : i;
      movies = applyWin(movies, movies[w].tmdbId, movies[l].tmdbId);
    }

    const finalOrder = [...movies]
      .sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId)
      .map((m) => m.tmdbId);
    expect(finalOrder.slice(0, 3).sort((a, b) => a - b)).toEqual(
      [...planted.slice(0, 3)].sort((a, b) => a - b),
    );
    const rho = spearman(finalOrder, plantedRank);
    expect(rho).toBeGreaterThanOrEqual(0.9);
  });
});
