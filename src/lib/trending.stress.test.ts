import { describe, expect, it, vi } from "vitest";
import {
  formatTrendingLists,
  getTrendingLists,
  type RawDbListRow,
} from "./trending";

describe("trending.ts Empirical Stress Testing", () => {
  // ---------------------------------------------------------------------------
  // 1. SCALE & PERFORMANCE: 1,000 LISTS
  // ---------------------------------------------------------------------------
  describe("1. Scale & Performance (1,000 Lists)", () => {
    it("formats and sorts 1,000 lists in under 100ms", () => {
      const count = 1000;
      const rawLists: RawDbListRow[] = Array.from({ length: count }, (_, i) => {
        const isDone = i % 5 !== 0; // 80% done
        const isPublic = i % 4 !== 0; // 75% public
        const upvotes = Math.floor(Math.random() * 500);
        const movieCount = (i % 10) + 1; // 1 to 10 movies
        const movies = Array.from({ length: movieCount }, (__, mIdx) => ({
          tmdb_id: 10000 + i * 10 + mIdx,
          title: `Movie ${i}-${mIdx}`,
          poster_path: mIdx % 2 === 0 ? `/poster-${i}-${mIdx}.jpg` : null,
          release_year: 1980 + (mIdx * 3) % 40,
          final_rank: mIdx + 1,
        }));

        return {
          id: `list-${i}`,
          title: `Showcase List #${i}`,
          description: i % 2 === 0 ? `Description for list ${i}` : null,
          owner_id: `user-${i % 50}`,
          status: isDone ? "done" : "draft",
          visibility: isPublic ? "public" : (i % 2 === 0 ? "private" : "unlisted"),
          upvotes_count: upvotes,
          created_at: new Date(Date.now() - i * 3600_000).toISOString(),
          list_movies: movies,
        };
      });

      const profileHandles = new Map<string, string>();
      for (let u = 0; u < 50; u++) {
        if (u % 3 !== 0) {
          profileHandles.set(`user-${u}`, `cinephile_${u}`);
        }
      }

      const start = performance.now();
      const results = formatTrendingLists(rawLists, profileHandles);
      const elapsed = performance.now() - start;

      // SLA check
      expect(elapsed).toBeLessThan(100);

      // Verify every returned list is strictly done and public
      expect(results.length).toBeGreaterThan(0);
      for (const item of results) {
        // Find corresponding raw list
        const raw = rawLists.find((r) => r.id === item.id);
        expect(raw?.status).toBe("done");
        expect(raw?.visibility).toBe("public");
      }

      // Verify strict descending sort by upvotes_count then created_at
      for (let i = 0; i < results.length - 1; i++) {
        const a = results[i];
        const b = results[i + 1];
        if (a.upvotesCount !== b.upvotesCount) {
          expect(a.upvotesCount).toBeGreaterThanOrEqual(b.upvotesCount);
        } else {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          expect(timeA).toBeGreaterThanOrEqual(timeB);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. TIE BREAKING & SECONDARY SORTING
  // ---------------------------------------------------------------------------
  describe("2. Tie-Breaking & Secondary Sorting", () => {
    it("strictly breaks ties using created_at descending", () => {
      const lists: RawDbListRow[] = [
        {
          id: "list-old",
          title: "Old List",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          upvotes_count: 50,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "list-new",
          title: "New List",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "public",
          upvotes_count: 50,
          created_at: "2026-06-01T00:00:00Z",
        },
        {
          id: "list-newest",
          title: "Newest List",
          description: null,
          owner_id: "u-3",
          status: "done",
          visibility: "public",
          upvotes_count: 50,
          created_at: "2026-09-01T00:00:00Z",
        },
      ];

      const result = formatTrendingLists(lists);
      expect(result.map((l) => l.id)).toEqual(["list-newest", "list-new", "list-old"]);
    });

    it("handles identical upvotes and identical timestamps deterministically", () => {
      const lists: RawDbListRow[] = [
        {
          id: "list-a",
          title: "List A",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          upvotes_count: 10,
          created_at: "2026-05-01T12:00:00Z",
        },
        {
          id: "list-b",
          title: "List B",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "public",
          upvotes_count: 10,
          created_at: "2026-05-01T12:00:00Z",
        },
      ];

      const res1 = formatTrendingLists(lists);
      const res2 = formatTrendingLists(lists);
      expect(res1.map((r) => r.id)).toEqual(res2.map((r) => r.id));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. VISIBILITY & DRAFT FILTERING (ZERO LEAKAGE)
  // ---------------------------------------------------------------------------
  describe("3. Visibility & Draft Filtering", () => {
    it("excludes all non-(done + public) lists regardless of high upvotes", () => {
      const testCases: RawDbListRow[] = [
        {
          id: "l-draft-public",
          title: "Draft Public",
          description: null,
          owner_id: "u-1",
          status: "draft",
          visibility: "public",
          upvotes_count: 99999,
          created_at: "2026-09-01T00:00:00Z",
        },
        {
          id: "l-done-private",
          title: "Done Private",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "private",
          upvotes_count: 88888,
          created_at: "2026-09-01T00:00:00Z",
        },
        {
          id: "l-done-unlisted",
          title: "Done Unlisted",
          description: null,
          owner_id: "u-3",
          status: "done",
          visibility: "unlisted",
          upvotes_count: 77777,
          created_at: "2026-09-01T00:00:00Z",
        },
        {
          id: "l-archived-public",
          title: "Archived Public",
          description: null,
          owner_id: "u-4",
          status: "archived",
          visibility: "public",
          upvotes_count: 66666,
          created_at: "2026-09-01T00:00:00Z",
        },
        {
          id: "l-legit",
          title: "Done Public Legit",
          description: null,
          owner_id: "u-5",
          status: "done",
          visibility: "public",
          upvotes_count: 1,
          created_at: "2026-09-01T00:00:00Z",
        },
      ];

      const results = formatTrendingLists(testCases);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("l-legit");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. EDGE CASE DATA SHAPES (NULLS, NEGATIVES, DUPLICATES)
  // ---------------------------------------------------------------------------
  describe("4. Edge-Case Data Shapes", () => {
    it("handles null upvotes_count as 0", () => {
      const lists: RawDbListRow[] = [
        {
          id: "l-null-upvotes",
          title: "Null Upvotes",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          upvotes_count: null,
          created_at: "2026-09-01T00:00:00Z",
        },
        {
          id: "l-one-upvote",
          title: "One Upvote",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "public",
          upvotes_count: 1,
          created_at: "2026-09-01T00:00:00Z",
        },
      ];

      const res = formatTrendingLists(lists);
      expect(res[0].id).toBe("l-one-upvote");
      expect(res[1].id).toBe("l-null-upvotes");
      expect(res[1].upvotesCount).toBe(0);
    });

    it("correctly ranks movies with null and out-of-order final_rank", () => {
      const list: RawDbListRow = {
        id: "l-mixed-ranks",
        title: "Mixed Ranks",
        description: null,
        owner_id: "u-1",
        status: "done",
        visibility: "public",
        upvotes_count: 10,
        created_at: "2026-09-01T00:00:00Z",
        list_movies: [
          { tmdb_id: 1, title: "Unranked Movie", poster_path: "/unranked.jpg", release_year: 2020, final_rank: null },
          { tmdb_id: 2, title: "Rank 3 Movie", poster_path: "/rank3.jpg", release_year: 2019, final_rank: 3 },
          { tmdb_id: 3, title: "Rank 1 Movie", poster_path: "/rank1.jpg", release_year: 2021, final_rank: 1 },
          { tmdb_id: 4, title: "Rank 2 Movie", poster_path: "/rank2.jpg", release_year: 2018, final_rank: 2 },
          { tmdb_id: 5, title: "Another Unranked", poster_path: null, release_year: null, final_rank: null },
        ],
      };

      const [res] = formatTrendingLists([list]);
      expect(res.topPosters).toHaveLength(3);
      expect(res.topPosters.map((p) => p.title)).toEqual([
        "Rank 1 Movie",
        "Rank 2 Movie",
        "Rank 3 Movie",
      ]);
    });

    it("handles all unranked movies safely", () => {
      const list: RawDbListRow = {
        id: "l-all-unranked",
        title: "All Unranked",
        description: null,
        owner_id: "u-1",
        status: "done",
        visibility: "public",
        upvotes_count: 10,
        created_at: "2026-09-01T00:00:00Z",
        list_movies: [
          { tmdb_id: 1, title: "M1", poster_path: null, release_year: null, final_rank: null },
          { tmdb_id: 2, title: "M2", poster_path: null, release_year: null, final_rank: null },
          { tmdb_id: 3, title: "M3", poster_path: null, release_year: null, final_rank: null },
          { tmdb_id: 4, title: "M4", poster_path: null, release_year: null, final_rank: null },
        ],
      };

      const [res] = formatTrendingLists([list]);
      expect(res.topPosters).toHaveLength(3);
      expect(res.movieCount).toBe(4);
    });

    it("handles unicode titles, emojis, and special characters", () => {
      const list: RawDbListRow = {
        id: "l-unicode",
        title: "🎬 Studio Ghibli: 千と千尋の神隠し & もののけ姫 🍃",
        description: "Special <script>alert(1)</script> description & \"quotes\"",
        owner_id: "u-unicode",
        status: "done",
        visibility: "public",
        upvotes_count: 42,
        created_at: "2026-09-01T00:00:00Z",
        list_movies: [
          {
            tmdb_id: 129,
            title: "千と千尋の神隠し (Spirited Away)",
            poster_path: "/spirited.jpg",
            release_year: 2001,
            final_rank: 1,
          },
        ],
      };

      const [res] = formatTrendingLists([list], new Map([["u-unicode", "宮崎駿_fan"]]));
      expect(res.title).toBe("🎬 Studio Ghibli: 千と千尋の神隠し & もののけ姫 🍃");
      expect(res.ownerHandle).toBe("宮崎駿_fan");
      expect(res.topPosters[0].title).toBe("千と千尋の神隠し (Spirited Away)");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. DATABASE CLIENT FAILURE & RESILIENCE
  // ---------------------------------------------------------------------------
  describe("5. Database Client Resilience", () => {
    it("returns empty array when supabase throws an unexpected exception", async () => {
      const brokenSupabase = {
        from: vi.fn(() => {
          throw new Error("Fatal Supabase connection error");
        }),
      };

      const result = await getTrendingLists(brokenSupabase, 6);
      expect(result).toEqual([]);
    });

    it("handles missing profiles table data gracefully (ownerHandle remains null)", async () => {
      const mockLists = [
        {
          id: "list-anon",
          title: "Anonymous List",
          description: null,
          owner_id: "u-deleted",
          status: "done",
          visibility: "public",
          upvotes_count: 5,
          created_at: "2026-09-01T00:00:00Z",
          list_movies: [],
        },
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          const builder: Record<string, unknown> = {};
          for (const method of ["select", "eq", "order", "limit", "in"]) {
            builder[method] = vi.fn(() => builder);
          }
          builder.then = (
            onFulfilled?: (v: unknown) => unknown,
            onRejected?: (e: unknown) => unknown,
          ) => {
            if (table === "lists") {
              return Promise.resolve({ data: mockLists, error: null }).then(onFulfilled, onRejected);
            }
            if (table === "profiles") {
              // User profile was deleted or not found
              return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
            }
            return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
          };
          return builder;
        }),
      };

      const result = await getTrendingLists(mockSupabase, 6);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("list-anon");
      expect(result[0].ownerHandle).toBeNull();
    });
  });
});
