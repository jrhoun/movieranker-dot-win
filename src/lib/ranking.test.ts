import { describe, expect, test } from "vitest";
import {
  STABILITY_MIN_COMPARISONS,
  STABILITY_VOTES_N,
  STABLE_ORDER_TOLERANCE,
  SHARPEN_COMFORT_GAP,
  SHARPEN_GAP_THRESHOLD,
  applyWin,
  closeCallProgress,
  countClosePairs,
  estimateRemainingVotes,
  finalizeRanks,
  expectedConsensusVotes,
  isStable,
  nextMatchup,
  recordMatchupResult,
  sharpenNextPair,
  stabilityVotesN,
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

  describe("anti-immediate-repeat (previousPair)", () => {
    const roster = [
      movie({ tmdbId: 1, elo: 1000 }),
      movie({ tmdbId: 2, elo: 1005 }),
      movie({ tmdbId: 3, elo: 1012 }),
    ];

    test("skips the exact previous matchup when an alternative exists", () => {
      // closest pair is 1&2; excluding it must yield the next-closest, 2&3
      expect(nextMatchup(roster, [1, 2]).map((m) => m.tmdbId)).toEqual([2, 3]);
    });

    test("previousPair order does not matter", () => {
      expect(nextMatchup(roster, [2, 1]).map((m) => m.tmdbId)).toEqual([2, 3]);
    });

    test("returns the rematch when only two active movies exist", () => {
      const two = [roster[0], roster[1]];
      expect(nextMatchup(two, [1, 2]).map((m) => m.tmdbId)).toEqual([1, 2]);
    });

    test("widens past the least-compared tier when it IS the previous pair", () => {
      // least-compared tier is exactly {1,2} = last matchup -> fall back to the
      // full roster and pick the closest pair that isn't {1,2}
      const tiered = [
        movie({ tmdbId: 1, elo: 1000, comparisons: 0 }),
        movie({ tmdbId: 2, elo: 1004, comparisons: 0 }),
        movie({ tmdbId: 3, elo: 1008, comparisons: 1 }),
        movie({ tmdbId: 4, elo: 1200, comparisons: 1 }),
      ];
      expect(nextMatchup(tiered, [2, 1]).map((m) => m.tmdbId)).toEqual([2, 3]);
    });

    test("undefined previousPair keeps plain behavior", () => {
      expect(nextMatchup(roster).map((m) => m.tmdbId)).toEqual([1, 2]);
    });

    test("never repeats a pair when uncompared pairs exist in pairHistory", () => {
      const four = [
        movie({ tmdbId: 1, elo: 1016, comparisons: 1 }),
        movie({ tmdbId: 2, elo: 984, comparisons: 1 }),
        movie({ tmdbId: 3, elo: 1016, comparisons: 1 }),
        movie({ tmdbId: 4, elo: 984, comparisons: 1 }),
      ];
      // History: [1,2] and [3,4] have played.
      const history: [number, number][] = [
        [1, 2],
        [3, 4],
      ];
      // Pair [1, 3] or [2, 4] must be chosen — NOT [1, 2] or [3, 4] again!
      const [a, b] = nextMatchup(four, [3, 4], history);
      const pair = [a.tmdbId, b.tmdbId].sort();
      expect(pair).not.toEqual([1, 2]);
      expect(pair).not.toEqual([3, 4]);
      expect([[1, 3], [2, 4]]).toContainEqual(pair);
    });

    test("in a 6-movie list (like weekly marquee), all 15 unique pairs are played before any rematch", () => {
      let currentMovies = Array.from({ length: 6 }, (_, i) => movie({ tmdbId: i + 1 }));
      const history: [number, number][] = [];
      const seenPairs = new Set<string>();
      let prev: [number, number] | undefined;

      for (let i = 0; i < 15; i++) {
        const [a, b] = nextMatchup(currentMovies, prev, history);
        const k = a.tmdbId < b.tmdbId ? `${a.tmdbId}:${b.tmdbId}` : `${b.tmdbId}:${a.tmdbId}`;
        expect(seenPairs.has(k)).toBe(false); // must NEVER repeat in first 15 votes!
        seenPairs.add(k);
        history.push([a.tmdbId, b.tmdbId]);
        currentMovies = applyWin(currentMovies, a.tmdbId, b.tmdbId);
        prev = [a.tmdbId, b.tmdbId];
      }

      expect(seenPairs.size).toBe(15);
    });
  });
});

describe("recordMatchupResult", () => {
  test("applies the win and increments comparisons", () => {
    const movies = [
      movie({ tmdbId: 1, elo: 1100 }),
      movie({ tmdbId: 2, elo: 1060 }),
      movie({ tmdbId: 3, elo: 1055 }),
    ];
    const r = recordMatchupResult(movies, 3, 2);
    expect(r.movies[2].comparisons).toBe(1);
    expect(r.movies[1].elo).toBeLessThan(1060);
  });

  test(`tie-band signature: swap within a ${STABLE_ORDER_TOLERANCE} band is NOT an order change`, () => {
    // gap 20 <= tolerance: one band; underdog 2 winning swaps their positions
    const movies = [movie({ tmdbId: 1, elo: 1000 }), movie({ tmdbId: 2, elo: 980 })];
    const r = recordMatchupResult(movies, 2, 1);
    expect(r.orderChanged).toBe(false);
    // but they really did swap places in raw desc-elo
    const top = [...r.movies].sort((x, y) => y.elo - x.elo)[0];
    expect(top.tmdbId).toBe(2);
  });

  test("movement across bands IS an order change", () => {
    // gap 34 > tolerance: separate bands; underdog 2 winning jumps the boundary
    const movies = [movie({ tmdbId: 1, elo: 1034 }), movie({ tmdbId: 2, elo: 1000 })];
    const r = recordMatchupResult(movies, 2, 1);
    const top = [...r.movies].sort((x, y) => y.elo - x.elo)[0];
    expect(top.tmdbId).toBe(2);
    expect(r.orderChanged).toBe(true);
  });

  test(`band boundary is exact at ${STABLE_ORDER_TOLERANCE}: gap == tolerance stays one band`, () => {
    // gap exactly 30 -> merged (<=); upset swap inside the merged band
    const movies = [movie({ tmdbId: 1, elo: 1030 }), movie({ tmdbId: 2, elo: 1000 })];
    const r = recordMatchupResult(movies, 2, 1);
    const top = [...r.movies].sort((x, y) => y.elo - x.elo)[0];
    expect(top.tmdbId).toBe(2);
    expect(r.orderChanged).toBe(false);
  });
});

describe("isStable", () => {
  test(`requires ${STABILITY_MIN_COMPARISONS}+ comparisons, a prior significant split, and a size-scaled quiet streak`, () => {
    const voted = [
      movie({ tmdbId: 1, elo: 1200, comparisons: 3 }),
      movie({ tmdbId: 2, elo: 1100, comparisons: 3 }),
      movie({ tmdbId: 3, elo: 1000, comparisons: 3 }),
    ];
    // fresh session: no differentiation -> never stable, however quiet
    expect(isStable(voted, 1000, false)).toBe(false);
    // one movie without enough evidence -> not stable
    const thin = [voted[0], voted[1], movie({ tmdbId: 4, elo: 900, comparisons: 2 })];
    expect(isStable(thin, STABILITY_VOTES_N, true)).toBe(false);
    // parked movies are exempt from the evidence requirement; 3 active movies
    // owe ceil(3/2)=2 -> floored at 3 quiet votes (size-scaled streak)
    const parkedThin = [
      ...voted,
      movie({ tmdbId: 4, elo: 900, comparisons: 0, parked: true }),
    ];
    expect(isStable(parkedThin, 2, true)).toBe(false);
    expect(isStable(parkedThin, 3, true)).toBe(true);
    // a big field keeps the full STABILITY_VOTES_N streak: 12 active owe ceil(12/2)=6;
    // simulate by checking the scaling helper directly
    expect(stabilityVotesN(12)).toBe(STABILITY_VOTES_N);
    expect(stabilityVotesN(20)).toBe(STABILITY_VOTES_N);
    expect(stabilityVotesN(4)).toBe(3);
    expect(stabilityVotesN(6)).toBe(3);
    // tiny gaps don't matter anymore — differentiation + quiet streak suffice
    expect(isStable([voted[0], movie({ tmdbId: 4, elo: 1199, comparisons: 3 })], stabilityVotesN(2), true)).toBe(true);
  });
});

describe("expectedConsensusVotes", () => {
  test("n·log₂n votes — matches r5 sim medians (85% consistency)", () => {
    expect(expectedConsensusVotes(4)).toBe(8);
    expect(expectedConsensusVotes(6)).toBe(16);
    expect(expectedConsensusVotes(20)).toBe(87);
    // degenerate guard: log floor at 2 keeps this finite
    expect(expectedConsensusVotes(1)).toBe(1);
  });
});

describe("estimateRemainingVotes", () => {
  test("counts adjacent pairs within comfort band; ceil(count * 2), min 1", () => {
    // both gaps > comfort band -> only min-1 left
    const spread = [
      movie({ tmdbId: 1, elo: 1300 }),
      movie({ tmdbId: 2, elo: 1100 }),
      movie({ tmdbId: 3, elo: 900 }),
    ];
    expect(estimateRemainingVotes(spread)).toBe(1); // 0 close calls -> min 1
    // both gaps within band -> 2 close calls
    const tight = [
      movie({ tmdbId: 1, elo: 1010 }),
      movie({ tmdbId: 2, elo: 1000 }),
      movie({ tmdbId: 3, elo: 990 }),
    ];
    expect(estimateRemainingVotes(tight)).toBe(4);
  });

  test("stability leaves sharpen work: close calls counted, then gone after sharpening", () => {
    let order = [
      movie({ tmdbId: 1, elo: 1050, comparisons: 3 }),
      movie({ tmdbId: 2, elo: 1030, comparisons: 3 }),
      movie({ tmdbId: 3, elo: 1000, comparisons: 3 }),
    ];
    // differentiated + settled, while every gap < comfort band
    expect(isStable(order, STABILITY_VOTES_N, true)).toBe(true);
    expect(sharpenNextPair(order)).not.toBeNull();
    expect(estimateRemainingVotes(order)).toBe(4); // 2 close calls

    // simulated sharpen votes push both gaps past the comfort band
    order = [
      movie({ tmdbId: 1, elo: 1250 }),
      movie({ tmdbId: 2, elo: 1110 }),
      movie({ tmdbId: 3, elo: 970 }),
    ];
    expect(sharpenNextPair(order)).toBeNull();
    expect(estimateRemainingVotes(order)).toBe(1); // min-1
  });
});

describe("countClosePairs", () => {
  test("all-equal elos: every adjacent pair is close (n-1)", () => {
    const tied = Array.from({ length: 19 }, (_, i) => movie({ tmdbId: i + 1 }));
    expect(countClosePairs(tied)).toBe(18);
  });

  test("matches the comfort band and ignores parked-free ordering", () => {
    const spread = [
      movie({ tmdbId: 1, elo: 1300 }),
      movie({ tmdbId: 2, elo: 1200 }), // gap exactly at band -> close
      movie({ tmdbId: 3, elo: 1000 }), // gap 200 -> not close
    ];
    expect(countClosePairs(spread)).toBe(1);
    expect(estimateRemainingVotes(spread)).toBe(2); // ceil(1*2), no floor needed
  });
});

describe("closeCallProgress", () => {
  test("resolved-vs-initial fraction", () => {
    expect(closeCallProgress(12, 18)).toBe(
      "12 of 18 matchups still too close to call",
    );
  });

  test("zero close calls reads as ready to finish", () => {
    expect(closeCallProgress(0, 18)).toBe("No close calls left — ready to finish.");
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
      movie({ tmdbId: 1, elo: 1300, comparisons: 3 }),
      movie({ tmdbId: 2, elo: 1220, comparisons: 3 }), // gap 80: stable, yet sharpenable
      movie({ tmdbId: 3, elo: 1000, comparisons: 3 }),
    ];
    expect(isStable(order, STABILITY_VOTES_N, true)).toBe(true);
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

  test("assigns null rank to parked movies without disrupting active rankings", () => {
    const movies = [
      movie({ tmdbId: 1, elo: 1300 }),
      movie({ tmdbId: 2, elo: 1200, parked: true }),
      movie({ tmdbId: 3, elo: 1100 }),
    ];
    expect(finalizeRanks(movies)).toEqual([
      { tmdbId: 1, rank: 1 },
      { tmdbId: 3, rank: 2 },
      { tmdbId: 2, rank: null },
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

describe("simulation: stability reachable within ~n log n * 2 votes", () => {
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

  /** Vote with the engine's own pairing until isStable fires; returns vote count.
   * Mirrors play-room: each vote excludes the just-voted pair from the next pick. */
  function simulate(n: number, seed: number, maxVotes: number): { converged: boolean; votes: number } {
    const rand = rng(seed);
    const strength = Array.from({ length: n }, () => rand());
    let movies = Array.from({ length: n }, (_, i) => movie({ tmdbId: i + 1 }));
    let votesSinceOrderChange = 0;
    let significantOnce = false;
    let votes = 0;
    let prevIds: [number, number] | undefined;
    const history: [number, number][] = [];
    while (votes < maxVotes) {
      const [a, b] = nextMatchup(movies, prevIds, history);
      const favoriteWins = rand() < 0.85;
      const favorite = strength[a.tmdbId - 1] > strength[b.tmdbId - 1] ? a : b;
      const underdog = favorite === a ? b : a;
      const winner = favoriteWins ? favorite : underdog;
      const loser = winner === a ? b : a;
      const result = recordMatchupResult(movies, winner.tmdbId, loser.tmdbId);
      movies = result.movies;
      prevIds = [a.tmdbId, b.tmdbId];
      history.push([winner.tmdbId, loser.tmdbId]);
      if (result.orderChanged) {
        votesSinceOrderChange = 0;
        significantOnce = true;
      } else votesSinceOrderChange++;
      votes++;
      if (
        votesSinceOrderChange >= STABILITY_VOTES_N &&
        isStable(movies, votesSinceOrderChange, significantOnce)
      ) {
        return { converged: true, votes };
      }
    }
    return { converged: false, votes };
  }

  // Round-4 retune: stability additionally requires DIFFERENTIATION —
  // STABILITY_MIN_COMPARISONS (3) for every active movie plus a once-flag that
  // a significant (cross-band) reorder has happened at least once. This closes
  // round 3's degenerate hole where an all-1000-elo list sat in one giant
  // tie-band and hit stable at exactly 6 votes with zero information.
  // History of this harness (seeds 1012/1016/1020, 85% favorite consistency):
  //   gap>50 floor:       ~1441-1976 / never / never (n=12/16/20)
  //   gap>25 floor:       643 / 1505 / 3202
  //   pure order:         244 / 490 / 804
  //   tie-banded only:    55 / 6 / 6 (degenerate: no differentiation required)
  //   differentiated:     55 / 90 / 38 — all inside ⌈n·log₂n⌉·2 (88/128/174).
  // Round-5 retune (small-roster complaints: "same movies over and over",
  // "a LOT of votes for just 6 movies"): anti-repeat pairing + band-signature
  // hysteresis (split needs gap > tol+15, merge < tol-15) so boundary-hovering
  // pairs stop resetting settling, plus size-scaled quiet streak. Harness now
  // mirrors play-room by excluding the previous matchup from each next pick.
  // History of this harness (seeds 1012/1016/1020, 85% favorite consistency):
  //   gap>50 floor:       ~1441-1976 / never / never (n=12/16/20)
  //   gap>25 floor:       643 / 1505 / 3202
  //   pure order:         244 / 490 / 804
  //   tie-banded only:    55 / 6 / 6 (degenerate: no differentiation required)
  //   differentiated r4:  55 / 90 / 38 — inside ⌈n·log₂n⌉·2 (88/128/174).
  //   differentiated r5:  49 / 56 / 75 — variance collapsed vs r4 outliers.
  const SEEDS: Record<number, number> = { 4: 1400, 6: 1600, 8: 1800, 12: 1012, 16: 1016, 20: 1020 };
  test.each([4, 6, 8, 12, 16, 20])("%i movies stabilize within n·log₂n·2 votes", (n) => {
    const budget = Math.ceil(n * Math.log2(n)) * 2;
    const result = simulate(n, SEEDS[n], budget);
    console.log(
      `stability retune r5: ${n} movies -> ${result.converged ? result.votes : "NOT stable"} votes (budget ${budget})`,
    );
    expect(result.converged).toBe(true);
    expect(result.votes).toBeLessThanOrEqual(budget);
  });
});
