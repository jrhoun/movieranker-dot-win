import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMovieById,
  pickPoster,
  rankNameResults,
  searchByKeyword,
  shapeCredits,
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

  it("caps results at 8 and treats missing popularity as 0", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Studio ${i + 1}`,
      popularity: 12 - i,
    }));
    const ranked = rankNameResults(many, "zzz-no-match");
    expect(ranked).toHaveLength(8);
    expect(ranked[0]).toEqual({ id: 1, name: "Studio 1", popularity: 12 });
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
