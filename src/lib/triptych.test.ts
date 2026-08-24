import { describe, expect, test } from "vitest";
import { triptychSlots } from "./triptych";

// Fixture poster paths as stored in list_movies.poster_path.
const p = (n: number) => `/poster-${n}.jpg`;

describe("triptychSlots", () => {
  test("three or more posters: exactly the top three, order kept", () => {
    expect(triptychSlots([p(1), p(2), p(3), p(4)])).toEqual([p(1), p(2), p(3)]);
  });

  test("two posters: trailing null filler panel", () => {
    expect(triptychSlots([p(1), p(2)])).toEqual([p(1), p(2), null]);
  });

  test("one poster: two trailing filler panels", () => {
    expect(triptychSlots([p(7)])).toEqual([p(7), null, null]);
  });

  test("empty list: three filler panels", () => {
    expect(triptychSlots([])).toEqual([null, null, null]);
  });
});
