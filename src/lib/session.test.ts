import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyVote,
  changedMovies,
  clearSession,
  loadSession,
  parkMovie,
  saveSession,
  selectNextPair,
  totalComparisons,
  type PlaySession,
} from "./session";
import type { RankedMovie } from "./ranking";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (k === "boom") throw new DOMException("quota", "QuotaExceededError");
    store.set(k, v);
  },
  removeItem: (k: string) => store.delete(k),
});

const movie = (tmdbId: number): RankedMovie => ({
  tmdbId,
  title: `Movie ${tmdbId}`,
  posterPath: null,
  releaseYear: 2000 + tmdbId,
  elo: 1000,
  comparisons: 0,
  parked: false,
});

const session = (): PlaySession => ({
  title: "Movie night",
  participants: ["A", "B"],
  movies: [movie(1), movie(2)],
  votesSinceOrderChange: 0,
  nudgeShown: false,
});

beforeEach(() => store.clear());
afterEach(() => store.clear());

describe("session", () => {
  it("round-trips load/save/clear", () => {
    expect(loadSession()).toBeNull();
    saveSession(session());
    expect(loadSession()).toEqual(session());
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("round-trips curated theme fields", () => {
    saveSession({ ...session(), themeSlug: "secretly-same-story", curated: true });
    const loaded = loadSession();
    expect(loaded?.themeSlug).toBe("secretly-same-story");
    expect(loaded?.curated).toBe(true);
  });

  it("returns null on corrupted JSON", () => {
    store.set("mr-session", "{not json");
    expect(loadSession()).toBeNull();
  });

  it("swallows quota errors on save and keeps prior session", () => {
    saveSession(session());
    const original = JSON.stringify(session());
    const realSet = store.set.bind(store);
    vi.stubGlobal("localStorage", {
      ...localStorage,
      setItem: (k: string, v: string) => {
        if (k === "mr-session") throw new DOMException("quota", "QuotaExceededError");
        realSet(k, v);
      },
    });
    expect(() => saveSession({ ...session(), movies: [movie(9)] })).not.toThrow();
    expect(store.get("mr-session")).toBe(original);
  });
});

describe("resume helpers", () => {
  it("totalComparisons sums per-movie counts (2 per vote)", () => {
    const s = session();
    expect(totalComparisons(s)).toBe(0);
    const next = applyVote(s, 1, 2);
    expect(totalComparisons(next)).toBe(2);
  });

  it("changedMovies returns only movies a vote touched", () => {
    const before = [movie(1), movie(2), movie(3)];
    const voted = applyVote(
      { title: "T", participants: [], movies: before, votesSinceOrderChange: 0, nudgeShown: false },
      1,
      2,
    ).movies;
    const changed = changedMovies(before, voted);
    expect(changed.map((m) => m.tmdbId).sort()).toEqual([1, 2]);
    // idempotent: diffing against already-synced state yields nothing
    expect(changedMovies(voted, voted)).toEqual([]);
  });

  it("changedMovies flags park toggles and brand-new movies", () => {
    const before = [movie(1), movie(2)];
    const parked = parkMovie(
      { title: "T", participants: [], movies: before, votesSinceOrderChange: 0, nudgeShown: false },
      1,
      true,
    ).movies;
    expect(changedMovies(before, parked).map((m) => m.tmdbId)).toEqual([1]);
    expect(changedMovies(before, [...before, movie(9)]).map((m) => m.tmdbId)).toEqual([9]);
    // undo (revert to synced state) is also a change
    expect(changedMovies(parked, before).map((m) => m.tmdbId)).toEqual([1]);
  });
});

describe("voting helpers", () => {
  // gaps of 100 so a single K=32 vote never flips order unless stated
  const three = (): PlaySession => ({
    title: "T",
    participants: [],
    movies: [
      { ...movie(1), elo: 1200 },
      { ...movie(2), elo: 1100 },
      { ...movie(3), elo: 1000 },
    ],
    votesSinceOrderChange: 5,
    nudgeShown: false,
  });

  it("applyVote stores a single-level undo snapshot without mutating the original", () => {
    const s = three();
    const next = applyVote(s, 2, 1);
    expect(next.votesSinceOrderChange).toBe(6);
    expect(next.undoSnapshot!.votesSinceOrderChange).toBe(5);
    expect(next.undoSnapshot!.undoSnapshot).toBeUndefined();
    expect(next.undoSnapshot!.movies.find((m) => m.tmdbId === 1)?.elo).toBe(1200);
    expect(s.movies[1].elo).toBe(1100); // untouched
  });

  it("applyVote resets the counter when a significant (cross-band) upset changes the order", () => {
    const s = three();
    s.movies[0].elo = 1032; // m1 clearly above m3 (> STABLE_ORDER_TOLERANCE)
    const next = applyVote(s, 3, 1); // m3 jumps over m1 across the band boundary
    const order = [...next.movies]
      .sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId)
      .map((m) => m.tmdbId);
    expect(order).toEqual([2, 3, 1]);
    expect(next.votesSinceOrderChange).toBe(0);
  });

  it("parkMovie toggles immutably and selectNextPair honors parking + sharpen mode", () => {
    const s = three();
    const parked = parkMovie(s, 2, true);
    expect(parked.movies[1].parked).toBe(true);
    expect(s.movies[1].parked).toBe(false);
    expect(selectNextPair(parked, false)!.map((m) => m.tmdbId)).toEqual([3, 1]);
    expect(selectNextPair({ ...s, movies: s.movies.map((m) => ({ ...m, parked: true })) }, false)).toBeNull();

    const tight = three();
    tight.movies = [
      { ...movie(1), elo: 1200 },
      { ...movie(2), elo: 1160 }, // 40 gap to m1, sharpenable
      { ...movie(3), elo: 1000 },
    ];
    expect(selectNextPair(tight, true)!.map((m) => m.tmdbId)).toEqual([2, 1]);
  });
});
