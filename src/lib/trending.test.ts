import { describe, expect, it, vi } from "vitest";
import {
  calculateHotScore,
  formatTrendingLists,
  getTrendingLists,
  HOT_CANDIDATE_POOL,
  type RawDbListRow,
} from "./trending";

/** Minimal chainable query-builder mock for getTrendingLists's Supabase param (typed any; see trending.ts). */
function createMockQueryBuilder(response: {
  data: unknown[] | null;
  error: { message: string } | null;
}) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "in"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (
    onFulfilled?: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => Promise.resolve(response).then(onFulfilled, onRejected);
  return builder as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<unknown>;
}

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

  it("strictly excludes weekly marquee lists from community spotlight even when status='done' and visibility='public'", () => {
    const mixedLists: RawDbListRow[] = [
      {
        id: "marquee-locked",
        title: "Weekly Marquee #42",
        description: "Official weekly theme puzzle",
        owner_id: "u-marquee-1",
        status: "done",
        visibility: "public",
        upvotes_count: 500,
        theme_slug: "psychological-thrillers",
        curated: true,
        created_at: "2026-09-08T12:00:00Z",
      },
      {
        id: "marquee-unlocked-roster",
        title: "Weekly Marquee #41",
        description: null,
        owner_id: "u-marquee-2",
        status: "done",
        visibility: "public",
        upvotes_count: 250,
        theme_slug: "film-noir-classics",
        curated: false,
        created_at: "2026-09-01T12:00:00Z",
      },
      {
        id: "custom-community-list",
        title: "Hidden Gems of Italian Neorealism",
        description: "Curated by a community cinephile",
        owner_id: "u-custom-1",
        status: "done",
        visibility: "public",
        upvotes_count: 10,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-07T12:00:00Z",
      },
    ];

    const result = formatTrendingLists(mixedLists);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("custom-community-list");
    expect(result[0].title).toBe("Hidden Gems of Italian Neorealism");
  });

  it("strictly excludes curated lists (curated: true) even when theme_slug is null or undefined", () => {
    const curatedLists: RawDbListRow[] = [
      {
        id: "curated-pack-null-slug",
        title: "A24 Gems Pack",
        description: "Staff curated pack",
        owner_id: "u-staff-1",
        status: "done",
        visibility: "public",
        upvotes_count: 1000,
        theme_slug: null,
        curated: true,
        created_at: "2026-09-05T12:00:00Z",
      },
      {
        id: "curated-pack-undefined-slug",
        title: "Curator Reel",
        description: null,
        owner_id: "u-staff-2",
        status: "done",
        visibility: "public",
        upvotes_count: 800,
        curated: true,
        created_at: "2026-09-06T12:00:00Z",
      },
      {
        id: "legit-custom-list",
        title: "My Personal Top 10",
        description: "Authentic custom ranking",
        owner_id: "u-user",
        status: "done",
        visibility: "public",
        upvotes_count: 2,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-08T00:00:00Z",
      },
    ];

    const result = formatTrendingLists(curatedLists);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("legit-custom-list");
  });

  it("permits custom community lists across all falsy representations of theme_slug and curated", () => {
    const variants: RawDbListRow[] = [
      {
        id: "variant-null-false",
        title: "Custom List A",
        description: null,
        owner_id: "u-1",
        status: "done",
        visibility: "public",
        upvotes_count: 30,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-08T03:00:00Z",
      },
      {
        id: "variant-undefined-undefined",
        title: "Custom List B",
        description: null,
        owner_id: "u-2",
        status: "done",
        visibility: "public",
        upvotes_count: 20,
        created_at: "2026-09-08T02:00:00Z",
      },
      {
        id: "variant-null-null",
        title: "Custom List C",
        description: null,
        owner_id: "u-3",
        status: "done",
        visibility: "public",
        upvotes_count: 10,
        theme_slug: null,
        curated: null,
        created_at: "2026-09-08T01:00:00Z",
      },
    ];

    const result = formatTrendingLists(variants);
    expect(result.map((l) => l.id)).toEqual([
      "variant-null-false",
      "variant-undefined-undefined",
      "variant-null-null",
    ]);
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
        if (table === "lists") {
          return createMockQueryBuilder({ data: mockLists, error: null });
        }
        if (table === "profiles") {
          return createMockQueryBuilder({ data: mockProfiles, error: null });
        }
        return createMockQueryBuilder({ data: [], error: null });
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
      from: vi.fn(() =>
        createMockQueryBuilder({ data: null, error: { message: "db error" } }),
      ),
    };

    const trending = await getTrendingLists(mockSupabase, 5);
    expect(trending).toEqual([]);
  });

  it("fetches the candidate pool ordered by recency (created_at DESC), not upvotes, by default (hot mode)", async () => {
    const listsBuilder = createMockQueryBuilder({ data: [], error: null });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "lists") return listsBuilder;
        return createMockQueryBuilder({ data: [], error: null });
      }),
    };

    await getTrendingLists(mockSupabase, 6);

    // Recency-ordered, wide candidate pool -- not a database-side upvotes sort.
    expect(listsBuilder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(listsBuilder.order).not.toHaveBeenCalledWith(
      "upvotes_count",
      expect.anything(),
    );
    expect(listsBuilder.limit).toHaveBeenCalledWith(HOT_CANDIDATE_POOL);
  });

  it("lets a newer, unupvoted list outrank an older, higher-upvoted one under the default hot sort", async () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const mockLists = [
      {
        id: "old-popular",
        title: "Old Popular List",
        description: null,
        owner_id: "u-old",
        status: "done",
        visibility: "public",
        upvotes_count: 50,
        theme_slug: null,
        created_at: fiveDaysAgo,
        list_movies: [],
      },
      {
        id: "new-unvoted",
        title: "New Unvoted List",
        description: null,
        owner_id: "u-new",
        status: "done",
        visibility: "public",
        upvotes_count: 0,
        theme_slug: null,
        created_at: oneHourAgo,
        list_movies: [],
      },
    ];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "lists") return createMockQueryBuilder({ data: mockLists, error: null });
        return createMockQueryBuilder({ data: [], error: null });
      }),
    };

    const trending = await getTrendingLists(mockSupabase, 6);
    expect(trending.map((l) => l.id)).toEqual(["new-unvoted", "old-popular"]);
  });

  it("keeps 'top' mode querying upvotes-first, capped directly at limit", async () => {
    const listsBuilder = createMockQueryBuilder({ data: [], error: null });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "lists") return listsBuilder;
        return createMockQueryBuilder({ data: [], error: null });
      }),
    };

    await getTrendingLists(mockSupabase, 6, "top");

    expect(listsBuilder.order).toHaveBeenCalledWith("upvotes_count", { ascending: false });
    expect(listsBuilder.limit).toHaveBeenCalledWith(6);
  });

  it("queries the curated column from supabase and excludes marquee/curated lists from trending output", async () => {
    let capturedSelect = "";
    const mockLists = [
      {
        id: "marquee-list",
        title: "Weekly Marquee #10",
        description: null,
        owner_id: "u-1",
        status: "done",
        visibility: "public",
        upvotes_count: 999,
        theme_slug: "heist-thrillers",
        curated: true,
        created_at: "2026-09-08T00:00:00Z",
        list_movies: [],
      },
      {
        id: "custom-community-list",
        title: "Indie Sci-Fi Favorites",
        description: "Community showcase",
        owner_id: "u-2",
        status: "done",
        visibility: "public",
        upvotes_count: 15,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-07T00:00:00Z",
        list_movies: [],
      },
    ];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        const builder = createMockQueryBuilder({
          data: table === "lists" ? mockLists : [],
          error: null,
        });
        builder.select = vi.fn((cols: string) => {
          if (table === "lists") capturedSelect = cols;
          return builder;
        });
        return builder;
      }),
    };

    const trending = await getTrendingLists(mockSupabase, 6);
    expect(capturedSelect).toContain("curated");
    expect(trending).toHaveLength(1);
    expect(trending[0].id).toBe("custom-community-list");
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

  it("pins the intended trade-off: 10 upvotes buys roughly one day of freshness", () => {
    const base = "2026-09-03T00:00:00Z";

    // 100 upvotes, posted at `base`.
    const olderMoreUpvoted = calculateHotScore(100, base);

    // 10x fewer upvotes (10), but posted exactly one half-life (1 day) later:
    // the freshness gain should almost exactly cancel the 10x upvote deficit.
    const oneDayLater = "2026-09-04T00:00:00Z";
    const newerFewerUpvotes = calculateHotScore(10, oneDayLater);
    expect(Math.abs(newerFewerUpvotes - olderMoreUpvoted)).toBeLessThan(1e-6);

    // Two days later more than compensates for the same 10x upvote deficit.
    const twoDaysLater = "2026-09-05T00:00:00Z";
    expect(calculateHotScore(10, twoDaysLater)).toBeGreaterThan(olderMoreUpvoted);

    // Half a day later does not yet compensate for it.
    const twelveHoursLater = "2026-09-03T12:00:00Z";
    expect(calculateHotScore(10, twelveHoursLater)).toBeLessThan(olderMoreUpvoted);
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
