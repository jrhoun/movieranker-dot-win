import { beforeEach, describe, expect, it, vi } from "vitest";
import { createForkSession } from "./fork";
import { loadSession } from "./session";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

describe("createForkSession", () => {
  beforeEach(() => {
    store.clear();
  });

  const sampleList = {
    title: "Best Sci-Fi of the 80s",
    themeSlug: "80s-scifi",
    movies: [
      {
        tmdbId: 78,
        title: "Blade Runner",
        posterPath: "/br.jpg",
        releaseYear: 1982,
        tagline: "Man has made his match... now it's his problem.",
        elo: 1350.5,
        comparisons: 8,
        parked: false,
        finalRank: 1,
      },
      {
        tmdbId: 218,
        title: "The Terminator",
        posterPath: "/t1.jpg",
        releaseYear: 1984,
        tagline: "Your future is in his hands.",
        elo: 1120.0,
        comparisons: 5,
        parked: true,
        finalRank: 2,
      },
    ],
  };

  it("resets all Elo ratings to 1000", () => {
    const session = createForkSession(sampleList);
    expect(session.movies.every((m) => m.elo === 1000)).toBe(true);
  });

  it("resets all comparisons to 0", () => {
    const session = createForkSession(sampleList);
    expect(session.movies.every((m) => m.comparisons === 0)).toBe(true);
  });

  it("resets parked status to false for all movies", () => {
    const session = createForkSession(sampleList);
    expect(session.movies.every((m) => m.parked === false)).toBe(true);
  });

  it("clears participants to an empty array", () => {
    const session = createForkSession(sampleList);
    expect(session.participants).toEqual([]);
  });

  it("prefixes title with 'Re-rank: '", () => {
    const session = createForkSession(sampleList);
    expect(session.title).toBe("Re-rank: Best Sci-Fi of the 80s");
  });

  it("does not duplicate 'Re-rank: ' prefix if already present", () => {
    const session = createForkSession({
      title: "Re-rank: Best Sci-Fi of the 80s",
      movies: sampleList.movies,
    });
    expect(session.title).toBe("Re-rank: Best Sci-Fi of the 80s");
  });

  it("preserves movie metadata (tmdbId, title, posterPath, releaseYear, tagline)", () => {
    const session = createForkSession(sampleList);
    expect(session.movies).toHaveLength(2);
    expect(session.movies[0]).toEqual({
      tmdbId: 78,
      title: "Blade Runner",
      posterPath: "/br.jpg",
      releaseYear: 1982,
      tagline: "Man has made his match... now it's his problem.",
      elo: 1000,
      comparisons: 0,
      parked: false,
    });
    expect(session.movies[1]).toEqual({
      tmdbId: 218,
      title: "The Terminator",
      posterPath: "/t1.jpg",
      releaseYear: 1984,
      tagline: "Your future is in his hands.",
      elo: 1000,
      comparisons: 0,
      parked: false,
    });
  });

  it("persists session to localStorage so loadSession retrieves it", () => {
    createForkSession(sampleList);
    const loaded = loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe("Re-rank: Best Sci-Fi of the 80s");
    expect(loaded?.movies).toHaveLength(2);
    expect(loaded?.movies[0].elo).toBe(1000);
    expect(loaded?.votesSinceOrderChange).toBe(0);
    expect(loaded?.nudgeShown).toBe(false);
  });

  it("handles empty movies list gracefully", () => {
    const session = createForkSession({ title: "Empty List", movies: [] });
    expect(session.title).toBe("Re-rank: Empty List");
    expect(session.movies).toEqual([]);
  });
});
