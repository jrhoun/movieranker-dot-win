import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CURATOR_MICRO_PACKS,
  getMicroPackBySlug,
  getRandomMicroPack,
  launchMicroPackSession,
} from "./curator-roulette";
import { loadSession } from "./session";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

describe("CURATOR_MICRO_PACKS catalog", () => {
  it("contains all required thematic micro-packs", () => {
    const slugs = CURATOR_MICRO_PACKS.map((p) => p.slug);
    expect(slugs).toContain("cyberpunk-90s");
    expect(slugs).toContain("a24-gems");
    expect(slugs).toContain("noir-classics");
    expect(slugs).toContain("oscar-snubs");
    expect(slugs).toContain("studio-ghibli");
    expect(slugs).toContain("paranoia-70s");
  });

  it("ensures every micro-pack has valid properties and at least 5 TMDB movie IDs", () => {
    for (const pack of CURATOR_MICRO_PACKS) {
      expect(pack.id).toBeTruthy();
      expect(pack.slug).toMatch(/^[a-z0-9-]+$/);
      expect(pack.title).toBeTruthy();
      expect(pack.blurb).toBeTruthy();
      expect(pack.genre).toBeTruthy();
      expect(pack.badge).toBeTruthy();
      expect(pack.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pack.movieIds.length).toBeGreaterThanOrEqual(5);
      expect(pack.movieIds.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
    }
  });
});

describe("getRandomMicroPack", () => {
  it("returns a micro-pack from the catalog", () => {
    const pack = getRandomMicroPack();
    expect(CURATOR_MICRO_PACKS.some((p) => p.slug === pack.slug)).toBe(true);
  });

  it("excludes the specified slug when requested", () => {
    for (let i = 0; i < 20; i++) {
      const pack = getRandomMicroPack("cyberpunk-90s");
      expect(pack.slug).not.toBe("cyberpunk-90s");
    }
  });
});

describe("getMicroPackBySlug", () => {
  it("finds a pack by exact slug", () => {
    const pack = getMicroPackBySlug("noir-classics");
    expect(pack).toBeDefined();
    expect(pack?.title).toBe("Film Noir Legends");
  });

  it("returns undefined for unknown slug", () => {
    expect(getMicroPackBySlug("nonexistent")).toBeUndefined();
  });
});

describe("launchMicroPackSession", () => {
  beforeEach(() => {
    store.clear();
  });

  it("creates a clean curated PlaySession from slug and persists to localStorage", () => {
    const session = launchMicroPackSession("studio-ghibli");
    expect(session.title).toBe("Studio Ghibli Magic");
    expect(session.themeSlug).toBe("studio-ghibli");
    expect(session.curated).toBe(true);
    expect(session.participants).toEqual([]);
    expect(session.votesSinceOrderChange).toBe(0);
    expect(session.nudgeShown).toBe(false);
    expect(session.movies.length).toBeGreaterThanOrEqual(5);
    expect(session.movies.every((m) => m.elo === 1000)).toBe(true);
    expect(session.movies.every((m) => m.comparisons === 0)).toBe(true);
    expect(session.movies.every((m) => m.parked === false)).toBe(true);

    const loaded = loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe("Studio Ghibli Magic");
    expect(loaded?.themeSlug).toBe("studio-ghibli");
  });

  it("uses provided movieDetails when supplied", () => {
    const pack = getMicroPackBySlug("a24-gems")!;
    const details = [
      {
        tmdbId: 546554,
        title: "Everything Everywhere All at Once",
        posterPath: "/eeaao.jpg",
        releaseYear: 2022,
        tagline: "The universe is so much bigger than you realize.",
      },
      {
        tmdbId: 493922,
        title: "Past Lives",
        posterPath: "/pastlives.jpg",
        releaseYear: 2023,
        tagline: "In-Yun connects us all.",
      },
    ];

    const session = launchMicroPackSession(pack, details);
    expect(session.movies).toHaveLength(2);
    expect(session.movies[0]).toEqual({
      tmdbId: 546554,
      title: "Everything Everywhere All at Once",
      posterPath: "/eeaao.jpg",
      releaseYear: 2022,
      tagline: "The universe is so much bigger than you realize.",
      elo: 1000,
      comparisons: 0,
      parked: false,
    });
  });
});
