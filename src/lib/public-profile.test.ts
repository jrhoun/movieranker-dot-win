import { describe, expect, it } from "vitest";
import {
  mergeShowcase,
  parseShowcase,
  shapePublicProfile,
  type DbPublicList,
} from "./public-profile";
import { grandfatheredXp, levelFor } from "./gamification";

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
    expect(parseShowcase({ lifetimeXp: -5 })).toBeNull();
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

  it("preserves untouched fields and ratchets lifetimeXp", () => {
    const current = { achievementKeys: ["first_premiere"], favoriteListId: "l1", lifetimeXp: 50 };
    expect(mergeShowcase(current, { favoriteListId: null })).toEqual({
      achievementKeys: ["first_premiere"],
      favoriteListId: null,
      lifetimeXp: 50,
    });
    // Ratchets up
    expect(mergeShowcase(current, { lifetimeXp: 75 })).toEqual({
      achievementKeys: ["first_premiere"],
      favoriteListId: "l1",
      lifetimeXp: 75,
    });
    // Never ratchets down
    expect(mergeShowcase(current, { lifetimeXp: 20 })).toEqual({
      achievementKeys: ["first_premiere"],
      favoriteListId: "l1",
      lifetimeXp: 50,
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
      list({ id: "l2", list_movies: Array.from({ length: 10 }, (_, i) => ({ title: `n${i}`, poster_path: null })) }),
    ];
    const shaped = shapePublicProfile(rows);
    expect(shaped.moviesRanked).toBe(30);
    // 30 films is 30 XP, and levels cost 10 apiece early on.
    expect(shaped.level.level).toBe(4);
    expect(shaped.level.title).toBe("Theater Usher");
  });

  it("ratchets the level on banked XP without inflating the film count", () => {
    // Banked 50 XP, then deleted public lists, leaving 10 films visible.
    const rows = [
      list({ list_movies: Array.from({ length: 10 }, (_, i) => ({ title: `m${i}`, poster_path: null })) }),
    ];
    const shaped = shapePublicProfile(rows, { achievementKeys: [], favoriteListId: null, lifetimeXp: 50 });
    // The count is films, not XP. It used to report 50 "movies ranked" for
    // someone with ten films on show.
    expect(shaped.moviesRanked).toBe(10);
    // The level still comes from the banked total, so nothing is lost.
    expect(shaped.level.level).toBe(levelFor(grandfatheredXp(50)).level);
    expect(shaped.level.level).toBeGreaterThan(levelFor(10).level);
  });

  it("counts the marquee bonus on public themed lists", () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ title: `m${i}`, poster_path: null }));
    const plain = shapePublicProfile([list({ list_movies: six })]);
    const marquee = shapePublicProfile([
      list({ theme_slug: "secretly-the-same-story", list_movies: six }),
    ]);
    // Same six films; the themed one also earns the completion bonus, so a
    // public profile no longer has to wait on the owner's ratchet to show it.
    expect(marquee.level.level).toBeGreaterThan(plain.level.level);
    expect(marquee.moviesRanked).toBe(plain.moviesRanked);
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
