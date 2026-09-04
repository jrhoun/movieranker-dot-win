import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CURATOR_MICRO_PACKS,
  getRandomMicroPack,
  launchMicroPackSession,
} from "./curator-roulette";
import { clearSession, loadSession } from "./session";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

describe("curator-roulette.ts Empirical Stress Testing", () => {
  beforeEach(() => {
    store.clear();
    clearSession();
  });

  it("validates that all micro-packs adhere to strict structural constraints", () => {
    expect(CURATOR_MICRO_PACKS.length).toBeGreaterThanOrEqual(6);

    const slugs = new Set<string>();
    const ids = new Set<string>();

    for (const pack of CURATOR_MICRO_PACKS) {
      expect(pack.id).toBeTruthy();
      expect(pack.slug).toBeTruthy();
      expect(pack.title).toBeTruthy();
      expect(pack.blurb).toBeTruthy();
      expect(pack.badge).toBeTruthy();
      expect(pack.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Uniqueness
      expect(slugs.has(pack.slug)).toBe(false);
      expect(ids.has(pack.id)).toBe(false);
      slugs.add(pack.slug);
      ids.add(pack.id);

      // Minimum 6 movies per pack
      expect(pack.movieIds.length).toBeGreaterThanOrEqual(6);
      for (const movieId of pack.movieIds) {
        expect(Number.isInteger(movieId)).toBe(true);
        expect(movieId).toBeGreaterThan(0);
      }

      // No duplicate movie IDs within a pack
      const uniqueMovies = new Set(pack.movieIds);
      expect(uniqueMovies.size).toBe(pack.movieIds.length);
    }
  });

  it("never returns excluded slug across 1,000 random selections", () => {
    const exclude = "cyberpunk-90s";
    for (let i = 0; i < 1000; i++) {
      const pack = getRandomMicroPack(exclude);
      expect(pack.slug).not.toBe(exclude);
    }
  });

  it("launches session with pristine defaults and saves to localStorage", () => {
    const pack = CURATOR_MICRO_PACKS[0];
    const session = launchMicroPackSession(pack.slug);

    expect(session.title).toBe(pack.title);
    expect(session.themeSlug).toBe(pack.slug);
    expect(session.curated).toBe(true);
    expect(session.movies.length).toBe(pack.movieIds.length);

    for (const m of session.movies) {
      expect(m.elo).toBe(1000);
      expect(m.comparisons).toBe(0);
      expect(m.parked).toBe(false);
    }

    const stored = loadSession();
    expect(stored).not.toBeNull();
    expect(stored?.title).toBe(pack.title);
  });

  it("handles unknown slugs gracefully with fallback to first pack", () => {
    const unknownSession = launchMicroPackSession("nonexistent-slug-xyz");
    expect(unknownSession.title).toBe(CURATOR_MICRO_PACKS[0].title);
  });
});
