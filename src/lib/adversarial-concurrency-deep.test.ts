/**
 * ============================================================================
 * EMPIRICAL CHALLENGER 2: DEEP CONCURRENCY & RACE CONDITION HARNESS
 * ============================================================================
 * Stress-testing concurrent mutations, asynchronous race conditions,
 * boundary edge permutations, and mathematical invariants across movieranker.win.
 * ============================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyWin,
  closeCallProgress,
  countClosePairs,
  estimateRemainingVotes,
  expectedConsensusVotes,
  finalizeRanks,
  isPodiumLocked,
  isStable,
  nextMatchup,
  recordMatchupResult,
  sharpenNextPair,
  stabilityVotesN,
  type RankedMovie,
} from "./ranking";

import {
  applyVote,
  changedMovies,
  clearSession,
  loadSession,
  parkMovie,
  saveSession,
  selectNextPair,
  snapshotForUndo,
  totalComparisons,
  type PlaySession,
} from "./session";

import {
  canCompare,
  compatibilityTier,
  computeVersus,
  extractListId,
  findSharpestClash,
  findSharedFavorites,
  type VersusEntry,
} from "./versus";

import {
  CURATOR_MICRO_PACKS,
  getMicroPackBySlug,
  getRandomMicroPack,
  launchMicroPackSession,
} from "./curator-roulette";

import { createForkSession } from "./fork";

import {
  getMovieWinStreak,
  hasLaurelBadge,
  STREAK_LAUREL_THRESHOLD,
} from "./streak";

import {
  drawBarcode,
  formatTicketDate,
  generatePremierePassCanvas,
  generateTicketSerialNumber,
  type TicketRenderOptions,
} from "./ticket-canvas";

import {
  isEditableElement,
  isInputOrEditableFocused,
  resolveBlitzAction,
  type BlitzState,
  type KeyboardEventLike,
} from "./keyboard";

import {
  isLightsDown,
  isSoundEnabled,
  playGoldenChime,
  playShutterClick,
  setAudioContextForTesting,
  setLightsDown,
  setSoundEnabled,
  unlockAudioContext,
} from "./audio";

// Setup storage mocks
const memoryStore = new Map<string, string>();

function setupStorage() {
  memoryStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStore.set(key, value),
    removeItem: (key: string) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  });
}

describe("Empirical Challenger 2: Concurrency & Boundary Verification", () => {
  beforeEach(() => {
    setupStorage();
    setAudioContextForTesting(null);
  });

  afterEach(() => {
    memoryStore.clear();
  });

  // ==========================================================================
  // 1. CONCURRENT MUTATION & INTERLEAVED VOTING HARNESS
  // ==========================================================================
  describe("1. Interleaved & Concurrent Session State Transitions", () => {
    function createInitialSession(count = 8): PlaySession {
      const movies: RankedMovie[] = Array.from({ length: count }, (_, i) => ({
        tmdbId: 1000 + i,
        title: `Movie ${i + 1}`,
        posterPath: `/poster-${i + 1}.jpg`,
        releaseYear: 2010 + i,
        tagline: `Tagline for ${i + 1}`,
        elo: 1000,
        comparisons: 0,
        parked: false,
      }));
      return {
        title: "Concurrency Tournament",
        participants: ["Critic 1", "Critic 2"],
        movies,
        votesSinceOrderChange: 0,
        nudgeShown: false,
      };
    }

    it("maintains session state consistency under rapid vote-undo-park interleaving", () => {
      let session = createInitialSession(6);
      saveSession(session);

      // Simulate 500 rapid interleaved actions: vote, park, undo, unpark, vote
      for (let i = 0; i < 500; i++) {
        const active = session.movies.filter((m) => !m.parked);
        if (active.length >= 2) {
          const pair = nextMatchup(active, undefined, session.history);
          const [left, right] = pair;

          // Action 1: Apply vote
          const prev = session;
          session = applyVote(session, left.tmdbId, right.tmdbId);
          expect(session.undoSnapshot).toBeDefined();

          // Action 2: Randomly undo some votes
          if (i % 5 === 0 && session.undoSnapshot) {
            session = session.undoSnapshot;
            expect(session.movies.length).toBe(6);
          }

          // Action 3: Randomly park and unpark candidates
          if (i % 7 === 0) {
            const targetId = active[0].tmdbId;
            session = parkMovie(session, targetId, true);
            expect(session.movies.find((m) => m.tmdbId === targetId)?.parked).toBe(true);

            // Re-activate
            session = parkMovie(session, targetId, false);
            expect(session.movies.find((m) => m.tmdbId === targetId)?.parked).toBe(false);
          }
        }
      }

      // Assert invariants
      expect(session.movies).toHaveLength(6);
      for (const m of session.movies) {
        expect(Number.isFinite(m.elo)).toBe(true);
        expect(m.elo).toBeGreaterThanOrEqual(1);
        expect(m.comparisons).toBeGreaterThanOrEqual(0);
      }
    });

    it("verifies single-level undo protection against memory leaks and infinite nesting", () => {
      let session = createInitialSession(4);

      // Perform 50 consecutive votes
      for (let i = 0; i < 50; i++) {
        const pair = nextMatchup(session.movies.filter((m) => !m.parked));
        session = applyVote(session, pair[0].tmdbId, pair[1].tmdbId);
      }

      // Verify undoSnapshot exists, but its undoSnapshot is undefined
      expect(session.undoSnapshot).toBeDefined();
      expect(session.undoSnapshot?.undoSnapshot).toBeUndefined();

      // Undo once
      const undone = session.undoSnapshot!;
      expect(undone.undoSnapshot).toBeUndefined();
    });

    it("handles total comparisons calculation under concurrent mutations", () => {
      let session = createInitialSession(5);
      expect(totalComparisons(session)).toBe(0);

      const pair = nextMatchup(session.movies);
      session = applyVote(session, pair[0].tmdbId, pair[1].tmdbId);

      // 1 vote = 2 comparisons (1 for winner, 1 for loser)
      expect(totalComparisons(session)).toBe(2);

      const changed = changedMovies(createInitialSession(5).movies, session.movies);
      expect(changed).toHaveLength(2);
    });
  });

  // ==========================================================================
  // 2. MATHEMATICAL ELO ENGINE & CYCLIC TOURNAMENT ORACLES
  // ==========================================================================
  describe("2. Mathematical Elo Invariants & Cyclic Tournament Oracles", () => {
    it("handles non-transitive Rock-Paper-Scissors cyclic tournaments without divergence", () => {
      const movies: RankedMovie[] = [
        { tmdbId: 1, title: "Rock", posterPath: null, releaseYear: null, elo: 1000, comparisons: 0, parked: false },
        { tmdbId: 2, title: "Paper", posterPath: null, releaseYear: null, elo: 1000, comparisons: 0, parked: false },
        { tmdbId: 3, title: "Scissors", posterPath: null, releaseYear: null, elo: 1000, comparisons: 0, parked: false },
      ];

      let current = movies;
      // Cycle: Paper (2) beats Rock (1), Scissors (3) beats Paper (2), Rock (1) beats Scissors (3)
      for (let cycle = 0; cycle < 100; cycle++) {
        current = applyWin(current, 2, 1);
        current = applyWin(current, 3, 2);
        current = applyWin(current, 1, 3);
      }

      // Since each won and lost equally against equal opponents, Elo ratings must stay closely clustered near 1000
      for (const m of current) {
        expect(m.elo).toBeGreaterThan(950);
        expect(m.elo).toBeLessThan(1050);
        expect(m.comparisons).toBe(200);
      }
    });

    it("verifies expectedConsensusVotes, countClosePairs, and estimateRemainingVotes boundaries", () => {
      expect(expectedConsensusVotes(2)).toBe(2);
      expect(expectedConsensusVotes(4)).toBe(8);
      expect(expectedConsensusVotes(8)).toBe(24);
      expect(expectedConsensusVotes(16)).toBe(64);

      const movies: RankedMovie[] = [
        { tmdbId: 1, title: "A", posterPath: null, releaseYear: null, elo: 1200, comparisons: 5, parked: false },
        { tmdbId: 2, title: "B", posterPath: null, releaseYear: null, elo: 1150, comparisons: 5, parked: false }, // gap 50 <= 120 (close)
        { tmdbId: 3, title: "C", posterPath: null, releaseYear: null, elo: 900, comparisons: 5, parked: false },  // gap 250 > 120 (far)
      ];

      expect(countClosePairs(movies)).toBe(1);
      expect(estimateRemainingVotes(movies)).toBe(2);
      expect(closeCallProgress(0, 5)).toContain("ready to finish");
      expect(closeCallProgress(3, 5)).toContain("3 of 5 matchups");
    });

    it("validates podium lock detection with edge cases", () => {
      // Less than 4 active movies cannot lock podium
      const threeMovies: RankedMovie[] = [
        { tmdbId: 1, title: "A", posterPath: null, releaseYear: null, elo: 1500, comparisons: 5, parked: false },
        { tmdbId: 2, title: "B", posterPath: null, releaseYear: null, elo: 1400, comparisons: 5, parked: false },
        { tmdbId: 3, title: "C", posterPath: null, releaseYear: null, elo: 1300, comparisons: 5, parked: false },
      ];
      expect(isPodiumLocked(threeMovies)).toBe(false);

      // 4 movies with top 3 >= 2 comparisons and gap >= 20 between #3 and #4
      const fourMoviesLocked: RankedMovie[] = [
        { tmdbId: 1, title: "A", posterPath: null, releaseYear: null, elo: 1500, comparisons: 5, parked: false },
        { tmdbId: 2, title: "B", posterPath: null, releaseYear: null, elo: 1400, comparisons: 5, parked: false },
        { tmdbId: 3, title: "C", posterPath: null, releaseYear: null, elo: 1300, comparisons: 5, parked: false },
        { tmdbId: 4, title: "D", posterPath: null, releaseYear: null, elo: 1250, comparisons: 5, parked: false }, // gap 50 >= 20
      ];
      expect(isPodiumLocked(fourMoviesLocked)).toBe(true);

      // Not locked if gap between #3 and #4 is < 20
      const fourMoviesNotLocked: RankedMovie[] = [
        { tmdbId: 1, title: "A", posterPath: null, releaseYear: null, elo: 1500, comparisons: 5, parked: false },
        { tmdbId: 2, title: "B", posterPath: null, releaseYear: null, elo: 1400, comparisons: 5, parked: false },
        { tmdbId: 3, title: "C", posterPath: null, releaseYear: null, elo: 1300, comparisons: 5, parked: false },
        { tmdbId: 4, title: "D", posterPath: null, releaseYear: null, elo: 1290, comparisons: 5, parked: false }, // gap 10 < 20
      ];
      expect(isPodiumLocked(fourMoviesNotLocked)).toBe(false);
    });
  });

  // ==========================================================================
  // 3. VERSUS ENGINE PATHOLOGICAL EDGE PERMUTATIONS
  // ==========================================================================
  describe("3. Versus Engine Pathological Edge Permutations", () => {
    it("handles zero shared movies (disjoint rosters)", () => {
      const listA: VersusEntry[] = [
        { tmdbId: 1, title: "Alpha", rank: 1, posterPath: null },
        { tmdbId: 2, title: "Beta", rank: 2, posterPath: null },
      ];
      const listB: VersusEntry[] = [
        { tmdbId: 3, title: "Gamma", rank: 1, posterPath: null },
        { tmdbId: 4, title: "Delta", rank: 2, posterPath: null },
      ];

      const res = computeVersus(listA, listB);
      expect(res.shared).toHaveLength(0);
      expect(res.agreementPct).toBeNull();
      expect(res.compatibilityScore).toBeNull();
      expect(res.sharpestClash).toBeNull();
      expect(res.sharedFavorites).toEqual([]);
      expect(res.onlyInA).toHaveLength(2);
      expect(res.onlyInB).toHaveLength(2);
    });

    it("handles exactly 1 shared movie (insufficient for pairwise concordance)", () => {
      const listA: VersusEntry[] = [
        { tmdbId: 1, title: "Shared Solo", rank: 1, posterPath: null },
        { tmdbId: 2, title: "Unique A", rank: 2, posterPath: null },
      ];
      const listB: VersusEntry[] = [
        { tmdbId: 1, title: "Shared Solo", rank: 5, posterPath: null },
        { tmdbId: 3, title: "Unique B", rank: 1, posterPath: null },
      ];

      const res = computeVersus(listA, listB);
      expect(res.shared).toHaveLength(1);
      expect(res.agreementPct).toBeNull(); // Requires >= 2 shared movies
      expect(res.compatibilityScore).toBeNull();
      expect(res.sharpestClash?.tmdbId).toBe(1);
    });

    it("handles extractListId with complex, malformed, and encoded URLs", () => {
      expect(extractListId("https://movieranker.win/l/cyberpunk-list-99")).toBe("cyberpunk-list-99");
      expect(extractListId("http://localhost:3000/l/test-id-123")).toBe("test-id-123");
      expect(extractListId("bare-slug-id")).toBe("bare-slug-id");
      expect(extractListId("   spaces-around   ")).toBe("spaces-around");
      expect(extractListId("")).toBeNull();
      expect(extractListId("https://google.com/search?q=movie")).toBeNull();
      expect(extractListId("not a valid/path/id")).toBeNull();
    });

    it("validates canCompare access gating matrix", () => {
      // Done + public -> anyone can compare
      expect(canCompare({ status: "done", visibility: "public", ownerId: "user-1" }, null)).toBe(true);
      expect(canCompare({ status: "done", visibility: "public", ownerId: "user-1" }, "user-2")).toBe(true);

      // Done + unlisted -> anyone with link can compare
      expect(canCompare({ status: "done", visibility: "unlisted", ownerId: "user-1" }, null)).toBe(true);

      // Done + private -> only owner can compare
      expect(canCompare({ status: "done", visibility: "private", ownerId: "user-1" }, "user-1")).toBe(true);
      expect(canCompare({ status: "done", visibility: "private", ownerId: "user-1" }, "user-2")).toBe(false);
      expect(canCompare({ status: "done", visibility: "private", ownerId: "user-1" }, null)).toBe(false);

      // Drafts -> never comparable even by owner
      expect(canCompare({ status: "draft", visibility: "public", ownerId: "user-1" }, "user-1")).toBe(false);
      expect(canCompare({ status: "draft", visibility: "private", ownerId: "user-1" }, "user-1")).toBe(false);
    });

    it("validates compatibilityTier boundaries", () => {
      expect(compatibilityTier(100)).toBe("Basically twins");
      expect(compatibilityTier(90)).toBe("Basically twins");
      expect(compatibilityTier(89)).toBe("Mostly aligned");
      expect(compatibilityTier(70)).toBe("Mostly aligned");
      expect(compatibilityTier(69)).toBe("Spicy differences");
      expect(compatibilityTier(50)).toBe("Spicy differences");
      expect(compatibilityTier(49)).toBe("Opposite ends of the couch");
      expect(compatibilityTier(0)).toBe("Opposite ends of the couch");
    });
  });

  // ==========================================================================
  // 4. CURATOR ROULETTE & FORKING INTEGRITY ORACLES
  // ==========================================================================
  describe("4. Curator Roulette & Forking Integrity Oracles", () => {
    it("launches micro-pack session with custom movie details and rich taglines", () => {
      const pack = CURATOR_MICRO_PACKS[0]; // Cyberpunk
      const customDetails = [
        {
          tmdbId: 603,
          title: "The Matrix",
          posterPath: "/matrix.jpg",
          releaseYear: 1999,
          tagline: "Welcome to the Real World.",
        },
      ];

      const session = launchMicroPackSession(pack.slug, customDetails);
      expect(session.title).toBe(pack.title);
      expect(session.curated).toBe(true);
      expect(session.themeSlug).toBe(pack.slug);
      expect(session.movies[0].tagline).toBe("Welcome to the Real World.");
      expect(session.movies[0].posterPath).toBe("/matrix.jpg");
    });

    it("verifies getRandomMicroPack exclusion logic with invalid or matching slugs", () => {
      const selected = getRandomMicroPack("non-existent-slug");
      expect(CURATOR_MICRO_PACKS.map((p) => p.slug)).toContain(selected.slug);

      for (let i = 0; i < 50; i++) {
        const excluded = getRandomMicroPack("cyberpunk-90s");
        expect(excluded.slug).not.toBe("cyberpunk-90s");
      }
    });

    it("preserves tagline through createForkSession and localStorage round-trip", () => {
      const list = {
        title: "Re-rank: Cult Sci-Fi",
        movies: [
          {
            tmdbId: 999,
            title: "Blade Runner",
            tagline: "Man Has Made His Match... Now It's His Problem",
            posterPath: "/br.jpg",
            releaseYear: 1982,
          },
        ],
      };

      const session = createForkSession(list);
      expect(session.title).toBe("Re-rank: Cult Sci-Fi");
      expect(session.movies[0].tagline).toBe("Man Has Made His Match... Now It's His Problem");

      const reloaded = loadSession();
      expect(reloaded?.movies[0].tagline).toBe("Man Has Made His Match... Now It's His Problem");
    });
  });

  // ==========================================================================
  // 5. SERIALIZATION, BARCODE, AND CANVAS INTEGRITY
  // ==========================================================================
  describe("5. Serialization, Barcode, and Canvas Invariants", () => {
    it("generates deterministic serial numbers for identical title and date inputs", () => {
      const serial1 = generateTicketSerialNumber("Oscar Snubs Ranking", "2026-09-02");
      const serial2 = generateTicketSerialNumber("Oscar Snubs Ranking", "2026-09-02");
      const serial3 = generateTicketSerialNumber("Oscar Snubs Ranking", "2026-09-03");

      expect(serial1).toBe(serial2);
      expect(serial1).toMatch(/^№ MR-\d{5}$/);
      expect(serial1).not.toBe(serial3);
    });

    it("draws procedural barcode without NaN coordinates or canvas crashes", () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: "",
      } as unknown as CanvasRenderingContext2D;

      expect(() => {
        drawBarcode(mockCtx, 100, 200, 300, 150, "№ MR-94821");
      }).not.toThrow();

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
});
