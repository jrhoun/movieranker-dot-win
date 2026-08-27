import { describe, expect, it } from "vitest";
import { filterByTitle, sortMovies } from "./search-filter";

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

describe("sortMovies", () => {
  const movies = [
    { title: "Interstellar", releaseYear: 2014 },
    { title: "Memento", releaseYear: 2000 },
    { title: "Oppenheimer", releaseYear: 2023 },
    { title: "Inception", releaseYear: 2010 },
    { title: "Untitled Film" }, // no releaseYear
  ];

  it("sorts by year-desc (newest first) by default", () => {
    const sorted = sortMovies(movies, "year-desc");
    expect(sorted.map((m) => m.title)).toEqual([
      "Oppenheimer",
      "Interstellar",
      "Inception",
      "Memento",
      "Untitled Film",
    ]);
  });

  it("sorts by year-asc (oldest first)", () => {
    const sorted = sortMovies(movies, "year-asc");
    expect(sorted.map((m) => m.title)).toEqual([
      "Memento",
      "Inception",
      "Interstellar",
      "Oppenheimer",
      "Untitled Film",
    ]);
  });

  it("sorts by title-asc (A-Z)", () => {
    const sorted = sortMovies(movies, "title-asc");
    expect(sorted.map((m) => m.title)).toEqual([
      "Inception",
      "Interstellar",
      "Memento",
      "Oppenheimer",
      "Untitled Film",
    ]);
  });

  it("sorts by title-desc (Z-A)", () => {
    const sorted = sortMovies(movies, "title-desc");
    expect(sorted.map((m) => m.title)).toEqual([
      "Untitled Film",
      "Oppenheimer",
      "Memento",
      "Interstellar",
      "Inception",
    ]);
  });

  it("preserves original order for relevance", () => {
    const sorted = sortMovies(movies, "relevance");
    expect(sorted.map((m) => m.title)).toEqual([
      "Interstellar",
      "Memento",
      "Oppenheimer",
      "Inception",
      "Untitled Film",
    ]);
  });
});
