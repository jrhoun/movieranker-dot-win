import { describe, expect, it } from "vitest";
import { filterByTitle } from "./search-filter";

describe("filterByTitle", () => {
  const movies = [
    { title: "The Matrix" },
    { title: "matrix reloaded" },
    { title: "Inception" },
  ];

  it("returns everything for empty/whitespace queries", () => {
    expect(filterByTitle(movies, "")).toHaveLength(3);
    expect(filterByTitle(movies, "   ")).toHaveLength(3);
  });

  it("matches substrings case-insensitively", () => {
    expect(filterByTitle(movies, "MATrix")).toEqual([
      { title: "The Matrix" },
      { title: "matrix reloaded" },
    ]);
    expect(filterByTitle(movies, "cept")).toEqual([{ title: "Inception" }]);
  });

  it("returns nothing when no title contains the needle", () => {
    expect(filterByTitle(movies, "godfather")).toEqual([]);
  });
});
