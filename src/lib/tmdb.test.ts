import { afterEach, describe, expect, it, vi } from "vitest";
import { searchByKeyword, shapeCredits } from "./tmdb";
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
