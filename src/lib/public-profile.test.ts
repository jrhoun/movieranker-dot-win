import { describe, expect, it } from "vitest";
import {
  mergeShowcase,
  parseShowcase,
  shapePublicProfile,
  type DbPublicList,
} from "./public-profile";

function list(partial: Partial<DbPublicList>): DbPublicList {
  return {
    id: "l1",
    title: "Top Films",
    status: "done",
    visibility: "public",
    created_at: "2026-03-05T00:00:00Z",
    list_movies: null,
    ...partial,
  };
}

describe("parseShowcase / mergeShowcase", () => {
  it("treats null/undefined/'{}' as the empty showcase", () => {
    expect(parseShowcase(null)).toEqual({ achievementKeys: [], favoriteListId: null });
    expect(parseShowcase({})).toEqual({ achievementKeys: [], favoriteListId: null });
  });

  it("rejects invalid stored shapes", () => {
    expect(parseShowcase(42)).toBeNull();
    expect(parseShowcase({ achievementKeys: ["nope"] })).toBeNull();
    expect(parseShowcase({ achievementKeys: ["first_premiere"], favoriteListId: 7 })).toBeNull();
  });

  it("enforces max-3 and catalog membership on merge", () => {
    const keys = ["first_premiere", "marathoner", "centurion"];
    expect(mergeShowcase({}, { achievementKeys: keys })).toEqual({
      achievementKeys: keys,
      favoriteListId: null,
    });
    expect(mergeShowcase({}, { achievementKeys: [...keys, "marathoner"] })).toBeNull();
    expect(mergeShowcase({}, { achievementKeys: ["made_up"] })).toBeNull();
  });

  it("preserves the untouched field on a partial patch", () => {
    const current = { achievementKeys: ["first_premiere"], favoriteListId: "l1" };
    expect(mergeShowcase(current, { favoriteListId: null })).toEqual({
      achievementKeys: ["first_premiere"],
      favoriteListId: null,
    });
    expect(mergeShowcase(current, { achievementKeys: [] })).toEqual({
      achievementKeys: [],
      favoriteListId: "l1",
    });
  });
});

describe("shapePublicProfile", () => {
  it("keeps only public done lists", () => {
    const rows = [
      list({}),
      list({ id: "l2", visibility: "unlisted", list_movies: [{ title: "Hidden", poster_path: null }] }),
      list({ id: "l3", status: "draft", list_movies: [{ title: "Draft", poster_path: null }] }),
      list({ id: "l4", visibility: "private" }),
    ];
    const shaped = shapePublicProfile(rows);
    expect(shaped.cards.map((c) => c.id)).toEqual(["l1"]);
    // Unlisted and draft movies never leak into the ranked count.
    expect(shaped.moviesRanked).toBe(0);
  });

  it("counts movies across public done lists only and derives the level", () => {
    const rows = [
      list({ list_movies: Array.from({ length: 20 }, (_, i) => ({ title: `m${i}`, poster_path: null })) }),
      list({ id: "l2", list_movies: Array.from({ length: 5 }, (_, i) => ({ title: `n${i}`, poster_path: null })) }),
    ];
    const shaped = shapePublicProfile(rows);
    expect(shaped.moviesRanked).toBe(25);
    expect(shaped.level.level).toBe(2); // Film Buff at 25 XP
    expect(shaped.level.title).toBe("Film Buff");
  });

  it("shapes cards with UTC dates and posters", () => {
    const [shaped] = [shapePublicProfile([list({ list_movies: [{ title: "Alien", poster_path: "/a.jpg" }] })])];
    expect(shaped.cards[0]).toEqual({
      id: "l1",
      title: "Top Films",
      createdAt: "Mar 5, 2026",
      posters: [{ title: "Alien", posterPath: "/a.jpg" }],
    });
  });

  it("handles empty input", () => {
    expect(shapePublicProfile([])).toEqual({ cards: [], moviesRanked: 0, level: expect.objectContaining({ level: 1 }) });
  });
});
