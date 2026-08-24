import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, loadSession, saveSession, type PlaySession } from "./session";
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
