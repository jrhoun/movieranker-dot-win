import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMovieById,
  pickPoster,
  rankCompaniesByCount,
  rankNameResults,
  searchByKeyword,
  searchCompany,
  shapeCredits,
  tmdbMovieUrl,
} from "./tmdb";
import fixture from "./fixtures/combined-credits.json";

const allRaw = [...fixture.cast, ...fixture.crew];

describe("shapeCredits", () => {
  const credits = shapeCredits(fixture);

  it("keeps only movie entries", () => {
    const movieIds = new Set(
      allRaw.filter((c) => c.media_type === "movie").map((c) => c.id),
    );
    expect(movieIds.size).toBeLessThan(allRaw.length); // fixture exercises filter + dedupe
    expect(credits).toHaveLength(movieIds.size);
    expect(new Set(credits.map((c) => c.tmdbId))).toEqual(movieIds);
  });

  it("dedupes by tmdb id", () => {
    const ids = credits.map((c) => c.tmdbId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sorts by popularity descending", () => {
    const pops = credits.map(
      (cr) => allRaw.find((r) => r.id === cr.tmdbId)!.popularity,
    );
    expect(pops).toEqual([...pops].sort((a, b) => b - a));
  });

  it("maps to the shared shape", () => {
    for (const c of credits) {
      expect(typeof c.tmdbId).toBe("number");
      expect(typeof c.title).toBe("string");
      expect(c.posterPath === null || typeof c.posterPath === "string").toBe(true);
      expect(c.releaseYear === null || typeof c.releaseYear === "number").toBe(true);
    }
  });

  it("extracts year from release_date", () => {
    const sample = allRaw.find((c) => (c.release_date ?? "").length >= 4);
    expect(sample).toBeDefined();
    const shaped = credits.find((c) => c.tmdbId === sample!.id);
    const year = shaped?.releaseYear;
    expect(year).toBe(Number((sample!.release_date ?? "").slice(0, 4)));
  });

  it("filters strictly by Director role when role=director", () => {
    const custom = {
      cast: [{ id: 101, title: "Acting Gig", media_type: "movie" }],
      crew: [
        { id: 102, title: "Directed Film", media_type: "movie", job: "Director", department: "Directing" },
        { id: 103, title: "Produced Film", media_type: "movie", job: "Executive Producer", department: "Production" },
      ],
    };
    const directorCredits = shapeCredits(custom, "director");
    expect(directorCredits.map((c) => c.tmdbId)).toEqual([102]);
  });

  it("filters strictly by Actor role when role=actor", () => {
    const custom = {
      cast: [{ id: 101, title: "Acting Gig", media_type: "movie" }],
      crew: [
        { id: 102, title: "Directed Film", media_type: "movie", job: "Director", department: "Directing" },
      ],
    };
    const actorCredits = shapeCredits(custom, "actor");
    expect(actorCredits.map((c) => c.tmdbId)).toEqual([101]);
  });
});

describe("pickPoster", () => {
  it("prefers an English-tagged poster", () => {
    expect(
      pickPoster(
        [
          { iso_639_1: "es", file_path: "/es.jpg" },
          { iso_639_1: "en", file_path: "/en.jpg" },
          { iso_639_1: null, file_path: "/null.jpg" },
        ],
        "/primary.jpg",
      ),
    ).toBe("/en.jpg");
  });

  it("falls back to a language-less poster", () => {
    expect(
      pickPoster([{ iso_639_1: null, file_path: "/null.jpg" }], "/primary.jpg"),
    ).toBe("/null.jpg");
  });

  it("falls back to the primary path when no en/null poster exists or list is empty", () => {
    expect(pickPoster([{ iso_639_1: "fr", file_path: "/fr.jpg" }], "/primary.jpg")).toBe(
      "/primary.jpg",
    );
    expect(pickPoster([], "/primary.jpg")).toBe("/primary.jpg");
    expect(pickPoster([], null)).toBeNull();
  });
});

describe("getMovieById", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Stub fetch for /movie/{id} detail + /movie/{id}/images endpoints. */
  function stubFetch(detail: unknown, images: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const body = String(url).includes("/images") ? images : detail;
        return { ok: true, json: async () => body } as Response;
      }),
    );
  }

  const DETAIL = {
    id: 42,
    title: "Artless",
    poster_path: null,
    release_date: "2001-01-01",
  };

  it("falls back to the images endpoint for en art when primary poster is missing", async () => {
    stubFetch(DETAIL, { posters: [{ iso_639_1: "en", file_path: "/en.jpg" }] });
    await expect(getMovieById(42)).resolves.toEqual({
      tmdbId: 42,
      title: "Artless",
      posterPath: "/en.jpg",
      releaseYear: 2001,
    });
  });

  it("keeps the credit with posterPath=null when no art exists anywhere", async () => {
    stubFetch(DETAIL, { posters: [] });
    await expect(getMovieById(42)).resolves.toEqual({
      tmdbId: 42,
      title: "Artless",
      posterPath: null,
      releaseYear: 2001,
    });
  });

  it("does not hit the images endpoint when primary art exists", async () => {
    let imageCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("/images")) imageCalls++;
        return {
          ok: true,
          json: async () => ({ ...DETAIL, poster_path: "/primary.jpg" }),
        } as Response;
      }),
    );
    const credit = await getMovieById(42);
    expect(credit?.posterPath).toBe("/primary.jpg");
    expect(imageCalls).toBe(0);
  });
});

describe("rankNameResults (person + company suggestions)", () => {
  it("floats exact case-insensitive matches to the front", () => {
    const ranked = rankNameResults(
      [
        { id: 1, name: "A24 Films LLC", popularity: 99 },
        { id: 2, name: "a24", popularity: 1 },
        { id: 3, name: "Another Studio", popularity: 50 },
      ],
      "A24",
    );
    expect(ranked[0].id).toBe(2);
  });

  it("sorts by popularity descending when no exact match", () => {
    const ranked = rankNameResults(
      [
        { id: 1, name: "Obscure Co", popularity: 0.6 },
        { id: 2, name: "Big Studio", popularity: 40 },
        { id: 3, name: "Mid Studio", popularity: 5 },
      ],
      "studio search",
    );
    expect(ranked.map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it("dedupes same-named entries preferring higher popularity", () => {
    const ranked = rankNameResults(
      [
        { id: 1, name: "A24", popularity: 5 },
        { id: 2, name: "a24", popularity: 50 },
        { id: 3, name: "Other", popularity: 9 },
      ],
      "a24",
    );
    expect(ranked.filter((c) => c.name.toLowerCase() === "a24")).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ id: 2 });
    expect(ranked.map((r) => r.id)).toEqual([2, 3]); // dedup survivor keeps its rank
  });

  it("caps results at 20 and treats missing popularity as 0", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `Studio ${i + 1}`,
      popularity: 30 - i,
    }));
    const ranked = rankNameResults(many, "zzz-no-match");
    expect(ranked).toHaveLength(20);
    expect(ranked[0]).toEqual({ id: 1, name: "Studio 1", popularity: 30 });
  });
});

describe("rankCompaniesByCount (studio suggestions)", () => {
  it("sorts by movie count descending", () => {
    const ranked = rankCompaniesByCount(
      [
        { id: 1, name: "Disney Türkiye", movieCount: 12 },
        { id: 2, name: "Walt Disney Pictures", movieCount: 700 },
      ],
      "disney",
    );
    expect(ranked.map((r) => r.id)).toEqual([2, 1]);
  });

  it("floats exact case-insensitive matches first even with fewer movies", () => {
    const ranked = rankCompaniesByCount(
      [
        { id: 1, name: "A24 Films LLC", movieCount: 500 },
        { id: 2, name: "a24", movieCount: 172 },
      ],
      "A24",
    );
    expect(ranked[0].id).toBe(2);
  });

  it("treats missing counts as 0, sorting them below any real count", () => {
    const ranked = rankCompaniesByCount(
      [
        { id: 1, name: "No Count Co" },
        { id: 2, name: "Tiny Studio", movieCount: 1 },
        { id: 3, name: "Zero Studio", movieCount: 0 },
      ],
      "zzz-no-match",
    );
    // missing == 0: Zero Studio and No Count Co tie, name-asc breaks it
    expect(ranked.map((r) => r.id)).toEqual([2, 1, 3]);
  });

  it("breaks ties by name ascending", () => {
    const ranked = rankCompaniesByCount(
      [
        { id: 1, name: "Beta Films", movieCount: 10 },
        { id: 2, name: "Alpha Films", movieCount: 10 },
      ],
      "zzz-no-match",
    );
    expect(ranked.map((r) => r.name)).toEqual(["Alpha Films", "Beta Films"]);
  });
});

describe("searchCompany (count enrichment + ranking)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(companies: unknown[]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        const body = u.includes("/search/company")
          ? { results: companies }
          : {
              // discover/movie: count derived from the with_companies param
              total_results: u.includes("with_companies=2") ? 700 : 3,
            };
        return { ok: true, json: async () => body } as Response;
      }),
    );
  }

  it("enriches results with movie counts and ranks by count descending", async () => {
    stubFetch([
      { id: 2, name: "Walt Disney Pictures", popularity: 40 },
      { id: 1, name: "Disney Türkiye", popularity: 99 },
    ]);
    const ranked = await searchCompany("disney");
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({ id: 2, movieCount: 700 });
    expect(ranked[1]).toMatchObject({ id: 1, movieCount: 3 });
  });

  it("keeps results with failed/missing counts at the end but still shown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        if (u.includes("/search/company")) {
          return {
            ok: true,
            json: async () => ({
              results: [{ id: 9, name: "Broken Count Co", popularity: 5 }],
            }),
          } as Response;
        }
        return { ok: false, status: 500 } as Response; // discover fails for this company
      }),
    );
    const ranked = await searchCompany("broken");
    expect(ranked).toEqual([{ id: 9, name: "Broken Count Co", popularity: 5 }]);
  });
});

describe("searchByKeyword", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Stub fetch; resolve(url) returns the JSON body, or undefined to fail the lookup. */
  function stubFetch(resolve: (url: string) => unknown) {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        urls.push(u);
        return { ok: true, json: async () => resolve(u) } as Response;
      }),
    );
    return urls;
  }

  it("returns [] when no keyword matches", async () => {
    stubFetch(() => ({ results: [] }));
    await expect(searchByKeyword("zzz-no-such-keyword")).resolves.toEqual([]);
  });

  it("discovers pages 1-3 by the first keyword id", async () => {
    const urls = stubFetch((u) => {
      if (u.includes("/search/keyword")) return { results: [{ id: 207317 }, { id: 1 }] };
      const page = Number(new URL(u).searchParams.get("page"));
      // each page contributes one unique movie
      return {
        results: [
          {
            id: 100 + page,
            media_type: "movie",
            title: `Movie ${page}`,
            popularity: 10 - page,
            poster_path: "/x.jpg",
            release_date: "1999-05-21",
          },
        ],
      };
    });
    const movies = await searchByKeyword("time travel");
    expect(movies.map((m) => m.tmdbId)).toEqual([101, 102, 103]);
    expect(movies[0]).toEqual({
      tmdbId: 101,
      title: "Movie 1",
      posterPath: "/x.jpg",
      releaseYear: 1999,
    });
    expect(urls.filter((u) => u.includes("/discover/movie")).length).toBe(3);
    expect(urls.some((u) => u.includes("with_keywords=207317"))).toBe(true);
    expect(urls.some((u) => u.includes("sort_by=popularity.desc"))).toBe(true);
    expect(urls.every((u) => !u.includes("with_companies"))).toBe(true);
  });
});

describe("tmdbMovieUrl", () => {
  it("formats canonical movie listing url", () => {
    expect(tmdbMovieUrl(550)).toBe("https://www.themoviedb.org/movie/550");
    expect(tmdbMovieUrl(157336)).toBe("https://www.themoviedb.org/movie/157336");
  });
});

describe("tagline handling in tmdb", () => {
  it("extracts and trims tagline in toCredit when present", () => {
    const raw = {
      id: 550,
      title: "Fight Club",
      tagline: "  Mischief. Mayhem. Soap.  ",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      release_date: "1999-10-15",
    };
    const credits = shapeCredits({ cast: [raw] });
    expect(credits[0].tagline).toBe("Mischief. Mayhem. Soap.");
  });

  it("omits empty or whitespace-only tagline", () => {
    const rawEmpty = { id: 1, title: "Film A", tagline: "", release_date: "2000-01-01" };
    const rawSpaces = { id: 2, title: "Film B", tagline: "   ", release_date: "2000-01-01" };
    const rawMissing = { id: 3, title: "Film C", release_date: "2000-01-01" };

    const credits = shapeCredits({ cast: [rawEmpty, rawSpaces, rawMissing] });
    expect(credits.find((c) => c.tmdbId === 1)?.tagline).toBeUndefined();
    expect(credits.find((c) => c.tmdbId === 2)?.tagline).toBeUndefined();
    expect(credits.find((c) => c.tmdbId === 3)?.tagline).toBeUndefined();
  });
});
