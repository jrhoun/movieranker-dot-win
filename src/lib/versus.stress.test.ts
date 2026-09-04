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

const makeMovie = (tmdbId: number, rank: number, title?: string): VersusEntry => ({
  tmdbId,
  title: title ?? `Movie ${tmdbId}`,
  posterPath: `/p-${tmdbId}.jpg`,
  rank,
});

// Helper to generate a random permutation of [1..n]
function randomPermutation(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

describe("versus.ts Empirical Stress Testing", () => {
  // -------------------------------------------------------------------------
  // 1. BOUNDARY & SIZE SCALING
  // -------------------------------------------------------------------------
  describe("1. Boundary & Size Scaling (0, 1, 1000 items)", () => {
    test("0 shared movies: empty lists", () => {
      const result = computeVersus([], []);
      expect(result.shared).toEqual([]);
      expect(result.agreementPct).toBeNull();
      expect(result.compatibilityScore).toBeNull();
      expect(result.sharpestClash).toBeNull();
      expect(result.sharedFavorites).toEqual([]);
      expect(result.biggestArguments).toEqual([]);
      expect(result.onlyInA).toEqual([]);
      expect(result.onlyInB).toEqual([]);
    });

    test("0 shared movies: disjoint non-empty sets (50 items each)", () => {
      const listA = Array.from({ length: 50 }, (_, i) => makeMovie(i + 1, i + 1));
      const listB = Array.from({ length: 50 }, (_, i) => makeMovie(i + 51, i + 1));

      const result = computeVersus(listA, listB);
      expect(result.shared).toHaveLength(0);
      expect(result.agreementPct).toBeNull();
      expect(result.compatibilityScore).toBeNull();
      expect(result.sharpestClash).toBeNull();
      expect(result.sharedFavorites).toHaveLength(0);
      expect(result.biggestArguments).toHaveLength(0);
      expect(result.onlyInA).toHaveLength(50);
      expect(result.onlyInB).toHaveLength(50);
    });

    test("1 shared movie: delta = 0", () => {
      const listA = [makeMovie(42, 1)];
      const listB = [makeMovie(42, 1), makeMovie(99, 2)];

      const result = computeVersus(listA, listB);
      expect(result.shared).toHaveLength(1);
      expect(result.shared[0].tmdbId).toBe(42);
      expect(result.shared[0].delta).toBe(0);
      expect(result.agreementPct).toBeNull();
      expect(result.compatibilityScore).toBeNull();
      expect(result.sharpestClash).toBeNull(); // delta is 0
      expect(result.sharedFavorites).toHaveLength(1);
      expect(result.sharedFavorites[0].tmdbId).toBe(42);
      expect(result.biggestArguments).toHaveLength(1);
      expect(result.onlyInA).toHaveLength(0);
      expect(result.onlyInB).toHaveLength(1);
    });

    test("1 shared movie: large delta", () => {
      const listA = [makeMovie(42, 1)];
      const listB = [makeMovie(42, 100)];

      const result = computeVersus(listA, listB);
      expect(result.shared).toHaveLength(1);
      expect(result.shared[0].delta).toBe(99);
      expect(result.agreementPct).toBeNull();
      expect(result.sharpestClash?.tmdbId).toBe(42);
      expect(result.sharpestClash?.delta).toBe(99);
      expect(result.biggestArguments).toHaveLength(1);
    });

    test("1,000 shared movies: performance and numerical stability", () => {
      const N = 1000;
      const listA = Array.from({ length: N }, (_, i) => makeMovie(i + 1, i + 1));
      const listB = Array.from({ length: N }, (_, i) => makeMovie(i + 1, i + 1));

      const startTime = performance.now();
      const result = computeVersus(listA, listB);
      const elapsedMs = performance.now() - startTime;

      expect(elapsedMs).toBeLessThan(500); // Must compute 499,500 pairs in under 500ms
      expect(result.shared).toHaveLength(N);
      expect(result.agreementPct).toBe(100);
      expect(result.compatibilityScore).toBe(100);
      expect(result.sharpestClash).toBeNull();
      expect(result.biggestArguments).toHaveLength(5);
      expect(result.sharedFavorites.length).toBeGreaterThan(0);
      expect(result.onlyInA).toHaveLength(0);
      expect(result.onlyInB).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. IDENTICAL RANKINGS ACROSS VARIOUS SIZES
  // -------------------------------------------------------------------------
  describe("2. Identical Rankings", () => {
    const testSizes = [2, 3, 5, 10, 50, 100, 500];

    test.each(testSizes)("size N = %i yields exactly 100% agreement and null clash", (N) => {
      const listA = Array.from({ length: N }, (_, i) => makeMovie(i + 1, i + 1));
      const listB = Array.from({ length: N }, (_, i) => makeMovie(i + 1, i + 1));

      const result = computeVersus(listA, listB);
      expect(result.agreementPct).toBe(100);
      expect(result.compatibilityScore).toBe(100);
      expect(compatibilityTier(result.agreementPct!)).toBe("Basically twins");
      expect(result.sharpestClash).toBeNull();
      expect(result.biggestArguments.every((m) => m.delta === 0)).toBe(true);
      expect(result.onlyInA).toEqual([]);
      expect(result.onlyInB).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 3. COMPLETELY REVERSED RANKINGS ACROSS VARIOUS SIZES
  // -------------------------------------------------------------------------
  describe("3. Completely Reversed Rankings", () => {
    const testSizes = [2, 3, 4, 10, 50, 100, 500];

    test.each(testSizes)("size N = %i yields exactly 0% agreement", (N) => {
      const listA = Array.from({ length: N }, (_, i) => makeMovie(i + 1, i + 1));
      const listB = Array.from({ length: N }, (_, i) => makeMovie(i + 1, N - i));

      const result = computeVersus(listA, listB);
      expect(result.agreementPct).toBe(0);
      expect(result.compatibilityScore).toBe(0);
      expect(compatibilityTier(result.agreementPct!)).toBe("Opposite ends of the couch");

      // In reversed ranking:
      // Movie 1 has rankA=1, rankB=N, delta = N-1, minRank = 1
      // Movie N has rankA=N, rankB=1, delta = 1-N, minRank = 1
      // Tie breaker prefers movie 1 (rankA=1 vs rankA=N)
      expect(result.sharpestClash?.tmdbId).toBe(1);
      expect(result.sharpestClash?.delta).toBe(N - 1);
    });
  });

  // -------------------------------------------------------------------------
  // 4. RANDOM PERMUTATIONS (PROPERTY-BASED & SYMMETRY TESTING)
  // -------------------------------------------------------------------------
  describe("4. Random Permutations (10,000 iterations)", () => {
    test("10,000 random permutations satisfy mathematical invariants", () => {
      let sumPct = 0;
      let countPairs = 0;

      for (let iter = 0; iter < 10000; iter++) {
        const N = Math.floor(Math.random() * 20) + 2; // N from 2 to 21
        const permA = randomPermutation(N);
        const permB = randomPermutation(N);

        const listA: VersusEntry[] = permA.map((tmdbId, idx) => makeMovie(tmdbId, idx + 1));
        const listB: VersusEntry[] = permB.map((tmdbId, idx) => makeMovie(tmdbId, idx + 1));

        const resAB = computeVersus(listA, listB);
        const resBA = computeVersus(listB, listA);

        // 1. Percentage validity
        expect(resAB.agreementPct).not.toBeNull();
        expect(Number.isInteger(resAB.agreementPct)).toBe(true);
        expect(resAB.agreementPct!).toBeGreaterThanOrEqual(0);
        expect(resAB.agreementPct!).toBeLessThanOrEqual(100);
        expect(resAB.compatibilityScore).toBe(resAB.agreementPct);

        // 2. Symmetry property: agreementPct(A, B) === agreementPct(B, A)
        expect(resAB.agreementPct).toBe(resBA.agreementPct);

        // 3. Size constraints
        expect(resAB.shared).toHaveLength(N);
        expect(resAB.biggestArguments.length).toBeLessThanOrEqual(5);

        // 4. biggestArguments non-increasing absolute deltas
        for (let i = 0; i < resAB.biggestArguments.length - 1; i++) {
          expect(Math.abs(resAB.biggestArguments[i].delta)).toBeGreaterThanOrEqual(
            Math.abs(resAB.biggestArguments[i + 1].delta)
          );
        }

        // 5. sharpestClash verification
        const maxDelta = Math.max(...resAB.shared.map((m) => Math.abs(m.delta)));
        if (maxDelta === 0) {
          expect(resAB.sharpestClash).toBeNull();
        } else {
          expect(resAB.sharpestClash).not.toBeNull();
          expect(Math.abs(resAB.sharpestClash!.delta)).toBe(maxDelta);
        }

        // 6. No NaN or undefined in output
        expect(Number.isNaN(resAB.agreementPct)).toBe(false);
        expect(Number.isNaN(resAB.compatibilityScore)).toBe(false);

        sumPct += resAB.agreementPct!;
        countPairs++;
      }

      // Over 10,000 random permutations, the average agreement should be roughly 50%
      const avgPct = sumPct / countPairs;
      expect(avgPct).toBeGreaterThan(48);
      expect(avgPct).toBeLessThan(52);
    });
  });

  // -------------------------------------------------------------------------
  // 5. TIE RANKINGS & DUPLICATE RANKS
  // -------------------------------------------------------------------------
  describe("5. Tie Rankings & Edge Cases", () => {
    test("handles tied ranks in list A and list B gracefully", () => {
      // Both voters have duplicate ranks (e.g. tie for 1st place)
      const listA: VersusEntry[] = [
        makeMovie(1, 1),
        makeMovie(2, 1), // Tied at rank 1
        makeMovie(3, 3),
        makeMovie(4, 4),
      ];
      const listB: VersusEntry[] = [
        makeMovie(1, 1),
        makeMovie(2, 2),
        makeMovie(3, 2), // Tied at rank 2
        makeMovie(4, 4),
      ];

      const result = computeVersus(listA, listB);
      expect(result.agreementPct).not.toBeNull();
      expect(Number.isInteger(result.agreementPct)).toBe(true);
      expect(result.agreementPct!).toBeGreaterThanOrEqual(0);
      expect(result.agreementPct!).toBeLessThanOrEqual(100);
      expect(result.sharpestClash).not.toBeNull();
    });

    test("all tied ranks (0 concordant pairs)", () => {
      const listA: VersusEntry[] = [
        makeMovie(1, 1),
        makeMovie(2, 1),
        makeMovie(3, 1),
      ];
      const listB: VersusEntry[] = [
        makeMovie(1, 1),
        makeMovie(2, 1),
        makeMovie(3, 1),
      ];

      const result = computeVersus(listA, listB);
      // Pairs exist, but (rankA1 - rankA2) is 0, so product is 0 -> 0 agreements
      expect(result.agreementPct).toBe(0);
      expect(result.sharpestClash).toBeNull(); // deltas are 0
    });
  });

  // -------------------------------------------------------------------------
  // 6. DETERMINISM OF findSharpestClash & findSharedFavorites
  // -------------------------------------------------------------------------
  describe("6. Determinism Verification", () => {
    test("findSharpestClash is deterministic across 100 shuffled inputs", () => {
      const sharedBase: SharedMovie[] = [
        { tmdbId: 1, title: "M1", posterPath: null, rankA: 1, rankB: 10, delta: 9 },
        { tmdbId: 2, title: "M2", posterPath: null, rankA: 2, rankB: 11, delta: 9 }, // same delta 9, minRank 2 vs 1
        { tmdbId: 3, title: "M3", posterPath: null, rankA: 5, rankB: 6, delta: 1 },
        { tmdbId: 4, title: "M4", posterPath: null, rankA: 10, rankB: 1, delta: -9 }, // delta -9, minRank 1, rankA 10 vs 1
      ];

      // M1 has |delta|=9, minRank=1, rankA=1
      // M4 has |delta|=9, minRank=1, rankA=10
      // Expected winner: M1 (rankA 1 < 10)
      for (let i = 0; i < 100; i++) {
        const shuffled = [...sharedBase].sort(() => Math.random() - 0.5);
        const clash = findSharpestClash(shuffled);
        expect(clash?.tmdbId).toBe(1);
      }
    });

    test("findSharedFavorites is deterministic across 100 shuffled inputs", () => {
      const sharedBase: SharedMovie[] = [
        { tmdbId: 1, title: "M1", posterPath: null, rankA: 1, rankB: 2, delta: 1 }, // sum 3, rankA 1
        { tmdbId: 2, title: "M2", posterPath: null, rankA: 2, rankB: 1, delta: -1 }, // sum 3, rankA 2
        { tmdbId: 3, title: "M3", posterPath: null, rankA: 3, rankB: 3, delta: 0 }, // sum 6
        { tmdbId: 4, title: "M4", posterPath: null, rankA: 4, rankB: 5, delta: 1 }, // sum 9
      ];

      for (let i = 0; i < 100; i++) {
        const shuffled = [...sharedBase].sort(() => Math.random() - 0.5);
        const favs = findSharedFavorites(shuffled, 5);
        expect(favs.map((f) => f.tmdbId)).toEqual([1, 2, 3, 4]);
      }
    });

    test("findSharedFavorites tier 3 fallback is deterministic", () => {
      // When no movies are in top 5 or top 10, falls back to tier 3
      const sharedBase: SharedMovie[] = [
        { tmdbId: 101, title: "M101", posterPath: null, rankA: 20, rankB: 21, delta: 1 }, // sum 41
        { tmdbId: 102, title: "M102", posterPath: null, rankA: 15, rankB: 17, delta: 2 }, // sum 32
        { tmdbId: 103, title: "M103", posterPath: null, rankA: 30, rankB: 31, delta: 1 }, // sum 61
        { tmdbId: 104, title: "M104", posterPath: null, rankA: 12, rankB: 13, delta: 1 }, // sum 25
      ];

      for (let i = 0; i < 50; i++) {
        const shuffled = [...sharedBase].sort(() => Math.random() - 0.5);
        const favs = findSharedFavorites(shuffled, 5);
        // Sorted by sum asc: 104 (25), 102 (32), 101 (41) -> sliced to top 3
        expect(favs.map((f) => f.tmdbId)).toEqual([104, 102, 101]);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 7. EXTREME VALUES, FRACTIONAL/NEGATIVE RANKS, UNICODE
  // -------------------------------------------------------------------------
  describe("7. Extreme Values & Formatting", () => {
    test("handles extreme large rank values (1,000,000)", () => {
      const listA = [makeMovie(1, 1), makeMovie(2, 1000000)];
      const listB = [makeMovie(1, 1000000), makeMovie(2, 1)];

      const result = computeVersus(listA, listB);
      expect(result.agreementPct).toBe(0);
      expect(result.sharpestClash?.delta).toBe(999999);
    });

    test("handles unicode titles, quotes, emojis", () => {
      const listA = [
        makeMovie(1, 1, "千と千尋の神隠し (Spirited Away) 🎬"),
        makeMovie(2, 2, 'The "Godfather": Part II <Special> &'),
      ];
      const listB = [
        makeMovie(1, 1, "千と千尋の神隠し (Spirited Away) 🎬"),
        makeMovie(2, 2, 'The "Godfather": Part II <Special> &'),
      ];

      const result = computeVersus(listA, listB);
      expect(result.agreementPct).toBe(100);
      expect(result.shared[0].title).toBe("千と千尋の神隠し (Spirited Away) 🎬");
    });
  });
});
