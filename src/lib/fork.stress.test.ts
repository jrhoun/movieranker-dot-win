import { beforeEach, describe, expect, it, vi } from "vitest";
import { createForkSession, type ForkableListInput } from "./fork";
import { loadSession, clearSession } from "./session";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

describe("fork.ts Empirical Stress Testing", () => {
  beforeEach(() => {
    store.clear();
    clearSession();
  });

  it("resets 1,000 movies Elo, comparisons, and parked status to pristine baseline", () => {
    const hugeList: ForkableListInput = {
      title: "Massive Cult Film Marathon",
      movies: Array.from({ length: 1000 }, (_, i) => ({
        tmdbId: i + 1,
        title: `Cult Classic #${i + 1}`,
        posterPath: `/poster-${i + 1}.jpg`,
        releaseYear: 1970 + (i % 50),
        tagline: `Tagline for movie ${i + 1}`,
        finalRank: i + 1,
        elo: 1000 + (i * 15) - 300,
        comparisons: (i * 7) % 50,
        parked: i % 3 === 0,
      })),
      themeSlug: "cult-classics",
    };

    const start = performance.now();
    const session = createForkSession(hugeList, "cinephile_max");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(session.movies).toHaveLength(1000);
    expect(session.title).toBe("Re-rank: Massive Cult Film Marathon");
    expect(session.curated).toBe(false);
    expect(session.participants).toEqual([]);
    expect(session.votesSinceOrderChange).toBe(0);
    expect(session.nudgeShown).toBe(false);

    // Verify all 1,000 items are reset
    for (const movie of session.movies) {
      expect(movie.elo).toBe(1000);
      expect(movie.comparisons).toBe(0);
      expect(movie.parked).toBe(false);
      expect(movie.tagline).toBeDefined();
    }

    // Verify localStorage persistence
    const saved = loadSession();
    expect(saved).not.toBeNull();
    expect(saved?.movies).toHaveLength(1000);
  });

  it("handles repeated forks without stacking 'Re-rank: Re-rank: ...' prefixes", () => {
    const baseList: ForkableListInput = {
      title: "Noir Essentials",
      movies: [{ tmdbId: 10, title: "Double Indemnity" }],
    };

    const session1 = createForkSession(baseList);
    expect(session1.title).toBe("Re-rank: Noir Essentials");

    const session2 = createForkSession({
      title: session1.title,
      movies: session1.movies,
    });
    expect(session2.title).toBe("Re-rank: Noir Essentials");

    const session3 = createForkSession({
      title: "  Re-rank:   Double Space   ",
      movies: [],
    });
    expect(session3.title).toBe("Re-rank:   Double Space");
  });

  it("handles empty lists and extreme unicode / emoji titles safely", () => {
    const unicodeList: ForkableListInput = {
      title: "✨ 最佳电影排行榜 🎬 (Best Films) 🍿",
      movies: [],
      themeSlug: null,
    };

    const session = createForkSession(unicodeList);
    expect(session.title).toBe("Re-rank: ✨ 最佳电影排行榜 🎬 (Best Films) 🍿");
    expect(session.movies).toEqual([]);
  });
});
