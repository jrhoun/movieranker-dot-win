import { describe, expect, it } from "vitest";
import { shapeCredits } from "./tmdb";
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
