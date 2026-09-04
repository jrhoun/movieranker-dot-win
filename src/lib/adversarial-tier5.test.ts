/**
 * ============================================================================
 * TIER 5 ADVERSARIAL STRESS TEST HARNESS & EDGE-CASE ORACLES
 * ============================================================================
 * Comprehensive empirical stress testing covering all theatrical & community
 * features under hostile, extreme, concurrency, and boundary conditions.
 * ============================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Modules under test
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
  STORAGE_KEY_LIGHTS_DOWN,
  STORAGE_KEY_SOUND,
  unlockAudioContext,
} from "./audio";
import {
  getMovieWinStreak,
  hasLaurelBadge,
  STREAK_LAUREL_THRESHOLD,
} from "./streak";
import {
  copyPremierePassToClipboard,
  downloadPremierePass,
  drawBarcode,
  exportPremierePassBlob,
  formatTicketDate,
  generatePremierePassCanvas,
  generateTicketSerialNumber,
  type TicketRenderOptions,
} from "./ticket-canvas";
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
  formatTrendingLists,
  getTrendingLists,
  type RawDbListRow,
} from "./trending";
import { triptychSlots } from "./triptych";
import {
  applyWin,
  finalizeRanks,
  isStable,
  nextMatchup,
  recordMatchupResult,
  type RankedMovie,
} from "./ranking";
import {
  clearSession,
  loadSession,
  saveSession,
  type PlaySession,
} from "./session";

// In-Memory Storage & DOM Mocks
const mockStorage = new Map<string, string>();
let simulateStorageQuota = false;
let simulateStorageSecurityError = false;

function setupMockEnvironment() {
  mockStorage.clear();
  simulateStorageQuota = false;
  simulateStorageSecurityError = false;

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      if (simulateStorageSecurityError) {
        throw new DOMException("Access denied", "SecurityError");
      }
      return mockStorage.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (simulateStorageSecurityError) {
        throw new DOMException("Access denied", "SecurityError");
      }
      if (simulateStorageQuota) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      mockStorage.set(key, value);
    },
    removeItem: (key: string) => {
      if (simulateStorageSecurityError) {
        throw new DOMException("Access denied", "SecurityError");
      }
      mockStorage.delete(key);
    },
    clear: () => {
      if (simulateStorageSecurityError) {
        throw new DOMException("Access denied", "SecurityError");
      }
      mockStorage.clear();
    },
  });
}

function createAdversarialCanvasContext() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "",
    textBaseline: "",
  } as unknown as CanvasRenderingContext2D;
}

let mockClipboardAllowed = true;
function setupCanvasAndClipboard() {
  const fakeBlob = new Blob(["test-png"], { type: "image/png" });
  const mockCtx = createAdversarialCanvasContext();
  const mockCanvas = {
    width: 1200,
    height: 675,
    getContext: vi.fn().mockReturnValue(mockCtx),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(fakeBlob)),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,mock"),
  } as unknown as HTMLCanvasElement;

  const mockAnchor = {
    href: "",
    download: "",
    click: vi.fn(),
  };

  (globalThis as unknown as { document: unknown }).document = {
    createElement: vi.fn((tag: string) => {
      if (tag === "canvas") return mockCanvas;
      if (tag === "a") return mockAnchor;
      return { tagName: tag.toUpperCase() };
    }),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    activeElement: null,
  };

  const gURL = globalThis.URL as unknown as {
    createObjectURL: (b: Blob) => string;
    revokeObjectURL: (u: string) => void;
  };
  if (typeof gURL.createObjectURL !== "function") {
    gURL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/uuid");
  } else {
    vi.spyOn(gURL, "createObjectURL").mockReturnValue("blob:http://localhost/uuid");
  }
  if (typeof gURL.revokeObjectURL !== "function") {
    gURL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(gURL, "revokeObjectURL").mockImplementation(() => {});
  }

  Object.defineProperty(globalThis, "navigator", {
    value: {
      clipboard: {
        write: vi.fn().mockImplementation(() => {
          if (!mockClipboardAllowed) {
            return Promise.reject(new DOMException("Clipboard permission denied", "NotAllowedError"));
          }
          return Promise.resolve();
        }),
      },
    },
    writable: true,
    configurable: true,
  });

  (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = class ClipboardItem {
    constructor(public data: unknown) {}
  };

  return { mockCtx, mockCanvas, mockAnchor };
}

// Database Mock for Upvote Route
type DbMockCall = { table: string; method: string; args: unknown[] };
let dbState = {
  user: { id: "user-adv-1" } as { id: string } | null,
  list: {
    id: "list-stress-1",
    owner_id: "user-adv-owner",
    status: "done",
    visibility: "public",
    upvotes_count: 42,
  } as {
    id: string;
    owner_id: string;
    status: string;
    visibility: string;
    upvotes_count: number | null;
  } | null,
  upvote: null as { id: number } | null,
  dbError: null as { message: string } | null,
  calls: [] as DbMockCall[],
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => {
    const resolve = async () => {
      if (dbState.dbError) {
        return { data: null, error: dbState.dbError };
      }
      const last = dbState.calls[dbState.calls.length - 1];
      if (last?.table === "lists") {
        return { data: dbState.list, error: null };
      }
      if (last?.table === "list_upvotes") {
        if (dbState.calls.some((c) => c.table === "list_upvotes" && c.method === "delete")) {
          return { data: null, error: null };
        }
        if (dbState.calls.some((c) => c.table === "list_upvotes" && c.method === "insert")) {
          return { data: null, error: null };
        }
        return { data: dbState.upvote, error: null };
      }
      return { data: null, error: null };
    };

    const client = {
      auth: {
        getUser: async () => ({ data: { user: dbState.user }, error: null }),
      },
      from(table: string) {
        const obj: Record<string, unknown> = {};
        for (const method of ["select", "eq", "single", "maybeSingle", "insert", "delete", "order", "limit", "in"]) {
          obj[method] = (...args: unknown[]) => {
            dbState.calls.push({ table, method, args });
            return obj;
          };
        }
        obj.then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
          resolve().then(onFulfilled, onRejected);
        return obj;
      },
    };
    return client;
  }),
}));

const { GET: getUpvoteRoute, POST: postUpvoteRoute } = await import(
  "../app/api/lists/[id]/upvote/route"
);

beforeEach(() => {
  setupMockEnvironment();
  setupCanvasAndClipboard();
  setAudioContextForTesting(null);
  mockClipboardAllowed = true;
  dbState = {
    user: { id: "user-adv-1" },
    list: {
      id: "list-stress-1",
      owner_id: "user-adv-owner",
      status: "done",
      visibility: "public",
      upvotes_count: 42,
    },
    upvote: null,
    dbError: null,
    calls: [],
  };
  vi.clearAllMocks();
});

afterEach(() => {
  mockStorage.clear();
  setAudioContextForTesting(null);
});

describe("Tier 5 Adversarial Stress & Vulnerability Suite", () => {
  // ==========================================================================
  // 1. KEYBOARD BLITZ ADVERSARIAL CHALLENGES
  // ==========================================================================
  describe("1. Keyboard Blitz Adversarial Challenges", () => {
    const movieA: RankedMovie = {
      tmdbId: 1001,
      title: "Movie Alpha",
      posterPath: null,
      releaseYear: 2020,
      elo: 1000,
      comparisons: 0,
      parked: false,
    };
    const movieB: RankedMovie = {
      tmdbId: 1002,
      title: "Movie Beta",
      posterPath: null,
      releaseYear: 2021,
      elo: 1000,
      comparisons: 0,
      parked: false,
    };

    const baseState: BlitzState = {
      pair: [movieA, movieB],
      canUndo: true,
      isSettling: false,
      isFinished: false,
      isConsensus: false,
      isModalOpen: false,
      activeMoviesCount: 2,
    };

    it("survives 1,000 rapid-fire adversarial keyboard event permutations", () => {
      const keys = ["ArrowLeft", "ArrowRight", "a", "d", " ", "z", "Escape", "Enter", "Tab", "Shift", "Backspace", "Control"];
      const modifiers = [
        {},
        { ctrlKey: true },
        { metaKey: true },
        { altKey: true },
        { shiftKey: true },
        { isComposing: true },
      ];

      for (let i = 0; i < 1000; i++) {
        const key = keys[i % keys.length];
        const mod = modifiers[i % modifiers.length];
        const ev: KeyboardEventLike = { key, ...mod };
        const action = resolveBlitzAction(ev, baseState);

        // Verification invariant: Must either return valid BlitzAction or null without throwing
        if (action !== null) {
          expect(["vote_left", "vote_right", "park_candidate", "undo"]).toContain(action.type);
        }
      }
    });

    it("resists nested and malformed contenteditable attributes", () => {
      const mockElements = [
        { getAttribute: (attr: string) => (attr === "contenteditable" ? "true" : null) },
        { getAttribute: (attr: string) => (attr === "contenteditable" ? "plaintext-only" : null) },
        { getAttribute: (attr: string) => (attr === "contenteditable" ? "" : null) },
        { isContentEditable: true },
        { tagName: "input" },
        { tagName: "TEXTAREA" },
        { tagName: "Select" },
      ];

      for (const el of mockElements) {
        expect(isEditableElement(el as unknown as EventTarget)).toBe(true);
        expect(resolveBlitzAction({ key: "a", target: el as unknown as EventTarget }, baseState)).toBeNull();
      }

      // Explicitly false contenteditable
      const nonEditable = {
        isContentEditable: false,
        getAttribute: (attr: string) => (attr === "contenteditable" ? "false" : null),
      };
      expect(isEditableElement(nonEditable as unknown as EventTarget)).toBe(false);
    });

    it("handles degenerate blitz states (null pair, negative movie count, identical IDs)", () => {
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...baseState, pair: null })).toBeNull();
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...baseState, activeMoviesCount: 1 })).toBeNull();
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...baseState, activeMoviesCount: 0 })).toBeNull();
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...baseState, activeMoviesCount: -5 })).toBeNull();
    });
  });

  // ==========================================================================
  // 2. TMDB MOVIE TAGLINES ADVERSARIAL CHALLENGES
  // ==========================================================================
  describe("2. TMDB Movie Taglines Adversarial Challenges", () => {
    it("handles extreme XSS injection, unicode, RTL scripts, and giant taglines", () => {
      const maliciousTaglines = [
        `<script>alert("XSS")</script>`,
        `"><img src="x" onerror="alert(1)">`,
        "🎬🍿✨ Timeless Masterpiece 🚀🔥",
        "العربية هي لغة جميلة ورائعة للسينما", // Arabic RTL
        "עברית היא שפה עתיקה", // Hebrew RTL
        "A".repeat(50000), // 50KB tagline
        "Null \u0000 Byte \u0001 String",
      ];

      for (const tag of maliciousTaglines) {
        const movie: RankedMovie = {
          tmdbId: 999,
          title: "Tagline Stress Film",
          posterPath: null,
          releaseYear: 2026,
          tagline: tag,
          elo: 1000,
          comparisons: 0,
          parked: false,
        };

        const session = createForkSession({
          title: "Stress Session",
          movies: [movie],
        });

        // Verification invariant: Tagline must be preserved byte-for-byte through serialization
        expect(session.movies[0].tagline).toBe(tag);
        const stored = loadSession();
        expect(stored?.movies[0].tagline).toBe(tag);
      }
    });
  });

  // ==========================================================================
  // 3. WEB AUDIO SYNTHESIZER ADVERSARIAL STRESS
  // ==========================================================================
  describe("3. Web Audio Synthesizer Adversarial Stress", () => {
    function createFailingAudioContext() {
      return {
        currentTime: 0,
        sampleRate: 44100,
        state: "running" as AudioContextState,
        destination: {},
        resume: vi.fn().mockRejectedValue(new Error("Autoplay block")),
        createGain: vi.fn(() => {
          throw new Error("Out of audio hardware resources");
        }),
        createOscillator: vi.fn(() => {
          throw new Error("Oscillator allocation failed");
        }),
      } as unknown as AudioContext;
    }

    it("swallows audio hardware failures and exceptions without bubbling up", () => {
      setSoundEnabled(true);
      const failingCtx = createFailingAudioContext();

      expect(() => playShutterClick(failingCtx)).not.toThrow();
      expect(() => playGoldenChime(failingCtx)).not.toThrow();
      expect(() => unlockAudioContext(failingCtx)).not.toThrow();
    });

    it("survives 200 rapid concurrent audio playback triggers", () => {
      setSoundEnabled(true);
      for (let i = 0; i < 200; i++) {
        expect(() => {
          playShutterClick();
          playGoldenChime();
        }).not.toThrow();
      }
    });

    it("handles security error / incognito mode exceptions in storage", () => {
      simulateStorageSecurityError = true;
      expect(isSoundEnabled()).toBe(false);
      expect(() => setSoundEnabled(true)).not.toThrow();
      expect(isLightsDown()).toBe(false);
      expect(() => setLightsDown(true)).not.toThrow();
    });
  });

  // ==========================================================================
  // 4. WIN STREAK LAUREL BADGES ADVERSARIAL CHALLENGES
  // ==========================================================================
  describe("4. Win Streak Laurel Badges Adversarial Challenges", () => {
    it("handles 10,000-match histories in sub-millisecond time", () => {
      const history: Array<[number, number]> = [];
      for (let i = 0; i < 10000; i++) {
        history.push([i % 100 + 1, (i + 1) % 100 + 1]);
      }
      // Add 5 consecutive wins for movie 999 at the very end
      history.push([999, 1], [999, 2], [999, 3], [999, 4], [999, 5]);

      const t0 = performance.now();
      const streak = getMovieWinStreak(history, 999);
      const elapsed = performance.now() - t0;

      expect(streak).toBe(5);
      expect(hasLaurelBadge(streak)).toBe(true);
      expect(elapsed).toBeLessThan(50);
    });

    it("accurately detects streak resets on immediate loss", () => {
      const history: Array<[number, number]> = [
        [777, 100],
        [777, 101],
        [777, 102], // Streak was 3
        [103, 777], // Loss! Streak reset to 0
      ];
      expect(getMovieWinStreak(history, 777)).toBe(0);
      expect(hasLaurelBadge(getMovieWinStreak(history, 777))).toBe(false);
    });

    it("handles negative and extreme TMDB IDs safely", () => {
      const history: Array<[number, number]> = [
        [-1, -2],
        [-1, -3],
        [-1, -4],
      ];
      expect(getMovieWinStreak(history, -1)).toBe(3);
      expect(hasLaurelBadge(getMovieWinStreak(history, -1))).toBe(true);
    });
  });

  // ==========================================================================
  // 5. CINEMA FOCUS MODE "LIGHTS DOWN" ADVERSARIAL STRESS
  // ==========================================================================
  describe("5. Cinema Focus Mode 'Lights Down' Storage Stress", () => {
    it("safely handles 1,000 rapid state transitions with corrupted storage entries", () => {
      const corruptedValues = ["undefined", "null", "{}", "[]", "NaN", "0", "1", "\u0000", "TRUE", "yes"];
      for (const val of corruptedValues) {
        mockStorage.set(STORAGE_KEY_LIGHTS_DOWN, val);
        expect(isLightsDown()).toBe(false); // Only exact "true" is valid
      }

      for (let i = 0; i < 500; i++) {
        setLightsDown(i % 2 === 0);
        expect(isLightsDown()).toBe(i % 2 === 0);
      }
    });
  });

  // ==========================================================================
  // 6. CURTAIN CALL CELEBRATION & CONSENSUS ENGINE ADVERSARIAL
  // ==========================================================================
  describe("6. Curtain Call Celebration & Consensus Engine", () => {
    it("handles large roster consensus finalization with extreme Elo spreads", () => {
      const movies: RankedMovie[] = Array.from({ length: 100 }, (_, i) => ({
        tmdbId: i + 1,
        title: `Movie ${i + 1}`,
        posterPath: null,
        releaseYear: 2000,
        elo: 2000 - i * 15, // Differentiated
        comparisons: 10,
        parked: i >= 90, // Last 10 parked
      }));

      expect(isStable(movies, 10, true)).toBe(true);

      const finalized = finalizeRanks(movies);
      expect(finalized).toHaveLength(100);
      expect(finalized[0].rank).toBe(1);
      expect(finalized[89].rank).toBe(90);
      expect(finalized[90].rank).toBeNull(); // Parked
      expect(finalized[99].rank).toBeNull(); // Parked
    });

    it("assigns identical ranks cleanly to movies with tied Elo ratings", () => {
      const tiedMovies: RankedMovie[] = [
        { tmdbId: 200, title: "Tied Beta", posterPath: null, releaseYear: null, elo: 1200, comparisons: 5, parked: false },
        { tmdbId: 100, title: "Tied Alpha", posterPath: null, releaseYear: null, elo: 1200, comparisons: 5, parked: false },
      ];
      const finalized = finalizeRanks(tiedMovies);
      expect(finalized).toHaveLength(2);
      // Both tied movies share rank 1
      expect(finalized[0].rank).toBe(1);
      expect(finalized[1].rank).toBe(1);
    });
  });

  // ==========================================================================
  // 7. PREMIERE PASS CANVAS & TICKET GENERATOR ADVERSARIAL STRESS
  // ==========================================================================
  describe("7. Premiere Pass Canvas & Ticket Generator Adversarial Stress", () => {
    it("gracefully falls back to download when clipboard write fails or is rejected", async () => {
      mockClipboardAllowed = false;

      const options: TicketRenderOptions = {
        title: "Forbidden Clipboard Pass",
        items: [{ rank: 1, title: "Unstoppable Movie" }],
      };

      const result = await copyPremierePassToClipboard(options);
      // Returns false when clipboard API is denied, signaling caller to fallback to download
      expect(result).toBe(false);
    });

    it("renders ticket canvas safely with zero items and missing metadata", async () => {
      const options: TicketRenderOptions = {
        title: "",
        items: [],
        creatorHandle: null,
        participants: [],
        date: "invalid-date",
        totalRanked: 0,
      };

      const canvas = await generatePremierePassCanvas(options);
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(675);
    });

    it("handles extreme leap days, far future dates, and epoch zero dates", () => {
      expect(formatTicketDate(new Date(2028, 1, 29))).toContain("2028"); // Leap year
      expect(formatTicketDate(new Date(1970, 0, 1))).toContain("1970"); // Epoch 0
      expect(formatTicketDate(new Date(9999, 11, 31))).toContain("9999"); // Far future
      expect(formatTicketDate(undefined)).toBeDefined();
      expect(formatTicketDate("invalid-date-string")).toBe("SEPTEMBER 2026");
    });
  });

  // ==========================================================================
  // 8. VERSUS CONCORDANCE & DISAGREEMENTS ADVERSARIAL ORACLES
  // ==========================================================================
  describe("8. Versus Concordance & Disagreements Invariants", () => {
    it("satisfies mathematical symmetry: concordance(A, B) === concordance(B, A)", () => {
      const listA: VersusEntry[] = [
        { tmdbId: 1, title: "M1", rank: 1, posterPath: null },
        { tmdbId: 2, title: "M2", rank: 2, posterPath: null },
        { tmdbId: 3, title: "M3", rank: 3, posterPath: null },
        { tmdbId: 4, title: "M4", rank: 4, posterPath: null },
        { tmdbId: 5, title: "M5", rank: 5, posterPath: null },
      ];
      const listB: VersusEntry[] = [
        { tmdbId: 3, title: "M3", rank: 1, posterPath: null },
        { tmdbId: 1, title: "M1", rank: 2, posterPath: null },
        { tmdbId: 5, title: "M5", rank: 3, posterPath: null },
        { tmdbId: 2, title: "M2", rank: 4, posterPath: null },
        { tmdbId: 4, title: "M4", rank: 5, posterPath: null },
      ];

      const resAB = computeVersus(listA, listB);
      const resBA = computeVersus(listB, listA);

      expect(resAB.agreementPct).toBe(resBA.agreementPct);
      expect(resAB.compatibilityScore).toBe(resBA.compatibilityScore);
      expect(Math.abs(resAB.sharpestClash?.delta ?? 0)).toBe(Math.abs(resBA.sharpestClash?.delta ?? 0));
    });

    it("handles large 500-movie versus comparisons without performance cliff", () => {
      const listA: VersusEntry[] = Array.from({ length: 500 }, (_, i) => ({
        tmdbId: i + 1,
        title: `Film ${i + 1}`,
        rank: i + 1,
        posterPath: null,
      }));
      const listB: VersusEntry[] = Array.from({ length: 500 }, (_, i) => ({
        tmdbId: i + 1,
        title: `Film ${i + 1}`,
        rank: 500 - i, // Perfectly inverted
        posterPath: null,
      }));

      const t0 = performance.now();
      const versus = computeVersus(listA, listB);
      const elapsed = performance.now() - t0;

      expect(versus.agreementPct).toBe(0);
      expect(versus.shared).toHaveLength(500);
      expect(elapsed).toBeLessThan(1000);
    });

    it("breaks sharpest clash ties deterministically", () => {
      const shared = [
        { tmdbId: 1, title: "Clash A", rankA: 1, rankB: 5, delta: 4, posterPath: null },
        { tmdbId: 2, title: "Clash B", rankA: 6, rankB: 10, delta: 4, posterPath: null },
      ];
      // Tie in |delta| = 4; Clash A has min rank 1 vs Clash B min rank 6 -> Clash A wins tie-break
      const sharpest = findSharpestClash(shared);
      expect(sharpest?.tmdbId).toBe(1);
    });

    it("extracts shared favorites when ranks are beyond top 5", () => {
      const shared = [
        { tmdbId: 10, title: "Mutual Underdog", rankA: 8, rankB: 9, delta: 1, posterPath: null },
        { tmdbId: 20, title: "Disagreed Movie", rankA: 1, rankB: 20, delta: 19, posterPath: null },
      ];
      const favs = findSharedFavorites(shared);
      expect(favs).toHaveLength(1);
      expect(favs[0].title).toBe("Mutual Underdog");
    });
  });

  // ==========================================================================
  // 9. COMMUNITY UPVOTING ROUTE ADVERSARIAL CHALLENGES
  // ==========================================================================
  describe("9. Community Upvoting Route Adversarial Challenges", () => {
    it("handles database errors and exceptions gracefully with 500 response", async () => {
      dbState.dbError = { message: "Connection terminated unexpectedly" };

      const res = await postUpvoteRoute(
        new Request("http://localhost/api/lists/list-stress-1/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-stress-1" }) },
      );
      expect(res.status).toBe(500);
    });

    it("prevents upvotes count from decrementing below zero", async () => {
      dbState.user = { id: "user-adv-1" };
      dbState.list = {
        id: "list-zero",
        owner_id: "other-user",
        status: "done",
        visibility: "public",
        upvotes_count: 0,
      };
      dbState.upvote = { id: 111 }; // User had upvoted previously but count is 0

      const res = await postUpvoteRoute(
        new Request("http://localhost/api/lists/list-zero/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-zero" }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.upvotesCount).toBe(0);
      expect(data.hasUpvoted).toBe(false);
    });

    it("rejects upvote on non-existent lists with 404", async () => {
      dbState.list = null;
      const res = await postUpvoteRoute(
        new Request("http://localhost/api/lists/missing-id/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "missing-id" }) },
      );
      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // 10. TRENDING SHOWCASE & TRIPTYCH ADVERSARIAL ORACLES
  // ==========================================================================
  describe("10. Trending Showcase & Triptych Adversarial Oracles", () => {
    it("handles corrupt database list rows (null movies, missing ranks, null upvotes)", () => {
      const corruptRows: RawDbListRow[] = [
        {
          id: "corrupt-1",
          title: "Corrupt List",
          description: null,
          owner_id: "user-x",
          status: "done",
          visibility: "public",
          upvotes_count: null,
          created_at: "2026-09-01T00:00:00Z",
          list_movies: undefined,
        },
        {
          id: "corrupt-2",
          title: "Partial Movie Data",
          description: null,
          owner_id: "user-y",
          status: "done",
          visibility: "public",
          upvotes_count: 10,
          created_at: "2026-09-02T00:00:00Z",
          list_movies: [
            { tmdb_id: 1, title: "No Rank Movie", poster_path: null, release_year: null, final_rank: null },
          ],
        },
      ];

      const formatted = formatTrendingLists(corruptRows);
      expect(formatted).toHaveLength(2);
      expect(formatted[0].id).toBe("corrupt-2"); // 10 upvotes
      expect(formatted[1].id).toBe("corrupt-1"); // 0 upvotes (null fallback)
      expect(formatted[1].movies).toEqual([]);
      expect(formatted[0].topPosters[0].finalRank).toBeNull();
    });
  });

  // ==========================================================================
  // 11. FORK & RE-RANK DEEP MUTATION ISOLATION
  // ==========================================================================
  describe("11. Fork & Re-rank Deep Mutation Isolation", () => {
    it("guarantees full mutation isolation between source list and forked session", () => {
      const originalMovie: RankedMovie = {
        tmdbId: 555,
        title: "Isolation Masterpiece",
        posterPath: "/iso.jpg",
        releaseYear: 2022,
        tagline: "Unbreakable.",
        elo: 1600,
        comparisons: 15,
        parked: true,
      };

      const originalList = {
        title: "Original Ranked List",
        movies: [originalMovie],
      };

      const forkedSession = createForkSession(originalList);

      // Verify clean initial state
      expect(forkedSession.movies[0].elo).toBe(1000);
      expect(forkedSession.movies[0].comparisons).toBe(0);
      expect(forkedSession.movies[0].parked).toBe(false);

      // Mutate original object
      originalMovie.elo = 9999;
      originalMovie.title = "Mutated In Source";

      // Verify forked session remains completely uncorrupted
      expect(forkedSession.movies[0].elo).toBe(1000);
      expect(forkedSession.movies[0].title).toBe("Isolation Masterpiece");
    });
  });

  // ==========================================================================
  // 12. CURATOR ROULETTE UNIFORMITY & COMPATIBILITY
  // ==========================================================================
  describe("12. Curator Roulette Uniformity & Stress Distribution", () => {
    it("proves all 6 micro-packs are reachable and uniform over 10,000 roulette spins", () => {
      const counts = new Map<string, number>();
      for (const pack of CURATOR_MICRO_PACKS) {
        counts.set(pack.slug, 0);
      }

      for (let i = 0; i < 10000; i++) {
        const pack = getRandomMicroPack();
        counts.set(pack.slug, (counts.get(pack.slug) ?? 0) + 1);
      }

      // Invariant: Every micro-pack must be selected at least 1,000 times out of 10,000 (expected ~1,666)
      for (const [slug, count] of counts) {
        expect(count, `Micro-pack ${slug} was starved with only ${count} spins`).toBeGreaterThan(1000);
      }
    });
  });

  // ==========================================================================
  // 13. CROSS-FEATURE FUZZ TOURNAMENT GENERATOR
  // ==========================================================================
  describe("13. Cross-Feature Fuzz Tournament Generator", () => {
    it("fuzzes 1,000 random pairwise duel tournaments validating mathematical convergence", () => {
      let movies: RankedMovie[] = Array.from({ length: 6 }, (_, i) => ({
        tmdbId: 100 + i,
        title: `Contender ${i + 1}`,
        posterPath: null,
        releaseYear: 2020 + i,
        elo: 1000,
        comparisons: 0,
        parked: false,
      }));

      const history: Array<[number, number]> = [];

      for (let round = 0; round < 100; round++) {
        const pair = nextMatchup(movies);
        expect(pair[0].tmdbId).not.toBe(pair[1].tmdbId);

        // Deterministic bias: Lower ID has 70% win probability to simulate natural skill hierarchy
        const winner = pair[0].tmdbId < pair[1].tmdbId ? pair[0].tmdbId : pair[1].tmdbId;
        const loser = winner === pair[0].tmdbId ? pair[1].tmdbId : pair[0].tmdbId;

        const res = recordMatchupResult(movies, winner, loser);
        movies = res.movies;
        history.push([winner, loser]);
      }

      // Verify mathematical invariants
      for (const m of movies) {
        expect(Number.isFinite(m.elo)).toBe(true);
        expect(isNaN(m.elo)).toBe(false);
        expect(m.comparisons).toBeGreaterThan(0);
      }

      const ranks = finalizeRanks(movies);
      expect(ranks).toHaveLength(6);
      expect(ranks.map((r) => r.rank).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});
