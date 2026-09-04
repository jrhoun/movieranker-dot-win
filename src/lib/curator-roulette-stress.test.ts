import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CURATOR_MICRO_PACKS,
  getMicroPackBySlug,
  getRandomMicroPack,
  launchMicroPackSession,
  type CuratorMicroPack,
} from "./curator-roulette";
import { loadSession } from "./session";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

describe("curator-roulette.ts — Stress & Robustness Tests (Milestone 3 Challenger)", () => {
  beforeEach(() => {
    store.clear();
  });

  describe("Micro-Packs Catalog Integrity & Formatting", () => {
    it("contains exactly 6 well-defined thematic micro-packs", () => {
      expect(CURATOR_MICRO_PACKS).toHaveLength(6);
    });

    it("verifies all 6 micro-packs have valid, non-empty arrays, distinct TMDB IDs, and proper formatting", () => {
      const expectedSlugs = [
        "cyberpunk-90s",
        "a24-gems",
        "noir-classics",
        "oscar-snubs",
        "studio-ghibli",
        "paranoia-70s",
      ];

      const foundSlugs = CURATOR_MICRO_PACKS.map((p) => p.slug);
      expect(foundSlugs).toEqual(expectedSlugs);

      for (const pack of CURATOR_MICRO_PACKS) {
        // ID & Slug validation
        expect(pack.id).toBeTruthy();
        expect(pack.slug).toBeTruthy();
        expect(pack.id).toBe(pack.slug);

        // Titles and Text content
        expect(pack.title.trim().length).toBeGreaterThan(3);
        expect(pack.subtitle.trim().length).toBeGreaterThan(3);
        expect(pack.blurb.trim().length).toBeGreaterThan(20);
        expect(pack.genre.trim().length).toBeGreaterThan(3);
        expect(pack.badge.trim().length).toBeGreaterThan(3);

        // Badge should contain an emoji / symbol
        expect(/\p{Extended_Pictographic}/u.test(pack.badge)).toBe(true);

        // Accent color must be valid 6-digit hex
        expect(pack.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);

        // Movie IDs array must be non-empty and have at least 5 movies
        expect(Array.isArray(pack.movieIds)).toBe(true);
        expect(pack.movieIds.length).toBeGreaterThanOrEqual(5);

        // All TMDB IDs must be positive integers
        for (const id of pack.movieIds) {
          expect(Number.isInteger(id)).toBe(true);
          expect(id).toBeGreaterThan(0);
        }

        // TMDB IDs within each micro-pack must be DISTINCT (no duplicates)
        const uniqueIds = new Set(pack.movieIds);
        expect(uniqueIds.size).toBe(pack.movieIds.length);

        // Sample titles array must be non-empty and match movie count or be well-populated
        expect(Array.isArray(pack.sampleTitles)).toBe(true);
        expect(pack.sampleTitles.length).toBeGreaterThanOrEqual(5);
        for (const title of pack.sampleTitles) {
          expect(typeof title).toBe("string");
          expect(title.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Rapid Random Selection Distribution & Uniformity", () => {
    it("empirically achieves uniform distribution across 10,000 iterations for getRandomMicroPack()", () => {
      const iterations = 10000;
      const counts: Record<string, number> = {};

      for (const pack of CURATOR_MICRO_PACKS) {
        counts[pack.slug] = 0;
      }

      for (let i = 0; i < iterations; i++) {
        const pack = getRandomMicroPack();
        expect(counts[pack.slug]).toBeDefined();
        counts[pack.slug]++;
      }

      const expectedMean = iterations / CURATOR_MICRO_PACKS.length; // ~1666.67
      // For N=10000 and 6 bins, standard deviation is sqrt(N * p * (1-p)) = sqrt(10000 * 1/6 * 5/6) ≈ 37.26
      // 5-sigma tolerance is ~186, allowing range [1400, 1950]
      for (const [slug, count] of Object.entries(counts)) {
        expect(count).toBeGreaterThan(1400);
        expect(count).toBeLessThan(1950);
      }

      // Chi-Square Goodness of Fit Test for uniformity
      let chiSquare = 0;
      for (const count of Object.values(counts)) {
        chiSquare += Math.pow(count - expectedMean, 2) / expectedMean;
      }
      // Degrees of freedom = 6 - 1 = 5. Critical value for p = 0.001 is 20.515
      expect(chiSquare).toBeLessThan(20.515);
    });

    it("strictly excludes excludedSlug across 12,000 rapid random queries (2,000 per slug)", () => {
      const iterationsPerSlug = 2000;

      for (const excludedPack of CURATOR_MICRO_PACKS) {
        const counts: Record<string, number> = {};
        for (const pack of CURATOR_MICRO_PACKS) {
          counts[pack.slug] = 0;
        }

        for (let i = 0; i < iterationsPerSlug; i++) {
          const selected = getRandomMicroPack(excludedPack.slug);
          expect(selected.slug).not.toBe(excludedPack.slug);
          counts[selected.slug]++;
        }

        // Verify the excluded pack was NEVER selected
        expect(counts[excludedPack.slug]).toBe(0);

        // Verify the remaining 5 packs each get ~400 selections (expected 2000 / 5 = 400)
        // Standard dev = sqrt(2000 * 0.2 * 0.8) ≈ 17.88. Range [300, 500]
        for (const [slug, count] of Object.entries(counts)) {
          if (slug !== excludedPack.slug) {
            expect(count).toBeGreaterThan(300);
            expect(count).toBeLessThan(500);
          }
        }
      }
    });
  });

  describe("launchMicroPackSession Robustness & State Verification", () => {
    it("launches sessions for all 6 packs with default TMDB placeholders and proper metadata", () => {
      for (const pack of CURATOR_MICRO_PACKS) {
        store.clear();
        const session = launchMicroPackSession(pack.slug);

        expect(session.title).toBe(pack.title);
        expect(session.themeSlug).toBe(pack.slug);
        expect(session.curated).toBe(true);
        expect(session.participants).toEqual([]);
        expect(session.votesSinceOrderChange).toBe(0);
        expect(session.nudgeShown).toBe(false);
        expect(session.movies.length).toBe(pack.movieIds.length);

        for (let i = 0; i < session.movies.length; i++) {
          const m = session.movies[i];
          expect(m.tmdbId).toBe(pack.movieIds[i]);
          expect(m.title).toBe(pack.movies[i].title);
          expect(m.elo).toBe(1000);
          expect(m.comparisons).toBe(0);
          expect(m.parked).toBe(false);
          expect(typeof m.posterPath === "string" && m.posterPath.startsWith("/")).toBe(true);
        }

        const loaded = loadSession();
        expect(loaded?.title).toBe(pack.title);
        expect(loaded?.themeSlug).toBe(pack.slug);
      }
    });

    it("falls back to the first pack when an unknown slug is provided", () => {
      const session = launchMicroPackSession("nonexistent-slug-xyz");
      expect(session.title).toBe(CURATOR_MICRO_PACKS[0].title);
      expect(session.themeSlug).toBe(CURATOR_MICRO_PACKS[0].slug);
    });

    it("correctly integrates rich movieDetails when provided with edge case fields", () => {
      const pack = getMicroPackBySlug("paranoia-70s")!;
      const customDetails = [
        {
          tmdbId: 1949,
          title: "The Conversation",
          posterPath: "/conversation.jpg",
          releaseYear: 1974,
          tagline: "He'd kill for a listening device like this.",
        },
        {
          tmdbId: 891,
          title: "All the President's Men",
          posterPath: null,
          releaseYear: null,
          tagline: null,
        },
      ];

      const session = launchMicroPackSession(pack, customDetails);
      expect(session.movies).toHaveLength(2);
      expect(session.movies[0]).toEqual({
        tmdbId: 1949,
        title: "The Conversation",
        posterPath: "/conversation.jpg",
        releaseYear: 1974,
        tagline: "He'd kill for a listening device like this.",
        elo: 1000,
        comparisons: 0,
        parked: false,
      });
      expect(session.movies[1]).toEqual({
        tmdbId: 891,
        title: "All the President's Men",
        posterPath: null,
        releaseYear: null,
        tagline: null,
        elo: 1000,
        comparisons: 0,
        parked: false,
      });
    });
  });
});
