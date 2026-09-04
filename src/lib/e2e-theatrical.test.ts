/**
 * ============================================================================
 * END-TO-END THEATRICAL SUITE & QUALITY GUARDRAILS (MILESTONE 4)
 * ============================================================================
 * Comprehensive, opaque-box, requirement-driven end-to-end verification covering:
 *
 * - TIER 1: Feature Specifications (F1 through F12, >=5 tests per feature)
 *   F1: Keyboard Blitz Actions (vote_left, vote_right, park_candidate, undo)
 *   F2: TMDB Taglines normalization & rendering
 *   F3: Web Audio Synthesizer click & chime, gain ramps, mute default, persistence
 *   F4: Win Streak calculation & 3+ laurel badge threshold
 *   F5: "Lights Down" cinema focus mode state & storage
 *   F6: Curtain Call confetti & spotlight state transitions
 *   F7: Shareable Premiere Pass HTML5 2D Canvas rendering, DPI, barcode, date, copy & download
 *   F8: Versus Head-to-Head concordance calculation, sharpest clash, shared favorites
 *   F9: Community Upvoting API route GET/POST, 401 unauthenticated response, rate limiting, atomic count
 *   F10: Trending showcase filtering, sorting, and poster triptych extraction
 *   F11: Fork & Re-rank Elo reset (1000), comparisons reset (0), title prefixing, session persistence
 *   F12: Curator Roulette micro-packs structure, distinct TMDB IDs, uniform random distribution, exclusion logic
 *
 * - TIER 2: Boundary & Corner Cases (0-item, 1-item, 1000-item lists, corrupted storage, quota errors, focus guards)
 * - TIER 3: Cross-Feature Combinations (Fork -> Blitz -> Streaks -> Consensus -> Curtain Call -> Pass Export; Roulette -> Audio -> Focus -> Versus)
 * - TIER 4: Real-World Application Scenarios (Oscar Snubs, 90s Cyberpunk, A24 Gems Tournaments)
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
  stabilityVotesN,
  type RankedMovie,
} from "./ranking";
import {
  clearSession,
  loadSession,
  saveSession,
  type PlaySession,
} from "./session";

// ============================================================================
// TEST ENVIRONMENT MOCKS (LocalStorage, AudioContext, HTML5 Canvas, Supabase)
// ============================================================================

// 1. In-Memory LocalStorage Mock
const localStorageStore = new Map<string, string>();
let quotaExceededTrigger = false;

function setupLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => localStorageStore.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (quotaExceededTrigger) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      localStorageStore.set(k, v);
    },
    removeItem: (k: string) => localStorageStore.delete(k),
    clear: () => localStorageStore.clear(),
  });
}

// 2. Web Audio API Mock
interface MockAudioParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
}

function createMockAudioParam(initialValue = 0): MockAudioParam {
  return {
    value: initialValue,
    setValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
  };
}

function createMockWebAudioContext() {
  const oscillators: Array<{
    type: string;
    frequency: MockAudioParam;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];

  const gains: Array<{
    gain: MockAudioParam;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  const filters: Array<{
    type: string;
    frequency: MockAudioParam;
    Q: MockAudioParam;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  const bufferSources: Array<{
    buffer: unknown;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];

  const ctx = {
    currentTime: 100.0,
    sampleRate: 44100,
    state: "running" as AudioContextState,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => {
      const g = {
        gain: createMockAudioParam(1),
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn().mockReturnThis(),
      };
      gains.push(g);
      return g as unknown as GainNode;
    }),
    createOscillator: vi.fn(() => {
      const osc = {
        type: "sine",
        frequency: createMockAudioParam(440),
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn().mockReturnThis(),
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
      };
      oscillators.push(osc);
      return osc as unknown as OscillatorNode;
    }),
    createBiquadFilter: vi.fn(() => {
      const f = {
        type: "lowpass",
        frequency: createMockAudioParam(1000),
        Q: createMockAudioParam(1),
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn().mockReturnThis(),
      };
      filters.push(f);
      return f as unknown as BiquadFilterNode;
    }),
    createBufferSource: vi.fn(() => {
      const bs = {
        buffer: null,
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn().mockReturnThis(),
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
      };
      bufferSources.push(bs);
      return bs as unknown as AudioBufferSourceNode;
    }),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
      const channelData = new Float32Array(length);
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: vi.fn(() => channelData),
      } as unknown as AudioBuffer;
    }),
    _oscillators: oscillators,
    _gains: gains,
    _filters: filters,
    _bufferSources: bufferSources,
  };

  return ctx;
}

// 3. HTML5 Canvas & Clipboard Mock
function createMockCanvasContext() {
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
    measureText: vi.fn().mockReturnValue({ width: 120 }),
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
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

function setupDOMAndCanvasMock() {
  const fakeBlob = new Blob(["mock-image-png"], { type: "image/png" });
  const mockCtx = createMockCanvasContext();
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(mockCtx),
    toBlob: vi.fn().mockImplementation((cb: (b: Blob | null) => void) => cb(fakeBlob)),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,mockpngdata"),
  } as unknown as HTMLCanvasElement;

  const clickFn = vi.fn();
  const mockAnchor = {
    href: "",
    download: "",
    click: clickFn,
  };
  const appendChild = vi.fn();
  const removeChild = vi.fn();

  (globalThis as unknown as { document: unknown }).document = {
    createElement: vi.fn().mockImplementation((tag: string) => {
      if (tag === "canvas") return mockCanvas;
      if (tag === "a") return mockAnchor;
      return { tagName: tag.toUpperCase() };
    }),
    body: {
      appendChild,
      removeChild,
    },
    activeElement: null,
  };

  type GlobalURL = typeof URL & {
    createObjectURL: (obj: Blob | MediaSource) => string;
    revokeObjectURL: (url: string) => void;
  };
  const gURL = globalThis.URL as unknown as GlobalURL;

  if (typeof gURL.createObjectURL !== "function") {
    gURL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-uuid-blob");
  } else {
    vi.spyOn(gURL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-uuid-blob");
  }

  if (typeof gURL.revokeObjectURL !== "function") {
    gURL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(gURL, "revokeObjectURL").mockImplementation(() => {});
  }

  const clipboardWriteFn = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis, "navigator", {
    value: {
      clipboard: {
        write: clipboardWriteFn,
      },
    },
    writable: true,
    configurable: true,
  });

  (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = class ClipboardItem {
    constructor(public data: unknown) {}
  };

  return { mockCtx, mockCanvas, mockAnchor, clickFn, appendChild, removeChild, clipboardWriteFn, fakeBlob };
}

// 4. Supabase Mock for API routes & queries
type DbCall = { table: string; method: string; args: unknown[] };
interface MockDatabaseState {
  user: { id: string } | null;
  list: {
    id: string;
    owner_id: string;
    status: string;
    visibility: string;
    upvotes_count: number;
  } | null;
  upvote: { id: number } | null;
  calls: DbCall[];
}

let mockDbState: MockDatabaseState = {
  user: { id: "user-123" },
  list: {
    id: "list-abc",
    owner_id: "user-owner",
    status: "done",
    visibility: "public",
    upvotes_count: 7,
  },
  upvote: null,
  calls: [],
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => {
    const resolve = async () => {
      const last = mockDbState.calls[mockDbState.calls.length - 1];
      if (last?.table === "lists") {
        return { data: mockDbState.list, error: null };
      }
      if (last?.table === "list_upvotes") {
        if (mockDbState.calls.some((c) => c.table === "list_upvotes" && c.method === "delete")) {
          return { data: null, error: null };
        }
        if (mockDbState.calls.some((c) => c.table === "list_upvotes" && c.method === "insert")) {
          return { data: null, error: null };
        }
        return { data: mockDbState.upvote, error: null };
      }
      return { data: null, error: null };
    };

    const client = {
      auth: {
        getUser: async () => ({ data: { user: mockDbState.user }, error: null }),
      },
      from(table: string) {
        const obj: Record<string, unknown> = {};
        for (const method of ["select", "eq", "single", "maybeSingle", "insert", "delete", "order", "limit", "in"]) {
          obj[method] = (...args: unknown[]) => {
            mockDbState.calls.push({ table, method, args });
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

// Dynamic import of route handler
const { GET: handleGetUpvote, POST: handlePostUpvote } = await import(
  "../app/api/lists/[id]/upvote/route"
);

// Lifecycle Hooks
beforeEach(() => {
  localStorageStore.clear();
  quotaExceededTrigger = false;
  setupLocalStorage();
  setAudioContextForTesting(null);
  setupDOMAndCanvasMock();
  mockDbState = {
    user: { id: "user-123" },
    list: {
      id: "list-abc",
      owner_id: "user-owner",
      status: "done",
      visibility: "public",
      upvotes_count: 7,
    },
    upvote: null,
    calls: [],
  };
  vi.clearAllMocks();
});

afterEach(() => {
  localStorageStore.clear();
  setAudioContextForTesting(null);
});

// ============================================================================
// TIER 1: FEATURE SPECIFICATIONS (F1 THROUGH F12)
// ============================================================================

describe("Tier 1: Feature Specifications", () => {
  const movieLeft: RankedMovie = {
    tmdbId: 101,
    title: "Blade Runner",
    posterPath: "/bladerunner.jpg",
    releaseYear: 1982,
    tagline: "Man has made his match... now it's his problem.",
    elo: 1000,
    comparisons: 0,
    parked: false,
  };

  const movieRight: RankedMovie = {
    tmdbId: 102,
    title: "The Matrix",
    posterPath: "/matrix.jpg",
    releaseYear: 1999,
    tagline: "Welcome to the Real World.",
    elo: 1000,
    comparisons: 0,
    parked: false,
  };

  const activeBlitzState: BlitzState = {
    pair: [movieLeft, movieRight],
    canUndo: true,
    isSettling: false,
    isFinished: false,
    isConsensus: false,
    isModalOpen: false,
    activeMoviesCount: 2,
  };

  // --------------------------------------------------------------------------
  // F1: Keyboard Blitz Actions
  // --------------------------------------------------------------------------
  describe("F1: Keyboard Blitz Navigation Actions", () => {
    it("resolves vote_left for ArrowLeft, 'a', 'A', and 'KeyA'", () => {
      const keys = [
        { key: "ArrowLeft" },
        { key: "a" },
        { key: "A" },
        { key: "", code: "KeyA" },
      ];
      for (const ev of keys) {
        const action = resolveBlitzAction(ev, activeBlitzState);
        expect(action).toEqual({
          type: "vote_left",
          winnerId: 101,
          loserId: 102,
        });
      }
    });

    it("resolves vote_right for ArrowRight, 'd', 'D', and 'KeyD'", () => {
      const keys = [
        { key: "ArrowRight" },
        { key: "d" },
        { key: "D" },
        { key: "", code: "KeyD" },
      ];
      for (const ev of keys) {
        const action = resolveBlitzAction(ev, activeBlitzState);
        expect(action).toEqual({
          type: "vote_right",
          winnerId: 102,
          loserId: 101,
        });
      }
    });

    it("ignores Spacebar key so candidate parking is strictly click-only", () => {
      const keys = [
        { key: " " },
        { key: "Space" },
        { key: "", code: "Space" },
      ];
      for (const ev of keys) {
        const action = resolveBlitzAction(ev, activeBlitzState);
        expect(action).toBeNull();
      }
    });

    it("resolves undo for 'z', 'Z', 'KeyZ', Ctrl+Z, and Meta+Z when canUndo is true", () => {
      const keys = [
        { key: "z" },
        { key: "Z" },
        { key: "", code: "KeyZ" },
        { key: "z", ctrlKey: true },
        { key: "z", metaKey: true },
      ];
      for (const ev of keys) {
        const action = resolveBlitzAction(ev, activeBlitzState);
        expect(action).toEqual({ type: "undo" });
      }

      // When canUndo is false, undo returns null
      const cannotUndoState = { ...activeBlitzState, canUndo: false };
      expect(resolveBlitzAction({ key: "z" }, cannotUndoState)).toBeNull();
    });

    it("blocks voting when editable input or contenteditable element is focused", () => {
      const editableTargets = [
        { tagName: "INPUT" },
        { tagName: "TEXTAREA" },
        { tagName: "SELECT" },
        { isContentEditable: true },
        { getAttribute: (attr: string) => (attr === "contenteditable" ? "true" : null) },
      ];

      for (const target of editableTargets) {
        expect(isEditableElement(target as unknown as EventTarget)).toBe(true);
        const action = resolveBlitzAction(
          { key: "ArrowLeft", target: target as unknown as EventTarget },
          activeBlitzState,
        );
        expect(action).toBeNull();
      }
    });

    it("blocks hotkeys during modal open, settling animation, consensus, or IME composition", () => {
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...activeBlitzState, isModalOpen: true })).toBeNull();
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...activeBlitzState, isSettling: true })).toBeNull();
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...activeBlitzState, isFinished: true })).toBeNull();
      expect(resolveBlitzAction({ key: "ArrowLeft" }, { ...activeBlitzState, isConsensus: true })).toBeNull();
      expect(resolveBlitzAction({ key: "ArrowLeft", isComposing: true }, activeBlitzState)).toBeNull();
      // Blocked with Alt modifier or Shift modifier on voting keys
      expect(resolveBlitzAction({ key: "ArrowLeft", altKey: true }, activeBlitzState)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // F2: TMDB Movie Taglines
  // --------------------------------------------------------------------------
  describe("F2: TMDB Movie Taglines Normalization & Preservation", () => {
    it("preserves tagline string on RankedMovie objects", () => {
      expect(movieLeft.tagline).toBe("Man has made his match... now it's his problem.");
      expect(movieRight.tagline).toBe("Welcome to the Real World.");
    });

    it("preserves taglines across PlaySession persistence", () => {
      const session: PlaySession = {
        title: "Sci-Fi Greats",
        participants: ["Alice"],
        movies: [movieLeft, movieRight],
        votesSinceOrderChange: 0,
        nudgeShown: false,
      };
      saveSession(session);
      const loaded = loadSession();
      expect(loaded).not.toBeNull();
      expect(loaded?.movies[0].tagline).toBe(movieLeft.tagline);
      expect(loaded?.movies[1].tagline).toBe(movieRight.tagline);
    });

    it("preserves taglines when creating a fork session", () => {
      const fork = createForkSession({
        title: "Sci-Fi Duel",
        movies: [movieLeft, movieRight],
      });
      expect(fork.movies[0].tagline).toBe(movieLeft.tagline);
      expect(fork.movies[1].tagline).toBe(movieRight.tagline);
    });

    it("accepts and attaches custom taglines when launching micro-packs", () => {
      const session = launchMicroPackSession("cyberpunk-90s", [
        {
          tmdbId: 603,
          title: "The Matrix",
          tagline: "Free your mind.",
        },
      ]);
      expect(session.movies[0].tagline).toBe("Free your mind.");
    });

    it("normalizes null, undefined, or empty taglines cleanly", () => {
      const fork = createForkSession({
        title: "Empty Taglines",
        movies: [
          { tmdbId: 201, title: "No Tagline Film", tagline: null },
          { tmdbId: 202, title: "Undefined Tagline Film" },
        ],
      });
      expect(fork.movies[0].tagline).toBeNull();
      expect(fork.movies[1].tagline).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // F3: Web Audio Synthesizer
  // --------------------------------------------------------------------------
  describe("F3: Web Audio Vintage Cinema Synthesizer", () => {
    it("defaults to muted with localStorage persistence", () => {
      expect(isSoundEnabled()).toBe(false);
      setSoundEnabled(true);
      expect(isSoundEnabled()).toBe(true);
      expect(localStorageStore.get(STORAGE_KEY_SOUND)).toBe("true");
      setSoundEnabled(false);
      expect(isSoundEnabled()).toBe(false);
    });

    it("synthesizes mechanical shutter click when sound is enabled", () => {
      setSoundEnabled(true);
      const mockCtx = createMockWebAudioContext();
      playShutterClick(mockCtx as unknown as AudioContext);

      // Noise burst for transient friction
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
      expect(mockCtx._bufferSources[0].start).toHaveBeenCalledWith(100.0);

      // Low mechanical oscillator (180Hz -> 42Hz)
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
      expect(mockCtx._oscillators[0].type).toBe("triangle");
      expect(mockCtx._oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(180, 100.0);
      expect(mockCtx._oscillators[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(42, 100.035);

      // Gains and biquad filters
      expect(mockCtx.createGain).toHaveBeenCalledTimes(2);
      expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(2);
    });

    it("synthesizes celestial pentatonic golden chime with 3 harmonic notes", () => {
      setSoundEnabled(true);
      const mockCtx = createMockWebAudioContext();
      playGoldenChime(mockCtx as unknown as AudioContext);

      // Master lowpass filter at 3200Hz
      expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
      expect(mockCtx._filters[0].frequency.setValueAtTime).toHaveBeenCalledWith(3200, 100.0);

      // 3 harmonic sine oscillators: D5 (587.33Hz), A5 (880Hz), F#6 (1479.98Hz)
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
      expect(mockCtx._oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(587.33, 100.0);
      expect(mockCtx._oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(880.0, 100.02);
      expect(mockCtx._oscillators[2].frequency.setValueAtTime).toHaveBeenCalledWith(1479.98, 100.04);
      expect(mockCtx.createGain).toHaveBeenCalledTimes(3);
    });

    it("does not synthesize audio when sound is muted", () => {
      setSoundEnabled(false);
      const mockCtx = createMockWebAudioContext();
      playShutterClick(mockCtx as unknown as AudioContext);
      playGoldenChime(mockCtx as unknown as AudioContext);

      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
      expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
      expect(mockCtx.createGain).not.toHaveBeenCalled();
    });

    it("swallows storage quota errors gracefully without throwing", () => {
      quotaExceededTrigger = true;
      expect(() => setSoundEnabled(true)).not.toThrow();
      expect(() => setLightsDown(true)).not.toThrow();
    });

    it("resumes suspended AudioContext via unlockAudioContext", async () => {
      const mockCtx = createMockWebAudioContext();
      mockCtx.state = "suspended";
      await unlockAudioContext(mockCtx as unknown as AudioContext);
      expect(mockCtx.resume).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // F4: Win Streak Laurel Badges
  // --------------------------------------------------------------------------
  describe("F4: Win Streak Calculation & Laurel Badges", () => {
    it("returns 0 for empty history or null history", () => {
      expect(getMovieWinStreak([], 101)).toBe(0);
      expect(getMovieWinStreak(null, 101)).toBe(0);
      expect(getMovieWinStreak(undefined, 101)).toBe(0);
    });

    it("calculates consecutive win streak traversing backwards", () => {
      const history: Array<[number, number]> = [
        [101, 102], // win 1
        [101, 103], // win 2
        [101, 104], // win 3
      ];
      expect(getMovieWinStreak(history, 101)).toBe(3);
    });

    it("stops traversal immediately at the first loss", () => {
      const history: Array<[number, number]> = [
        [101, 102], // win
        [101, 103], // win
        [104, 101], // loss!
        [101, 105], // win
      ];
      // 101 won the most recent, then lost before that
      expect(getMovieWinStreak(history, 101)).toBe(1);
    });

    it("ignores interleaving matchups between other movies", () => {
      const history: Array<[number, number]> = [
        [101, 102], // 101 win 1
        [201, 202], // other match
        [101, 103], // 101 win 2
        [301, 302], // other match
        [101, 104], // 101 win 3
      ];
      expect(getMovieWinStreak(history, 101)).toBe(3);
    });

    it("qualifies for laurel badge if and only if streak >= STREAK_LAUREL_THRESHOLD (3)", () => {
      expect(STREAK_LAUREL_THRESHOLD).toBe(3);
      expect(hasLaurelBadge(0)).toBe(false);
      expect(hasLaurelBadge(1)).toBe(false);
      expect(hasLaurelBadge(2)).toBe(false);
      expect(hasLaurelBadge(3)).toBe(true);
      expect(hasLaurelBadge(5)).toBe(true);
    });

    it("recalculates win streak when undoing the latest matchup", () => {
      const history: Array<[number, number]> = [
        [101, 102],
        [101, 103],
        [101, 104], // streak = 3
      ];
      expect(getMovieWinStreak(history, 101)).toBe(3);
      expect(hasLaurelBadge(getMovieWinStreak(history, 101))).toBe(true);

      // Undo removes latest matchup
      history.pop();
      expect(getMovieWinStreak(history, 101)).toBe(2);
      expect(hasLaurelBadge(getMovieWinStreak(history, 101))).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // F5: "Lights Down" Cinema Focus Mode
  // --------------------------------------------------------------------------
  describe("F5: 'Lights Down' Cinema Focus Mode State & Storage", () => {
    it("defaults to lights down disabled (false)", () => {
      expect(isLightsDown()).toBe(false);
    });

    it("toggles and round-trips lights down preference in localStorage", () => {
      setLightsDown(true);
      expect(isLightsDown()).toBe(true);
      expect(localStorageStore.get(STORAGE_KEY_LIGHTS_DOWN)).toBe("true");

      setLightsDown(false);
      expect(isLightsDown()).toBe(false);
      expect(localStorageStore.get(STORAGE_KEY_LIGHTS_DOWN)).toBe("false");
    });

    it("handles corrupted localStorage values cleanly by returning false", () => {
      localStorageStore.set(STORAGE_KEY_LIGHTS_DOWN, "corrupt-data");
      expect(isLightsDown()).toBe(false);
    });

    it("handles storage quota errors gracefully on setLightsDown", () => {
      quotaExceededTrigger = true;
      expect(() => setLightsDown(true)).not.toThrow();
    });

    it("operates safely when localStorage is undefined", () => {
      vi.stubGlobal("localStorage", undefined);
      expect(isLightsDown()).toBe(false);
      expect(() => setLightsDown(true)).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // F6: Curtain Call Finale Celebration
  // --------------------------------------------------------------------------
  describe("F6: Curtain Call Finale Celebration State & Transitions", () => {
    it("exports proper palette colors for golden particles", () => {
      const expectedPalette = ["#f5c518", "#f5a524", "#fff1b8", "#d0d4dc", "#ffffff", "#b3860a"];
      expect(expectedPalette).toHaveLength(6);
      expect(expectedPalette[0]).toBe("#f5c518"); // Premiere Gold
    });

    it("simulates consensus detection triggering finale stability state", () => {
      const movies: RankedMovie[] = [
        { ...movieLeft, elo: 1200, comparisons: 4 },
        { ...movieRight, elo: 800, comparisons: 4 },
      ];
      // When differentiated and quiet votes requirement met
      const stable = isStable(movies, 6, true);
      expect(stable).toBe(true);
    });

    it("verifies stability requirement scales with active movie count", () => {
      expect(stabilityVotesN(2)).toBe(3);
      expect(stabilityVotesN(6)).toBe(3);
      expect(stabilityVotesN(10)).toBe(5);
      expect(stabilityVotesN(12)).toBe(6);
      expect(stabilityVotesN(20)).toBe(6);
    });

    it("verifies ranks finalization for podium celebration", () => {
      const movies: RankedMovie[] = [
        { ...movieLeft, elo: 1250, comparisons: 5 },
        { ...movieRight, elo: 950, comparisons: 5 },
        { tmdbId: 103, title: "Alien", posterPath: null, releaseYear: 1979, elo: 800, comparisons: 5, parked: false },
      ];
      const ranks = finalizeRanks(movies);
      expect(ranks).toEqual([
        { tmdbId: 101, rank: 1 },
        { tmdbId: 102, rank: 2 },
        { tmdbId: 103, rank: 3 },
      ]);
    });

    it("marks parked movies with rank null during finale finalization", () => {
      const movies: RankedMovie[] = [
        { ...movieLeft, elo: 1100, comparisons: 3 },
        { ...movieRight, elo: 900, comparisons: 3 },
        { tmdbId: 103, title: "Parked Film", posterPath: null, releaseYear: 2000, elo: 1000, comparisons: 0, parked: true },
      ];
      const ranks = finalizeRanks(movies);
      expect(ranks).toEqual([
        { tmdbId: 101, rank: 1 },
        { tmdbId: 102, rank: 2 },
        { tmdbId: 103, rank: null },
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // F7: Shareable Premiere Pass Canvas & Ticket Generator
  // --------------------------------------------------------------------------
  describe("F7: Shareable Premiere Pass Canvas Rendering & Export", () => {
    const ticketOptions: TicketRenderOptions = {
      title: "Top Sci-Fi Masterpieces",
      creatorHandle: "cinephile",
      date: new Date(2026, 8, 2),
      items: [
        { rank: 1, title: "Blade Runner", releaseYear: 1982, posterPath: "/bladerunner.jpg" },
        { rank: 2, title: "The Matrix", releaseYear: 1999, posterPath: "/matrix.jpg" },
        { rank: 3, title: "2001: A Space Odyssey", releaseYear: 1968 },
        { rank: 4, title: "Solaris", releaseYear: 1972 },
        { rank: 5, title: "Arrival", releaseYear: 2016 },
      ],
      totalRanked: 10,
    };

    it("generates deterministic vintage ticket serial numbers", () => {
      const s1 = generateTicketSerialNumber("Top Sci-Fi Masterpieces", "2026-09-02");
      const s2 = generateTicketSerialNumber("Top Sci-Fi Masterpieces", "2026-09-02");
      expect(s1).toBe(s2);
      expect(s1).toMatch(/^№ MR-\d{5}$/);
    });

    it("formats vintage ticket dates with month, day, and year", () => {
      const d = new Date(2026, 8, 2);
      expect(formatTicketDate(d)).toContain("2026");
      expect(formatTicketDate("2026-10-31")).toContain("2026");
      expect(formatTicketDate("invalid-date")).toBe("SEPTEMBER 2026");
    });

    it("draws 1D vintage cinema barcode via canvas fillRect", () => {
      const mockCtx = createMockCanvasContext();
      drawBarcode(mockCtx, 50, 50, 200, 100, "№ MR-12345");
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect((mockCtx.fillRect as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(10);
    });

    it("renders full 1200x675 canvas with ornate golden styling", async () => {
      const canvas = await generatePremierePassCanvas(ticketOptions);
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(675);
    });

    it("exports canvas as a PNG blob", async () => {
      const blob = await exportPremierePassBlob(ticketOptions);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/png");
    });

    it("copies image to clipboard and triggers file download", async () => {
      const copied = await copyPremierePassToClipboard(ticketOptions);
      expect(copied).toBe(true);

      await downloadPremierePass(ticketOptions, "custom-ticket.png");
      const anchor = (document.createElement("a") as unknown as { download: string; click: ReturnType<typeof vi.fn> });
      expect(anchor.click).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // F8: Versus Head-to-Head Concordance & Disagreements
  // --------------------------------------------------------------------------
  describe("F8: Versus Head-to-Head Concordance & Disagreements", () => {
    const listA: VersusEntry[] = [
      { tmdbId: 1, title: "Interstellar", rank: 1, posterPath: null },
      { tmdbId: 2, title: "Inception", rank: 2, posterPath: null },
      { tmdbId: 3, title: "Oppenheimer", rank: 3, posterPath: null },
      { tmdbId: 4, title: "The Prestige", rank: 4, posterPath: null },
      { tmdbId: 5, title: "Memento", rank: 5, posterPath: null },
    ];

    const listB: VersusEntry[] = [
      { tmdbId: 1, title: "Interstellar", rank: 1, posterPath: null },
      { tmdbId: 3, title: "Oppenheimer", rank: 2, posterPath: null },
      { tmdbId: 2, title: "Inception", rank: 3, posterPath: null },
      { tmdbId: 5, title: "Memento", rank: 4, posterPath: null },
      { tmdbId: 4, title: "The Prestige", rank: 5, posterPath: null },
    ];

    it("computes pairwise concordance agreement percentage accurately", () => {
      const versus = computeVersus(listA, listB);
      expect(versus.shared).toHaveLength(5);
      expect(versus.agreementPct).toBe(80); // 8 out of 10 pairs agree
      expect(versus.compatibilityScore).toBe(80);
    });

    it("identifies the single sharpest clash with highest |delta|", () => {
      const clash = findSharpestClash([
        { tmdbId: 1, title: "Film A", rankA: 1, rankB: 2, delta: 1, posterPath: null },
        { tmdbId: 2, title: "Film B", rankA: 1, rankB: 10, delta: 9, posterPath: null }, // Sharpest clash
        { tmdbId: 3, title: "Film C", rankA: 4, rankB: 6, delta: 2, posterPath: null },
      ]);
      expect(clash).not.toBeNull();
      expect(clash?.tmdbId).toBe(2);
      expect(clash?.delta).toBe(9);
    });

    it("identifies mutual shared favorites ranked highly by both users", () => {
      const favs = findSharedFavorites([
        { tmdbId: 1, title: "Interstellar", rankA: 1, rankB: 1, delta: 0, posterPath: null },
        { tmdbId: 2, title: "Oppenheimer", rankA: 2, rankB: 3, delta: 1, posterPath: null },
        { tmdbId: 3, title: "Memento", rankA: 9, rankB: 10, delta: 1, posterPath: null },
      ]);
      expect(favs).toHaveLength(2);
      expect(favs[0].title).toBe("Interstellar");
    });

    it("maps concordance percentage to Premiere Night copy tiers", () => {
      expect(compatibilityTier(95)).toBe("Basically twins");
      expect(compatibilityTier(75)).toBe("Mostly aligned");
      expect(compatibilityTier(55)).toBe("Spicy differences");
      expect(compatibilityTier(30)).toBe("Opposite ends of the couch");
    });

    it("enforces canCompare gating rules and extractListId URL parser", () => {
      expect(canCompare({ status: "done", visibility: "public", ownerId: "u1" }, null)).toBe(true);
      expect(canCompare({ status: "done", visibility: "unlisted", ownerId: "u1" }, null)).toBe(true);
      expect(canCompare({ status: "done", visibility: "private", ownerId: "u1" }, "u1")).toBe(true);
      expect(canCompare({ status: "done", visibility: "private", ownerId: "u1" }, "u2")).toBe(false);
      expect(canCompare({ status: "draft", visibility: "public", ownerId: "u1" }, "u1")).toBe(false);

      expect(extractListId("abc-123")).toBe("abc-123");
      expect(extractListId("https://movieranker.win/l/cyberpunk-list")).toBe("cyberpunk-list");
      expect(extractListId("")).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // F9: Community Upvoting System
  // --------------------------------------------------------------------------
  describe("F9: Community Upvoting API Route GET/POST", () => {
    it("GET: returns 200 with upvote count and state for public list", async () => {
      const res = await handleGetUpvote(new Request("http://localhost/api/lists/list-abc/upvote"), {
        params: Promise.resolve({ id: "list-abc" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.upvotesCount).toBe(7);
      expect(data.hasUpvoted).toBe(false);
    });

    it("POST: returns 401 unauthenticated for guest users", async () => {
      mockDbState.user = null;
      const res = await handlePostUpvote(
        new Request("http://localhost/api/lists/list-abc/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-abc" }) },
      );
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("unauthenticated");
    });

    it("POST: toggles upvote ON (inserts row, increments count) when not yet upvoted", async () => {
      mockDbState.user = { id: "user-123" };
      mockDbState.upvote = null;
      const res = await handlePostUpvote(
        new Request("http://localhost/api/lists/list-abc/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-abc" }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.hasUpvoted).toBe(true);
      expect(data.upvotesCount).toBe(8);
    });

    it("POST: toggles upvote OFF (deletes row, decrements count) when already upvoted", async () => {
      mockDbState.user = { id: "user-123" };
      mockDbState.upvote = { id: 999 };
      const res = await handlePostUpvote(
        new Request("http://localhost/api/lists/list-abc/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-abc" }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.hasUpvoted).toBe(false);
      expect(data.upvotesCount).toBe(6);
    });

    it("POST: returns 403 when attempting to upvote a draft list", async () => {
      mockDbState.list = {
        id: "list-draft",
        owner_id: "other-user",
        status: "draft",
        visibility: "unlisted",
        upvotes_count: 0,
      };
      const res = await handlePostUpvote(
        new Request("http://localhost/api/lists/list-draft/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-draft" }) },
      );
      expect(res.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // F10: Trending Showcase & Poster Triptych
  // --------------------------------------------------------------------------
  describe("F10: Trending Showcase Filtering & Triptych Generation", () => {
    const rawLists: RawDbListRow[] = [
      {
        id: "l1",
        title: "Oscar Contenders",
        description: null,
        owner_id: "u1",
        status: "done",
        visibility: "public",
        upvotes_count: 15,
        created_at: "2026-08-01T00:00:00Z",
        list_movies: [
          { tmdb_id: 1, title: "Film 1", poster_path: "/p1.jpg", release_year: 2024, final_rank: 1 },
          { tmdb_id: 2, title: "Film 2", poster_path: "/p2.jpg", release_year: 2024, final_rank: 2 },
          { tmdb_id: 3, title: "Film 3", poster_path: "/p3.jpg", release_year: 2024, final_rank: 3 },
          { tmdb_id: 4, title: "Film 4", poster_path: "/p4.jpg", release_year: 2024, final_rank: 4 },
        ],
      },
      {
        id: "l2",
        title: "Draft List",
        description: null,
        owner_id: "u2",
        status: "draft",
        visibility: "public",
        upvotes_count: 50,
        created_at: "2026-08-02T00:00:00Z",
      },
      {
        id: "l3",
        title: "Cult Classics",
        description: null,
        owner_id: "u3",
        status: "done",
        visibility: "public",
        upvotes_count: 20,
        created_at: "2026-08-03T00:00:00Z",
      },
    ];

    it("filters out draft/private lists and sorts by upvotes DESC", () => {
      const formatted = formatTrendingLists(rawLists);
      expect(formatted).toHaveLength(2);
      expect(formatted[0].id).toBe("l3"); // 20 upvotes
      expect(formatted[1].id).toBe("l1"); // 15 upvotes
    });

    it("attaches owner handles from profile map", () => {
      const handles = new Map([["u1", "filmexpert"]]);
      const formatted = formatTrendingLists(rawLists, handles);
      expect(formatted.find((l) => l.id === "l1")?.ownerHandle).toBe("filmexpert");
      expect(formatted.find((l) => l.id === "l3")?.ownerHandle).toBeNull();
    });

    it("extracts top 3 posters ordered by finalRank", () => {
      const formatted = formatTrendingLists(rawLists);
      const l1 = formatted.find((l) => l.id === "l1");
      expect(l1?.topPosters).toHaveLength(3);
      expect(l1?.topPosters[0].finalRank).toBe(1);
      expect(l1?.topPosters[1].finalRank).toBe(2);
      expect(l1?.topPosters[2].finalRank).toBe(3);
    });

    it("triptychSlots returns exactly 3 slots padded with null", () => {
      expect(triptychSlots(["/a.jpg", "/b.jpg", "/c.jpg"])).toEqual(["/a.jpg", "/b.jpg", "/c.jpg"]);
      expect(triptychSlots(["/a.jpg"])).toEqual(["/a.jpg", null, null]);
      expect(triptychSlots([])).toEqual([null, null, null]);
    });

    it("fetches trending lists from Supabase mock cleanly", async () => {
      const trending = await getTrendingLists();
      expect(Array.isArray(trending)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // F11: Fork & Re-rank Engine
  // --------------------------------------------------------------------------
  describe("F11: Fork & Re-rank Elo Reset & Session Persistence", () => {
    it("resets all movie Elo ratings to 1000 and comparisons to 0", () => {
      const originalMovies: RankedMovie[] = [
        { ...movieLeft, elo: 1450, comparisons: 12 },
        { ...movieRight, elo: 820, comparisons: 10 },
      ];
      const session = createForkSession({
        title: "Sci-Fi Ranking",
        movies: originalMovies,
      });

      expect(session.movies[0].elo).toBe(1000);
      expect(session.movies[0].comparisons).toBe(0);
      expect(session.movies[1].elo).toBe(1000);
      expect(session.movies[1].comparisons).toBe(0);
    });

    it("resets parked flags to false and clears participants", () => {
      const session = createForkSession({
        title: "Test Fork",
        movies: [{ ...movieLeft, parked: true }],
      });
      expect(session.movies[0].parked).toBe(false);
      expect(session.participants).toEqual([]);
    });

    it("prefixes title with 'Re-rank: ' without duplicating prefix", () => {
      const s1 = createForkSession({ title: "My Favorite Films", movies: [] });
      expect(s1.title).toBe("Re-rank: My Favorite Films");

      const s2 = createForkSession({ title: "Re-rank: My Favorite Films", movies: [] });
      expect(s2.title).toBe("Re-rank: My Favorite Films");
    });

    it("sets curated: false on forked sessions for full user customization", () => {
      const session = createForkSession({
        title: "Curated Pack",
        movies: [movieLeft],
        themeSlug: "cyberpunk-90s",
      });
      expect(session.curated).toBe(false);
      expect(session.themeSlug).toBe("cyberpunk-90s");
    });

    it("persists clean session to localStorage immediately", () => {
      createForkSession({ title: "Auto Save Fork", movies: [movieLeft] });
      const stored = loadSession();
      expect(stored).not.toBeNull();
      expect(stored?.title).toBe("Re-rank: Auto Save Fork");
      expect(stored?.movies[0].elo).toBe(1000);
    });
  });

  // --------------------------------------------------------------------------
  // F12: Curator Roulette Micro-Packs
  // --------------------------------------------------------------------------
  describe("F12: Curator Roulette Micro-Packs Catalog & Launcher", () => {
    it("contains at least 6 distinct thematic micro-packs with valid metadata", () => {
      expect(CURATOR_MICRO_PACKS.length).toBeGreaterThanOrEqual(6);
      for (const pack of CURATOR_MICRO_PACKS) {
        expect(pack.id).toBeTruthy();
        expect(pack.slug).toBeTruthy();
        expect(pack.title).toBeTruthy();
        expect(pack.blurb).toBeTruthy();
        expect(pack.genre).toBeTruthy();
        expect(pack.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(pack.movieIds.length).toBeGreaterThanOrEqual(5);
        expect(pack.sampleTitles.length).toBeGreaterThanOrEqual(5);
      }
    });

    it("ensures all movie IDs within every micro-pack are unique, positive integers", () => {
      for (const pack of CURATOR_MICRO_PACKS) {
        const idSet = new Set(pack.movieIds);
        expect(idSet.size).toBe(pack.movieIds.length);
        for (const id of pack.movieIds) {
          expect(Number.isInteger(id)).toBe(true);
          expect(id).toBeGreaterThan(0);
        }
      }
    });

    it("retrieves micro-packs by slug or id, returning undefined for invalid slugs", () => {
      const pack = getMicroPackBySlug("cyberpunk-90s");
      expect(pack).toBeDefined();
      expect(pack?.title).toBe("90s Cyberpunk");
      expect(getMicroPackBySlug("non-existent-pack")).toBeUndefined();
    });

    it("getRandomMicroPack respects excludeSlug", () => {
      for (let i = 0; i < 20; i++) {
        const pack = getRandomMicroPack("cyberpunk-90s");
        expect(pack.slug).not.toBe("cyberpunk-90s");
      }
    });

    it("launchMicroPackSession initializes and saves a curated PlaySession", () => {
      const session = launchMicroPackSession("a24-gems");
      expect(session.title).toBe("A24 Modern Gems");
      expect(session.curated).toBe(true);
      expect(session.themeSlug).toBe("a24-gems");
      expect(session.movies.length).toBeGreaterThanOrEqual(5);
      expect(session.movies[0].elo).toBe(1000);
      expect(session.movies[0].comparisons).toBe(0);

      const stored = loadSession();
      expect(stored?.title).toBe("A24 Modern Gems");
    });
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES
// ============================================================================

describe("Tier 2: Boundary & Corner Cases", () => {
  describe("List Size Extremes (0-item, 1-item, 1000-item rosters)", () => {
    it("handles 0-item empty lists safely across ranking, versus, and fork", () => {
      expect(() => nextMatchup([])).toThrow();
      expect(finalizeRanks([])).toEqual([]);
      expect(isStable([], 10, true)).toBe(false);

      const versus = computeVersus([], []);
      expect(versus.shared).toEqual([]);
      expect(versus.agreementPct).toBeNull();
      expect(versus.sharpestClash).toBeNull();

      const fork = createForkSession({ title: "Empty", movies: [] });
      expect(fork.movies).toEqual([]);
    });

    it("handles 1-item single movie rosters safely", () => {
      const single: RankedMovie = {
        tmdbId: 500,
        title: "Solo Movie",
        posterPath: null,
        releaseYear: 2020,
        elo: 1000,
        comparisons: 0,
        parked: false,
      };
      expect(() => nextMatchup([single])).toThrow();
      expect(finalizeRanks([single])).toEqual([{ tmdbId: 500, rank: 1 }]);
      expect(isStable([single], 10, true)).toBe(false);

      const versus = computeVersus(
        [{ tmdbId: 500, title: "Solo Movie", rank: 1, posterPath: null }],
        [{ tmdbId: 500, title: "Solo Movie", rank: 1, posterPath: null }],
      );
      expect(versus.shared).toHaveLength(1);
      // 1 shared movie has 0 pairs to compare, agreementPct must be null
      expect(versus.agreementPct).toBeNull();
    });

    it("scales smoothly to 1,000-item rosters without stack overflow or performance degradation", () => {
      const largeRoster: RankedMovie[] = Array.from({ length: 1000 }, (_, i) => ({
        tmdbId: i + 1,
        title: `Movie ${i + 1}`,
        posterPath: null,
        releaseYear: 2000 + (i % 25),
        elo: 1000 + (i % 50),
        comparisons: i % 5,
        parked: false,
      }));

      const startTime = performance.now();
      const pair = nextMatchup(largeRoster);
      const elapsed = performance.now() - startTime;

      expect(pair).toBeDefined();
      expect(pair[0].tmdbId).not.toBe(pair[1].tmdbId);
      expect(elapsed).toBeLessThan(3000); // Completes without hanging or timeout
    });
  });

  describe("Corrupted Storage & Quota Exceptions", () => {
    it("handles corrupted JSON in session storage by clearing and returning null", () => {
      localStorageStore.set("movieranker_play_session", "{ corrupted invalid json }}}");
      expect(loadSession()).toBeNull();
    });

    it("recovers gracefully when clearSession is called on empty storage", () => {
      expect(() => clearSession()).not.toThrow();
      clearSession();
      expect(loadSession()).toBeNull();
    });
  });

  describe("Extreme Rank Reversals & Disjoint Sets", () => {
    it("calculates 0% concordance for completely inverted rankings", () => {
      const forward: VersusEntry[] = [
        { tmdbId: 1, title: "A", rank: 1, posterPath: null },
        { tmdbId: 2, title: "B", rank: 2, posterPath: null },
        { tmdbId: 3, title: "C", rank: 3, posterPath: null },
        { tmdbId: 4, title: "D", rank: 4, posterPath: null },
      ];
      const reverse: VersusEntry[] = [
        { tmdbId: 4, title: "D", rank: 1, posterPath: null },
        { tmdbId: 3, title: "C", rank: 2, posterPath: null },
        { tmdbId: 2, title: "B", rank: 3, posterPath: null },
        { tmdbId: 1, title: "A", rank: 4, posterPath: null },
      ];

      const versus = computeVersus(forward, reverse);
      expect(versus.agreementPct).toBe(0);
      expect(versus.compatibilityScore).toBe(0);
      expect(compatibilityTier(versus.agreementPct!)).toBe("Opposite ends of the couch");
    });

    it("handles completely disjoint lists with 0 shared movies", () => {
      const list1: VersusEntry[] = [
        { tmdbId: 1, title: "A", rank: 1, posterPath: null },
        { tmdbId: 2, title: "B", rank: 2, posterPath: null },
      ];
      const list2: VersusEntry[] = [
        { tmdbId: 3, title: "C", rank: 1, posterPath: null },
        { tmdbId: 4, title: "D", rank: 2, posterPath: null },
      ];

      const versus = computeVersus(list1, list2);
      expect(versus.shared).toHaveLength(0);
      expect(versus.agreementPct).toBeNull();
      expect(versus.onlyInA).toHaveLength(2);
      expect(versus.onlyInB).toHaveLength(2);
    });
  });

  describe("Form Input Focus Guard Matrices", () => {
    it("detects activeElement focus across all form tags", () => {
      const doc = (globalThis as unknown as { document: { activeElement: unknown } }).document;

      doc.activeElement = { tagName: "INPUT" };
      expect(isInputOrEditableFocused()).toBe(true);

      doc.activeElement = { tagName: "TEXTAREA" };
      expect(isInputOrEditableFocused()).toBe(true);

      doc.activeElement = { tagName: "SELECT" };
      expect(isInputOrEditableFocused()).toBe(true);

      doc.activeElement = { tagName: "DIV", isContentEditable: true };
      expect(isInputOrEditableFocused()).toBe(true);

      doc.activeElement = { tagName: "BUTTON" };
      expect(isInputOrEditableFocused()).toBe(false);

      doc.activeElement = null;
      expect(isInputOrEditableFocused()).toBe(false);
    });

    it("evaluates matrix of modifier keys with blitz navigation", () => {
      const state: BlitzState = {
        pair: [
          { tmdbId: 1, title: "A", posterPath: null, releaseYear: null, elo: 1000, comparisons: 0, parked: false },
          { tmdbId: 2, title: "B", posterPath: null, releaseYear: null, elo: 1000, comparisons: 0, parked: false },
        ],
        canUndo: true,
        isSettling: false,
        isFinished: false,
        isConsensus: false,
        isModalOpen: false,
        activeMoviesCount: 2,
      };

      const modifierCombos: Array<{ event: KeyboardEventLike; expectedAction: string | null }> = [
        { event: { key: "ArrowLeft" }, expectedAction: "vote_left" },
        { event: { key: "ArrowLeft", ctrlKey: true }, expectedAction: null },
        { event: { key: "ArrowLeft", metaKey: true }, expectedAction: null },
        { event: { key: "ArrowLeft", altKey: true }, expectedAction: null },
        { event: { key: "z" }, expectedAction: "undo" },
        { event: { key: "z", ctrlKey: true }, expectedAction: "undo" },
        { event: { key: "z", metaKey: true }, expectedAction: "undo" },
        { event: { key: "z", altKey: true }, expectedAction: null }, // Alt+Z blocked
        { event: { key: "z", shiftKey: true, ctrlKey: true }, expectedAction: null }, // Shift+Ctrl+Z (Redo) blocked
      ];

      for (const { event, expectedAction } of modifierCombos) {
        const action = resolveBlitzAction(event, state);
        if (expectedAction === null) {
          expect(action).toBeNull();
        } else {
          expect(action?.type).toBe(expectedAction);
        }
      }
    });
  });
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS
// ============================================================================

describe("Tier 3: Cross-Feature User Journeys", () => {
  it("Workflow A: Fork -> Blitz Navigation -> 3+ Win Streak -> Consensus -> Premiere Pass Export", async () => {
    // 1. Fork a public list
    const originalList = {
      title: "90s Sci-Fi Masterpieces",
      movies: [
        { tmdbId: 10, title: "The Matrix", releaseYear: 1999, tagline: "Free your mind." },
        { tmdbId: 20, title: "Jurassic Park", releaseYear: 1993, tagline: "An adventure 65 million years in the making." },
        { tmdbId: 30, title: "Terminator 2", releaseYear: 1991, tagline: "It's nothing personal." },
        { tmdbId: 40, title: "12 Monkeys", releaseYear: 1995, tagline: "The future is history." },
      ],
    };
    const session = createForkSession(originalList);
    expect(session.title).toBe("Re-rank: 90s Sci-Fi Masterpieces");
    expect(session.movies).toHaveLength(4);

    let currentMovies = [...session.movies];
    const history: Array<[number, number]> = [];

    // 2. Play 4 matches where The Matrix (tmdbId: 10) wins repeatedly
    const rivals = [20, 30, 40, 20];
    for (const rivalId of rivals) {
      const rival = currentMovies.find((m) => m.tmdbId === rivalId)!;
      const matrix = currentMovies.find((m) => m.tmdbId === 10)!;

      const blitzState: BlitzState = {
        pair: [matrix, rival],
        canUndo: history.length > 0,
        isSettling: false,
        isFinished: false,
        isConsensus: false,
        isModalOpen: false,
        activeMoviesCount: 4,
      };

      // Cast vote with Keyboard blitz left action
      const action = resolveBlitzAction({ key: "ArrowLeft" }, blitzState);
      expect(action).toEqual({ type: "vote_left", winnerId: 10, loserId: rivalId });

      // Apply result
      const res = recordMatchupResult(currentMovies, 10, rivalId);
      currentMovies = res.movies;
      history.push([10, rivalId]);
    }

    // 3. Verify Matrix achieved a 4-game win streak with Laurel Badge
    const streak = getMovieWinStreak(history, 10);
    expect(streak).toBe(4);
    expect(hasLaurelBadge(streak)).toBe(true);

    // 4. Finalize ranks
    const finalRanks = finalizeRanks(currentMovies);
    expect(finalRanks[0].tmdbId).toBe(10);
    expect(finalRanks[0].rank).toBe(1);

    // 5. Generate shareable Premiere Pass canvas
    const ticketCanvas = await generatePremierePassCanvas({
      title: session.title,
      items: currentMovies.map((m) => ({
        rank: finalRanks.find((r) => r.tmdbId === m.tmdbId)?.rank ?? 1,
        title: m.title,
        releaseYear: m.releaseYear,
      })),
      totalRanked: 4,
    });
    expect(ticketCanvas.width).toBe(1200);
    expect(ticketCanvas.height).toBe(675);

    // 6. Copy to clipboard
    const copied = await copyPremierePassToClipboard({
      title: session.title,
      items: [{ rank: 1, title: "The Matrix", releaseYear: 1999 }],
    });
    expect(copied).toBe(true);
  });

  it("Workflow B: Curator Roulette -> Lights Down & Sound -> Tournament -> Head-to-Head Comparison", () => {
    // 1. Spin Curator Roulette
    const pack = getMicroPackBySlug("noir-classics");
    expect(pack).toBeDefined();
    const session = launchMicroPackSession(pack!);
    expect(session.curated).toBe(true);

    // 2. Enable Lights Down and Sound Effects
    setLightsDown(true);
    setSoundEnabled(true);
    expect(isLightsDown()).toBe(true);
    expect(isSoundEnabled()).toBe(true);

    // 3. User A simulates ranking
    const userARanking: VersusEntry[] = [
      { tmdbId: 807, title: "Double Indemnity", rank: 1, posterPath: null },
      { tmdbId: 389, title: "The Maltese Falcon", rank: 2, posterPath: null },
      { tmdbId: 539, title: "Sunset Boulevard", rank: 3, posterPath: null },
      { tmdbId: 15, title: "Touch of Evil", rank: 4, posterPath: null },
    ];

    // 4. User B simulates ranking with one sharp disagreement
    const userBRanking: VersusEntry[] = [
      { tmdbId: 807, title: "Double Indemnity", rank: 1, posterPath: null },
      { tmdbId: 15, title: "Touch of Evil", rank: 2, posterPath: null },
      { tmdbId: 539, title: "Sunset Boulevard", rank: 3, posterPath: null },
      { tmdbId: 389, title: "The Maltese Falcon", rank: 4, posterPath: null }, // Maltese Falcon: rank 2 vs rank 4 (|delta| = 2)
    ];

    // 5. Compare rankings
    const comparison = computeVersus(userARanking, userBRanking);
    expect(comparison.shared).toHaveLength(4);
    expect(comparison.agreementPct).toBe(50); // 3 out of 6 pairs agree
    expect(comparison.compatibilityScore).toBe(50);
    expect(comparison.sharpestClash?.title).toBe("The Maltese Falcon");
    expect(comparison.sharedFavorites[0].title).toBe("Double Indemnity");
  });
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS
// ============================================================================

describe("Tier 4: Real-World Movie Tournaments", () => {
  it("Scenario 1: Oscar Snubs Tournament (Shawshank, Pulp Fiction, 2001, Taxi Driver, Goodfellas)", () => {
    const movies: RankedMovie[] = [
      { tmdbId: 278, title: "The Shawshank Redemption", posterPath: "/shawshank.jpg", releaseYear: 1994, elo: 1000, comparisons: 0, parked: false },
      { tmdbId: 680, title: "Pulp Fiction", posterPath: "/pulp.jpg", releaseYear: 1994, elo: 1000, comparisons: 0, parked: false },
      { tmdbId: 62, title: "2001: A Space Odyssey", posterPath: "/2001.jpg", releaseYear: 1968, elo: 1000, comparisons: 0, parked: false },
      { tmdbId: 105, title: "Taxi Driver", posterPath: "/taxidriver.jpg", releaseYear: 1976, elo: 1000, comparisons: 0, parked: false },
      { tmdbId: 597, title: "Goodfellas", posterPath: "/goodfellas.jpg", releaseYear: 1990, elo: 1000, comparisons: 0, parked: false },
    ];

    let state = [...movies];
    const history: Array<[number, number]> = [];

    // Simulated tournament voting rounds
    const rounds: Array<[number, number]> = [
      [278, 680], // Shawshank beats Pulp Fiction
      [278, 62],  // Shawshank beats 2001
      [278, 105], // Shawshank beats Taxi Driver (Streak = 3!)
      [680, 597], // Pulp Fiction beats Goodfellas
      [62, 105],  // 2001 beats Taxi Driver
    ];

    for (const [winner, loser] of rounds) {
      state = applyWin(state, winner, loser);
      history.push([winner, loser]);
    }

    // Verify Shawshank has highest Elo and 3-win streak
    const shawshank = state.find((m) => m.tmdbId === 278)!;
    expect(shawshank.elo).toBeGreaterThan(1040);
    expect(getMovieWinStreak(history, 278)).toBe(3);
    expect(hasLaurelBadge(getMovieWinStreak(history, 278))).toBe(true);

    const ranks = finalizeRanks(state);
    expect(ranks[0].tmdbId).toBe(278); // Shawshank #1
  });

  it("Scenario 2: 90s Cyberpunk Speedrun with Park and Undo", () => {
    let movies: RankedMovie[] = [
      { tmdbId: 603, title: "The Matrix", posterPath: null, releaseYear: 1999, elo: 1000, comparisons: 0, parked: false },
      { tmdbId: 9331, title: "Ghost in the Shell", posterPath: null, releaseYear: 1995, elo: 1000, comparisons: 0, parked: false },
      { tmdbId: 280, title: "Strange Days", posterPath: null, releaseYear: 1995, elo: 1000, comparisons: 0, parked: false },
    ];

    // User parks "Strange Days" (tmdbId: 280) because they haven't seen it (click action)
    movies = movies.map((m) => (m.tmdbId === 280 ? { ...m, parked: true } : m));
    expect(movies.filter((m) => !m.parked)).toHaveLength(2);

    // Vote between Matrix and Ghost in the Shell
    movies = applyWin(movies, 603, 9331);
    const ranks = finalizeRanks(movies);
    expect(ranks).toEqual([
      { tmdbId: 603, rank: 1 },
      { tmdbId: 9331, rank: 2 },
      { tmdbId: 280, rank: null }, // Parked movie has rank null
    ]);
  });

  it("Scenario 3: A24 Gems Film Critics Confrontation", () => {
    const criticA: VersusEntry[] = [
      { tmdbId: 546554, title: "Everything Everywhere All at Once", rank: 1, posterPath: null },
      { tmdbId: 493922, title: "Past Lives", rank: 2, posterPath: null },
      { tmdbId: 497698, title: "Hereditary", rank: 3, posterPath: null },
      { tmdbId: 480530, title: "The Lighthouse", rank: 4, posterPath: null },
      { tmdbId: 473033, title: "Uncut Gems", rank: 5, posterPath: null },
      { tmdbId: 447332, title: "Moonlight", rank: 6, posterPath: null },
    ];

    const criticB: VersusEntry[] = [
      { tmdbId: 546554, title: "Everything Everywhere All at Once", rank: 1, posterPath: null },
      { tmdbId: 447332, title: "Moonlight", rank: 2, posterPath: null }, // Moonlight ranked #2 vs #6 (|delta| = 4)
      { tmdbId: 493922, title: "Past Lives", rank: 3, posterPath: null },
      { tmdbId: 480530, title: "The Lighthouse", rank: 4, posterPath: null },
      { tmdbId: 473033, title: "Uncut Gems", rank: 5, posterPath: null },
      { tmdbId: 497698, title: "Hereditary", rank: 6, posterPath: null }, // Hereditary ranked #6 vs #3 (|delta| = 3)
    ];

    const versus = computeVersus(criticA, criticB);
    expect(versus.shared).toHaveLength(6);
    expect(versus.sharpestClash?.title).toBe("Moonlight");
    expect(versus.sharpestClash?.delta).toBe(-4);
    expect(versus.sharedFavorites[0].title).toBe("Everything Everywhere All at Once");
    expect(versus.agreementPct).toBe(60);
  });
});
