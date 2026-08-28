import { describe, expect, it } from "vitest";
import { shuffledOptions } from "./connection-options";
import { SHORTLIST_THEMES } from "./shortlist-themes";

const OPTIONS = ["the answer", "distractor one", "distractor two", "distractor three"];

describe("shuffledOptions", () => {
  it("keeps every option exactly once, with its authored index attached", () => {
    const shuffled = shuffledOptions("some-theme", OPTIONS);
    expect(shuffled).toHaveLength(OPTIONS.length);
    expect([...shuffled].map((s) => s.originalIndex).sort()).toEqual([0, 1, 2, 3]);
    for (const { option, originalIndex } of shuffled) {
      // The pairing is what scoring depends on: display position may move, but
      // option and originalIndex must never come apart.
      expect(option).toBe(OPTIONS[originalIndex]);
    }
  });

  it("is stable for a given slug, so a re-render cannot reorder the buttons", () => {
    const a = shuffledOptions("thin-air-vertical-drops", OPTIONS);
    const b = shuffledOptions("thin-air-vertical-drops", OPTIONS);
    expect(a).toEqual(b);
  });

  it("does not leave the answer at position A for every theme", () => {
    // The defect this module exists to fix: every authored game puts its answer
    // at correctIndex 0, so unshuffled the answer is always the first button.
    const positions = SHORTLIST_THEMES.map(
      (theme) => shuffledOptions(theme.slug, OPTIONS).findIndex((s) => s.originalIndex === 0),
    );
    expect(positions.every((p) => p === 0)).toBe(false);
    // And it should genuinely spread, not just move everything to one other slot.
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it("puts the answer in every slot at least once across the theme roster", () => {
    const positions = new Set(
      SHORTLIST_THEMES.map(
        (theme) => shuffledOptions(theme.slug, OPTIONS).findIndex((s) => s.originalIndex === 0),
      ),
    );
    expect(positions).toEqual(new Set([0, 1, 2, 3]));
  });

  it("handles degenerate input without throwing", () => {
    expect(shuffledOptions("x", [])).toEqual([]);
    expect(shuffledOptions("x", ["only"])).toEqual([{ option: "only", originalIndex: 0 }]);
  });
});
