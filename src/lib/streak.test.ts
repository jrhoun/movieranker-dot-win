import { describe, expect, it } from "vitest";
import {
  getMovieWinStreak,
  hasLaurelBadge,
  STREAK_LAUREL_THRESHOLD,
} from "./streak";

describe("getMovieWinStreak", () => {
  it("returns 0 for empty or undefined or null history", () => {
    expect(getMovieWinStreak([], 1)).toBe(0);
    expect(getMovieWinStreak(undefined, 1)).toBe(0);
    expect(getMovieWinStreak(null, 1)).toBe(0);
  });

  it("returns 0 when the movie has never participated in any matchup", () => {
    const history: Array<[number, number]> = [
      [2, 3],
      [4, 5],
      [2, 5],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(0);
  });

  it("returns 1 for a single win", () => {
    const history: Array<[number, number]> = [[1, 2]];
    expect(getMovieWinStreak(history, 1)).toBe(1);
    expect(getMovieWinStreak(history, 2)).toBe(0);
  });

  it("returns 0 when the movie's most recent matchup was a loss", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [3, 1], // movie 1 lost to 3
    ];
    expect(getMovieWinStreak(history, 1)).toBe(0);
    expect(getMovieWinStreak(history, 3)).toBe(1);
  });

  it("returns 2 for 2 consecutive wins", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [1, 3],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(2);
  });

  it("returns 3 for 3 consecutive wins (laurel threshold)", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [1, 3],
      [1, 4],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(3);
  });

  it("returns 6 for 6 consecutive wins", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [1, 7],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(6);
  });

  it("ignores interleaved matchups between other movies", () => {
    const history: Array<[number, number]> = [
      [1, 2], // 1 win (+1)
      [3, 4], // unrelated
      [5, 6], // unrelated
      [1, 3], // 1 win (+1)
      [7, 8], // unrelated
      [1, 5], // 1 win (+1)
      [9, 10], // unrelated
    ];
    expect(getMovieWinStreak(history, 1)).toBe(3);
    expect(getMovieWinStreak(history, 9)).toBe(1);
    expect(getMovieWinStreak(history, 7)).toBe(1);
    expect(getMovieWinStreak(history, 3)).toBe(0); // lost to 1 at step 4
  });

  it("stops counting at the most recent loss even if prior wins exist", () => {
    const history: Array<[number, number]> = [
      [1, 2], // win
      [1, 3], // win
      [1, 4], // win (streak was 3)
      [5, 1], // loss! (streak resets to 0)
      [1, 6], // win (streak becomes 1)
      [1, 7], // win (streak becomes 2)
    ];
    expect(getMovieWinStreak(history, 1)).toBe(2);
  });

  it("handles alternating win/loss sequences correctly", () => {
    const history: Array<[number, number]> = [
      [1, 2], // win
      [3, 1], // loss
      [1, 4], // win
      [5, 1], // loss
    ];
    expect(getMovieWinStreak(history, 1)).toBe(0);
  });
});

describe("hasLaurelBadge", () => {
  it("returns false for streaks below threshold (0, 1, 2)", () => {
    expect(hasLaurelBadge(0)).toBe(false);
    expect(hasLaurelBadge(1)).toBe(false);
    expect(hasLaurelBadge(2)).toBe(false);
    expect(hasLaurelBadge(STREAK_LAUREL_THRESHOLD - 1)).toBe(false);
  });

  it("returns true for streaks at or above threshold (3, 4, 10)", () => {
    expect(hasLaurelBadge(3)).toBe(true);
    expect(hasLaurelBadge(4)).toBe(true);
    expect(hasLaurelBadge(10)).toBe(true);
    expect(hasLaurelBadge(STREAK_LAUREL_THRESHOLD)).toBe(true);
  });
});
