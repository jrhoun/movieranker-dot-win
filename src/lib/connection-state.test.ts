import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONNECTION_REVEALED_EVENT,
  connectionStorageKey,
} from "./connection-state";
import { readConnectionOutcome } from "./share-text";

/** Comments stripped: an explanation that quotes code must not be read as code. */
function code(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("connectionStorageKey", () => {
  it("is the key the quiz has always written", () => {
    // Pinned literally. Changing it would not break anything visibly — it would
    // quietly orphan every stored result, so every player would be shown the
    // question again as though they had never answered.
    expect(connectionStorageKey("golden-age-giants")).toBe("mr-conn-golden-age-giants");
  });

  it("is what the quiz component actually uses", () => {
    // Three files read or write this key. A second literal anywhere is a silent
    // divergence, which is the reason the helper exists at all.
    const quiz = code("src/components/MarqueeConnectionGame.tsx");
    expect(quiz).toMatch(/connectionStorageKey\(themeSlug\)/);
    expect(quiz, "the quiz still builds the key by hand").not.toMatch(/`mr-conn-\$\{/);
  });
});

describe("revealing an answer tells the page", () => {
  const quiz = code("src/components/MarqueeConnectionGame.tsx");

  it("routes both reveal paths through one persist", () => {
    // Guessing and peeking both reveal. An announcement wired into only one of
    // them would leave the heading stale for anyone who peeked.
    expect((quiz.match(/persistReveal\(nextState\)/g) ?? []).length).toBe(2);
  });

  it("announces after writing, so a listener reads the saved value", () => {
    const fn = /function persistReveal\([\s\S]*?\n  \}/.exec(quiz);
    expect(fn, "persistReveal not found").not.toBeNull();
    const body = fn![0];
    expect(body).toMatch(/localStorage\.setItem/);
    expect(body).toMatch(/announceConnectionRevealed/);
    expect(
      body.indexOf("localStorage.setItem"),
      "announced before saving, so a listener could read the old value",
    ).toBeLessThan(body.indexOf("announceConnectionRevealed"));
  });

  it("has a heading that listens for it", () => {
    // The quiz is further down the same page, so answering it while the heading
    // is already mounted is the COMMON case, not an edge one.
    const title = code("src/components/list/MarqueeListTitle.tsx");
    expect(title).toMatch(/addEventListener\(CONNECTION_REVEALED_EVENT/);
    expect(title).toMatch(/removeEventListener\(CONNECTION_REVEALED_EVENT/);
  });

  it("uses an event, not a storage listener", () => {
    // `storage` fires only in OTHER tabs, never the one that wrote — so it can
    // never see this page's own reveal. Naming it here in case it looks like the
    // obvious tool later.
    const title = code("src/components/list/MarqueeListTitle.tsx");
    expect(title).not.toMatch(/addEventListener\("storage"/);
    expect(CONNECTION_REVEALED_EVENT).toMatch(/^mr:/);
  });
});

describe("what counts as answered", () => {
  // The heading swaps the question for the theme title on anything that is not
  // "unplayed", so these are the cases that decide whether a reader is shown
  // the answer.
  it("treats a solve, a miss and a peek as answered", () => {
    for (const state of [
      { selected: 0, revealed: true, correct: true },
      { selected: 2, revealed: true, correct: false },
      { selected: null, revealed: true },
    ]) {
      expect(readConnectionOutcome(JSON.stringify(state))).not.toBe("unplayed");
    }
  });

  it("treats never-played and opened-without-revealing as unplayed", () => {
    expect(readConnectionOutcome(null)).toBe("unplayed");
    expect(readConnectionOutcome(JSON.stringify({ selected: null, revealed: false }))).toBe(
      "unplayed",
    );
  });

  it("treats junk as unplayed rather than revealing the theme", () => {
    // Fail CLOSED. A corrupt entry must leave the puzzle intact, not hand over
    // the answer to someone who never played.
    for (const junk of ["", "{", "null", "[]", '"revealed"', "42"]) {
      expect(readConnectionOutcome(junk), junk).toBe("unplayed");
    }
  });
});
