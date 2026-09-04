import { describe, expect, it, vi } from "vitest";
import {
  calculateHotScore,
  formatTrendingLists,
  getTrendingLists,
  type RawDbListRow,
} from "./trending";

describe("formatTrendingLists", () => {
  const sampleLists: RawDbListRow[] = [
    {
      id: "list-1",
      title: "Top Noir Films",
      description: "Atmospheric crime thrillers",
      owner_id: "u-1",
      status: "done",
      visibility: "public",
      upvotes_count: 12,
      created_at: "2026-09-01T10:00:00Z",
      list_movies: [
        {
          tmdb_id: 15,
          title: "Touch of Evil",
          poster_path: "/evil.jpg",
          release_year: 1958,
          final_rank: 2,
        },
        {
          tmdb_id: 539,
          title: "Sunset Boulevard",
          poster_path: "/sunset.jpg",
          release_year: 1950,
          final_rank: 1,
        },
        {
          tmdb_id: 807,
          title: "Double Indemnity",
          poster_path: "/double.jpg",
          release_year: 1944,
          final_rank: 3,
        },
        {
          tmdb_id: 640,
          title: "Laura",
          poster_path: "/laura.jpg",
          release_year: 1944,
          final_rank: 4,
        },
      ],
    },
    {
      id: "list-2",
      title: "Cyberpunk Essentials",
      description: "Neon dreams and machines",
      owner_id: "u-2",
      status: "done",
      visibility: "public",
      upvotes_count: 25,
      created_at: "2026-08-30T10:00:00Z",
      list_movies: [
        {
          tmdb_id: 603,
          title: "The Matrix",
          poster_path: "/matrix.jpg",
          release_year: 1999,
          final_rank: 1,
        },
      ],
    },
    {
      id: "list-draft",
      title: "Unfinished Draft",
      description: null,
      owner_id: "u-1",
      status: "draft",
      visibility: "public",
      upvotes_count: 50,
      created_at: "2026-09-02T10:00:00Z",
    },
    {
      id: "list-private",
      title: "Private List",
      description: null,
      owner_id: "u-3",
      status: "done",
      visibility: "private",
      upvotes_count: 100,
      created_at: "2026-09-02T11:00:00Z",
    },
    {
      id: "list-unlisted",
      title: "Unlisted List",
      description: null,
      owner_id: "u-3",
      status: "done",
      visibility: "unlisted",
      upvotes_count: 80,
      created_at: "2026-09-02T12:00:00Z",
    },
    {
      id: "list-tied-older",
      title: "Tied Older List",
      description: null,
      owner_id: "u-4",
      status: "done",
      visibility: "public",
      upvotes_count: 12,
      created_at: "2026-08-20T10:00:00Z",
      list_movies: [],
    },
  ];

  it("filters out draft, private, and unlisted lists", () => {
    const handles = new Map([["u-1", "cinema_fan"], ["u-2", "neo"]]);
    const result = formatTrendingLists(sampleLists, handles);

    expect(result.map((l) => l.id)).toEqual(["list-2", "list-1", "list-tied-older"]);
  });

  it("sorts by upvotes_count descending, breaking ties with created_at descending", () => {
    const result = formatTrendingLists(sampleLists);
    expect(result[0].id).toBe("list-2"); // 25 upvotes
    expect(result[1].id).toBe("list-1"); // 12 upvotes, newer
    expect(result[2].id).toBe("list-tied-older"); // 12 upvotes, older
  });

  it("orders topPosters by finalRank ascending and caps at 3 posters", () => {
    const result = formatTrendingLists(sampleLists);
    const noir = result.find((l) => l.id === "list-1")!;

    expect(noir.topPosters).toHaveLength(3);
    expect(noir.topPosters.map((p) => p.title)).toEqual([
      "Sunset Boulevard", // finalRank 1
      "Touch of Evil",    // finalRank 2
      "Double Indemnity", // finalRank 3
    ]);
  });

  it("attaches public ownerHandle when available", () => {
    const handles = new Map([["u-1", "noir_curator"], ["u-2", "cyber_king"]]);
    const result = formatTrendingLists(sampleLists, handles);

    expect(result.find((l) => l.id === "list-1")?.ownerHandle).toBe("noir_curator");
    expect(result.find((l) => l.id === "list-2")?.ownerHandle).toBe("cyber_king");
    expect(result.find((l) => l.id === "list-tied-older")?.ownerHandle).toBeNull();
  });

  it("handles empty lists or missing list_movies array safely", () => {
    const result = formatTrendingLists([
      {
        id: "list-empty",
        title: "Empty",
        description: null,
        owner_id: "u-1",
        status: "done",
        visibility: "public",
        upvotes_count: 0,
        created_at: "2026-09-01T00:00:00Z",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].movies).toEqual([]);
    expect(result[0].topPosters).toEqual([]);
    expect(result[0].movieCount).toBe(0);
  });
});

describe("getTrendingLists", () => {
  it("queries supabase and returns formatted trending lists", async () => {
    const mockLists = [
      {
        id: "list-10",
        title: "Greatest Movies",
        description: "Curated ranking",
        owner_id: "u-10",
        status: "done",
        visibility: "public",
        upvotes_count: 42,
        theme_slug: null,
        created_at: "2026-09-01T00:00:00Z",
        list_movies: [
          {
            tmdb_id: 278,
            title: "The Shawshank Redemption",
            poster_path: "/shawshank.jpg",
            release_year: 1994,
            final_rank: 1,
          },
        ],
      },
    ];

    const mockProfiles = [{ id: "u-10", handle: "legend" }];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        const builder: Record<string, any> = {};
        for (const method of ["select", "eq", "order", "limit", "in"]) {
          builder[method] = vi.fn(() => builder);
        }
        builder.then = (onFulfilled: any) => {
          if (table === "lists") {
            return Promise.resolve({ data: mockLists, error: null }).then(onFulfilled);
          }
          if (table === "profiles") {
            return Promise.resolve({ data: mockProfiles, error: null }).then(onFulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onFulfilled);
        };
        return builder;
      }),
    };

    const trending = await getTrendingLists(mockSupabase, 5);
    expect(trending).toHaveLength(1);
    expect(trending[0].id).toBe("list-10");
    expect(trending[0].title).toBe("Greatest Movies");
    expect(trending[0].ownerHandle).toBe("legend");
    expect(trending[0].upvotesCount).toBe(42);
    expect(trending[0].topPosters[0].title).toBe("The Shawshank Redemption");
  });

  it("returns empty array on database failure", async () => {
    const mockSupabase = {
      from: vi.fn(() => {
        const builder: Record<string, any> = {};
        for (const method of ["select", "eq", "order", "limit", "in"]) {
          builder[method] = vi.fn(() => builder);
        }
        builder.then = (onFulfilled: any) => {
          return Promise.resolve({ data: null, error: { message: "db error" } }).then(
            onFulfilled,
          );
        };
        return builder;
      }),
    };

    const trending = await getTrendingLists(mockSupabase, 5);
    expect(trending).toEqual([]);
  });
});

describe("calculateHotScore & Reddit Hot Algorithm", () => {
  it("rewards higher upvotes at the same timestamp", () => {
    const t = "2026-09-03T12:00:00Z";
    const score10 = calculateHotScore(10, t);
    const score100 = calculateHotScore(100, t);
    expect(score100).toBeGreaterThan(score10);
  });

  it("applies logarithmic scaling to upvotes", () => {
    const t = "2026-09-03T12:00:00Z";
    const score1 = calculateHotScore(1, t);
    const score10 = calculateHotScore(10, t);
    const score100 = calculateHotScore(100, t);
    // Difference between 1 and 10 upvotes (order ~1) should be roughly equal to difference between 10 and 100 upvotes (order ~1)
    const diff1 = score10 - score1;
    const diff2 = score100 - score10;
    expect(Math.abs(diff1 - diff2)).toBeLessThan(0.05);
  });

  it("allows fresh lists with moderate votes to surpass older stagnant lists", () => {
    // List A created 3 days ago with 25 upvotes
    const oldDate = "2026-08-31T00:00:00Z";
    const oldScore = calculateHotScore(25, oldDate);

    // List B created 2 hours ago with only 8 upvotes
    const newDate = "2026-09-03T08:00:00Z";
    const newScore = calculateHotScore(8, newDate);

    // The fresh list with strong early momentum outranks the 3-day-old list
    expect(newScore).toBeGreaterThan(oldScore);
  });

  it("handles zero and safe fallback gracefully", () => {
    const score0 = calculateHotScore(0, "2026-09-03T12:00:00Z");
    expect(score0).toBeDefined();
    expect(Number.isFinite(score0)).toBe(true);
  });

  it("sorts lists by hot score when mode='hot' in formatTrendingLists", () => {
    const lists: RawDbListRow[] = [
      {
        id: "stale-alltime",
        title: "Stale List",
        description: null,
        owner_id: "u-1",
        status: "done",
        visibility: "public",
        upvotes_count: 50,
        created_at: "2026-08-15T00:00:00Z", // weeks ago
        list_movies: [],
      },
      {
        id: "fresh-rising",
        title: "Fresh Rising List",
        description: null,
        owner_id: "u-2",
        status: "done",
        visibility: "public",
        upvotes_count: 10,
        created_at: "2026-09-03T10:00:00Z", // today
        list_movies: [],
      },
    ];

    const topSorted = formatTrendingLists(lists, new Map(), "top");
    expect(topSorted[0].id).toBe("stale-alltime"); // all-time upvotes wins in 'top'

    const hotSorted = formatTrendingLists(lists, new Map(), "hot");
    expect(hotSorted[0].id).toBe("fresh-rising"); // fresh list with momentum wins in 'hot'
  });
});
