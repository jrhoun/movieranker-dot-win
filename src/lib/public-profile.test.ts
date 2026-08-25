import { describe, expect, it } from "vitest";
import { shapePublicProfile, type DbPublicList } from "./public-profile";

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
