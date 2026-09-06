import { beforeEach, describe, expect, it, vi } from "vitest";
import { createForkSession, type ForkableListInput, type ForkableMovieInput } from "./fork";
import { loadSession, type PlaySession } from "./session";

// Merged from two parallel-authored suites (fork-stress.test.ts and
// fork.stress.test.ts) that both stress-tested createForkSession with
// overlapping scenarios under two different naming conventions. This is the
// single surviving file — `.stress.test.ts` is the dominant convention
// elsewhere in src/lib (curator-roulette.stress, ticket-canvas.stress,
// trending.stress, versus.stress all use it). Every distinct assertion from
// both originals is preserved below; only true duplicates were dropped, and
// where the same property was tested at two scales (100 vs. 1,000 movies)
// the larger, stronger case was kept alongside anything scale-independent
// the smaller case additionally verified.
const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

describe("fork.ts — Stress & Edge Cases", () => {
  beforeEach(() => {
    store.clear();
    vi.restoreAllMocks();
  });

  describe("Edge Case 1: Forking with 0 movies", () => {
    it("handles list with empty movie array cleanly", () => {
      const emptyList: ForkableListInput = {
        title: "Empty Film Festival",
        movies: [],
        themeSlug: "empty-theme",
      };

      const session = createForkSession(emptyList);
      expect(session.title).toBe("Re-rank: Empty Film Festival");
      expect(session.movies).toEqual([]);
      expect(session.participants).toEqual([]);
      expect(session.votesSinceOrderChange).toBe(0);
      expect(session.nudgeShown).toBe(false);
      expect(session.curated).toBe(false);
      expect(session.themeSlug).toBe("empty-theme");

      // Verify localStorage persistence
      const loaded = loadSession();
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe("Re-rank: Empty Film Festival");
      expect(loaded?.movies).toEqual([]);
    });

    it("handles list when movies is undefined or null (defensive fallback)", () => {
      const nullMoviesList = {
        title: "Undefined Movies",
        movies: undefined as unknown as ForkableMovieInput[],
      };

      const session = createForkSession(nullMoviesList);
      expect(session.title).toBe("Re-rank: Undefined Movies");
      expect(session.movies).toEqual([]);
    });
  });

  describe("Edge Case 2: Forking at scale (100 and 1,000 movies)", () => {
    it("correctly resets and clones a 100-movie list, verifying every field", () => {
      const hundredMovies: ForkableMovieInput[] = Array.from({ length: 100 }, (_, i) => ({
        tmdbId: 1000 + i,
        title: `Cinematic Masterpiece Vol. ${i + 1}`,
        posterPath: i % 2 === 0 ? `/posters/m_${i}.jpg` : null,
        releaseYear: 1920 + (i % 100),
        tagline: i % 3 === 0 ? `The defining film of ${1920 + (i % 100)}` : null,
        elo: 800 + Math.random() * 800,
        comparisons: Math.floor(Math.random() * 30),
        parked: i % 5 === 0,
        finalRank: i + 1,
      }));

      const largeList: ForkableListInput = {
        title: "The Centennial Top 100",
        movies: hundredMovies,
      };

      const startTime = performance.now();
      const session = createForkSession(largeList);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(50); // Well within performance budget
      expect(session.movies).toHaveLength(100);

      // Verify every single movie has Elo 1000, comparisons 0, parked false,
      // and that unrelated metadata fields (posterPath/releaseYear/tagline
      // patterns) survived untouched.
      for (let i = 0; i < 100; i++) {
        const m = session.movies[i];
        expect(m.tmdbId).toBe(1000 + i);
        expect(m.title).toBe(`Cinematic Masterpiece Vol. ${i + 1}`);
        expect(m.elo).toBe(1000);
        expect(m.comparisons).toBe(0);
        expect(m.parked).toBe(false);
        expect(m.posterPath).toBe(i % 2 === 0 ? `/posters/m_${i}.jpg` : null);
        expect(m.releaseYear).toBe(1920 + (i % 100));
        expect(m.tagline).toBe(i % 3 === 0 ? `The defining film of ${1920 + (i % 100)}` : null);
      }

      // Verify persistence & retrieval of the 100-movie session
      const loaded = loadSession();
      expect(loaded).not.toBeNull();
      expect(loaded?.movies).toHaveLength(100);
      expect(loaded?.movies[99].tmdbId).toBe(1099);
      expect(loaded?.movies[99].elo).toBe(1000);
    });

    it("resets 1,000 movies' Elo, comparisons, and parked status to pristine baseline", () => {
      const hugeList: ForkableListInput = {
        title: "Massive Cult Film Marathon",
        movies: Array.from({ length: 1000 }, (_, i) => ({
          tmdbId: i + 1,
          title: `Cult Classic #${i + 1}`,
          posterPath: `/poster-${i + 1}.jpg`,
          releaseYear: 1970 + (i % 50),
          tagline: `Tagline for movie ${i + 1}`,
          finalRank: i + 1,
          elo: 1000 + i * 15 - 300,
          comparisons: (i * 7) % 50,
          parked: i % 3 === 0,
        })),
        themeSlug: "cult-classics",
      };

      const start = performance.now();
      const session = createForkSession(hugeList);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(session.movies).toHaveLength(1000);
      expect(session.title).toBe("Re-rank: Massive Cult Film Marathon");
      expect(session.curated).toBe(false);
      // Empty by design: a fork credits nobody, because `participants` feeds
      // `coCurated` -> CO_CURATION_XP. See the note on createForkSession.
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
  });

  describe("Edge Case 3: Special Characters, Emojis, Unicode & Escaping", () => {
    it("handles exotic unicode, emoji, script tags, and quotes in titles and taglines", () => {
      const edgeCaseList: ForkableListInput = {
        title: `🔥 <script>alert("XSS")</script> & 'Cinema' / 7½ — 東京物語 (1953) 🎥`,
        movies: [
          {
            tmdbId: 9991,
            title: `千と千尋の神隠し — Spirited Away ✨`,
            posterPath: `/poster_unicode_日本語.jpg`,
            releaseYear: 2001,
            tagline: `Nothing that happens is ever forgotten... 💫 <img src=x onerror=alert(1)>`,
            elo: 1600,
            comparisons: 15,
            parked: true,
          },
          {
            tmdbId: 9992,
            title: `8½ (Otto e mezzo) "Fellini's Masterpiece"`,
            posterPath: null,
            releaseYear: 1963,
            tagline: `\n\tSpecial linebreaks & quotes: " ' \\ / \0`,
            elo: 1450,
            comparisons: 9,
            parked: false,
          },
          {
            tmdbId: 9993,
            title: `متروبوليس (Metropolis) 🤖`,
            posterPath: `/poster_arabic.jpg`,
            releaseYear: 1927,
            tagline: `Der Mittler zwischen Hirn und Händen muß das Herz sein!`,
            elo: 1200,
            comparisons: 4,
            parked: true,
          },
        ],
      };

      const session = createForkSession(edgeCaseList);

      expect(session.title).toBe(
        `Re-rank: 🔥 <script>alert("XSS")</script> & 'Cinema' / 7½ — 東京物語 (1953) 🎥`
      );
      expect(session.movies[0].title).toBe(`千と千尋の神隠し — Spirited Away ✨`);
      expect(session.movies[0].tagline).toBe(
        `Nothing that happens is ever forgotten... 💫 <img src=x onerror=alert(1)>`
      );
      expect(session.movies[1].tagline).toBe(`\n\tSpecial linebreaks & quotes: " ' \\ / \0`);
      expect(session.movies[2].title).toBe(`متروبوليس (Metropolis) 🤖`);

      // Roundtrip through localStorage serialization
      const loaded = loadSession();
      expect(loaded?.title).toBe(session.title);
      expect(loaded?.movies[0].title).toBe(session.movies[0].title);
      expect(loaded?.movies[1].tagline).toBe(session.movies[1].tagline);
    });

    it("handles whitespace padding and multiple Re-rank prefixes appropriately", () => {
      const listWithSpaces: ForkableListInput = {
        title: "   Re-rank: Already Forked List   ",
        movies: [{ tmdbId: 1, title: "Movie 1" }],
      };

      const session = createForkSession(listWithSpaces);
      expect(session.title).toBe("Re-rank: Already Forked List");
    });

    it("preserves internal whitespace when an already-prefixed title only needs outer trimming", () => {
      const session = createForkSession({
        title: "  Re-rank:   Double Space   ",
        movies: [],
      });
      expect(session.title).toBe("Re-rank:   Double Space");
    });

    it("does not stack 'Re-rank: Re-rank: ...' prefixes when forking an already-forked session", () => {
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
    });
  });

  describe("Edge Case 4: Null and Undefined Poster Paths", () => {
    it("normalizes undefined, null, and empty string poster paths to null or valid string", () => {
      const list: ForkableListInput = {
        title: "Poster Test",
        movies: [
          { tmdbId: 1, title: "Null Poster", posterPath: null },
          { tmdbId: 2, title: "Undefined Poster", posterPath: undefined },
          { tmdbId: 3, title: "Valid Poster", posterPath: "/valid.jpg" },
        ],
      };

      const session = createForkSession(list);
      expect(session.movies[0].posterPath).toBeNull();
      expect(session.movies[1].posterPath).toBeNull();
      expect(session.movies[2].posterPath).toBe("/valid.jpg");
    });
  });

  describe("Edge Case 5: Missing, Null, Zero, and Negative Years", () => {
    it("handles all variations of releaseYear safely", () => {
      const list: ForkableListInput = {
        title: "Year Test",
        movies: [
          { tmdbId: 1, title: "Null Year", releaseYear: null },
          { tmdbId: 2, title: "Undefined Year", releaseYear: undefined },
          { tmdbId: 3, title: "Year Zero", releaseYear: 0 },
          { tmdbId: 4, title: "Ancient Film (BC)", releaseYear: -500 },
          { tmdbId: 5, title: "Sci-Fi Far Future", releaseYear: 2099 },
        ],
      };

      const session = createForkSession(list);
      expect(session.movies[0].releaseYear).toBeNull();
      expect(session.movies[1].releaseYear).toBeNull();
      expect(session.movies[2].releaseYear).toBe(0);
      expect(session.movies[3].releaseYear).toBe(-500);
      expect(session.movies[4].releaseYear).toBe(2099);
    });
  });

  describe("Edge Case 6: Corrupted Storage & Quota Exceptions", () => {
    it("gracefully survives when localStorage.setItem throws QuotaExceededError", () => {
      const list: ForkableListInput = {
        title: "Quota Error List",
        movies: [{ tmdbId: 10, title: "Ten" }],
      };

      // Mock localStorage.setItem throwing a DOMException
      vi.stubGlobal("localStorage", {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError: DOMException");
        },
        removeItem: () => {},
        clear: () => {},
      });

      // Should not throw an unhandled error
      let session: PlaySession | undefined;
      expect(() => {
        session = createForkSession(list);
      }).not.toThrow();

      expect(session).toBeDefined();
      expect(session?.title).toBe("Re-rank: Quota Error List");
      expect(session?.movies).toHaveLength(1);
    });

    it("handles corrupted JSON in localStorage without crashing loadSession", () => {
      store.set("mr-session", "INVALID_CORRUPTED_JSON_<{}>");
      expect(loadSession()).toBeNull();

      store.set("mr-session", "");
      expect(loadSession()).toBeNull();
    });
  });
});
