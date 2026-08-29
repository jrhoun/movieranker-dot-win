import { describe, expect, it } from "vitest";
import { CONNECTION_GAMES } from "./connection-games";
import { SHORTLIST_THEMES, getThemeConnectionGame } from "./shortlist-themes";

const entries = Object.entries(CONNECTION_GAMES);

describe("CONNECTION_GAMES coverage", () => {
  it("authors a quiz for every curated theme", () => {
    // Before this file existed only 5 of 52 themes had a quiz; the other 47 fell
    // through to a generated fallback whose distractors were fixed absurdities.
    const missing = SHORTLIST_THEMES.filter((t) => !CONNECTION_GAMES[t.slug]).map((t) => t.slug);
    expect(missing).toEqual([]);
  });

  it("has no orphan entries pointing at themes that no longer exist", () => {
    const slugs = new Set(SHORTLIST_THEMES.map((t) => t.slug));
    const orphans = entries.map(([slug]) => slug).filter((slug) => !slugs.has(slug));
    expect(orphans).toEqual([]);
  });

  it("routes every curated theme through the authored quiz, not the fallback", () => {
    for (const theme of SHORTLIST_THEMES) {
      expect(getThemeConnectionGame(theme), theme.slug).toBe(CONNECTION_GAMES[theme.slug]);
    }
  });
});

describe("CONNECTION_GAMES authoring rules", () => {
  it.each(entries)("%s is well formed", (slug, game) => {
    expect(game.options, `${slug} needs exactly 4 options`).toHaveLength(4);
    expect(new Set(game.options).size, `${slug} has duplicate options`).toBe(4);
    expect(game.connection.length, `${slug} has no connection text`).toBeGreaterThan(20);
    expect(game.triviaNote, `${slug} has no trivia note`).toBeTruthy();
    for (const option of game.options) {
      expect(option.trim().length, `${slug} has an empty option`).toBeGreaterThan(10);
    }
  });

  it("keeps the answer at index 0 in every entry", () => {
    // Authoring convention, not a gameplay position: display order is shuffled
    // per theme. A fixed slot is what lets a reviewer read down the file and
    // check every answer without decoding indices.
    const wrong = entries.filter(([, g]) => g.correctIndex !== 0).map(([slug]) => slug);
    expect(wrong).toEqual([]);
  });

  it("never leaks the theme title into an option", () => {
    // THE SPOILER RULE: for a marquee list the theme title paraphrases the
    // answer, so an option containing it hands over the puzzle.
    const leaks: string[] = [];
    for (const theme of SHORTLIST_THEMES) {
      const game = CONNECTION_GAMES[theme.slug];
      if (!game) continue;
      const title = theme.title.toLowerCase();
      for (const option of game.options) {
        if (option.toLowerCase().includes(title)) leaks.push(`${theme.slug}: ${option}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("does not give the answer away by length", () => {
    // "Pick the longest, most-qualified answer" is the oldest multiple-choice
    // heuristic there is, and the first draft of this file failed it badly: the
    // answer was the longest option in 49 of 52 quizzes, because a true claim
    // needs more words than a flat false one.
    //
    // Measured as the answer's mean rank by length, where 1 is longest and 4 is
    // shortest. A perfectly unbiased set averages 2.5. Anything approaching 1.0
    // means length alone solves the quiz.
    const ranks = entries.map(([, g]) => {
      const lengths = g.options.map((o) => o.length);
      return [...lengths].sort((a, b) => b - a).indexOf(lengths[0]) + 1;
    });
    const meanRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    expect(meanRank, `answer is too reliably the longest option`).toBeGreaterThan(1.9);

    // And no single answer should tower over its distractors, since that is
    // visible even when the average looks healthy.
    const worstMargin = Math.max(
      ...entries.map(([, g]) => g.options[0].length - Math.max(...g.options.slice(1).map((o) => o.length))),
    );
    expect(worstMargin, "one answer is much longer than any of its distractors").toBeLessThan(6);
  });
});
