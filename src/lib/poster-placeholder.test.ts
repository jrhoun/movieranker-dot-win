import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POSTER_PLACEHOLDER_COUNT, posterPlaceholderClass } from "./poster-placeholder";

describe("placeholder styles exist", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("every variant the helper can return has a rule in globals.css", () => {
    // Without a rule the element renders with no background — the same blank
    // card this feature replaces, and silently, since a missing CSS class is
    // never an error.
    for (let n = 0; n < POSTER_PLACEHOLDER_COUNT; n += 1) {
      expect(css, `.pp-${n} has no rule in globals.css`).toMatch(new RegExp(`\\.pp-${n}\\b`));
    }
  });

  it("has no rule for a variant the helper can never return", () => {
    // An orphan left behind by lowering the count: harmless to render, but it
    // sits in the stylesheet looking like a colour that is in rotation.
    expect(css).not.toMatch(new RegExp(`\\.pp-${POSTER_PLACEHOLDER_COUNT}\\b`));
  });
});

describe("posterPlaceholderClass", () => {
  it("gives the same film the same colour every time", () => {
    // The whole reason this is keyed on the film rather than its index: a
    // ranking is reordered constantly, and a placeholder that changed colour
    // on every sort would read as a rendering bug.
    expect(posterPlaceholderClass(129)).toBe(posterPlaceholderClass(129));
    expect(posterPlaceholderClass("Bobo-kun")).toBe(posterPlaceholderClass("Bobo-kun"));
  });

  it("gives the same film the same colour in every view", () => {
    // A film appears in the ranking, the compare stage, the parked strip and
    // the profile canvas. Position differs in all four; the id does not.
    const inAList = posterPlaceholderClass(129);
    const inCompare = posterPlaceholderClass(129);
    const inParked = posterPlaceholderClass(129);
    expect(new Set([inAList, inCompare, inParked]).size).toBe(1);
  });

  it("stays inside the palette that actually has CSS rules", () => {
    // A class outside the range renders as no background at all — the exact
    // blank card this replaces.
    for (let id = 1; id < 500; id += 1) {
      const cls = posterPlaceholderClass(id);
      const n = Number(cls.replace("pp-", ""));
      expect(Number.isInteger(n), cls).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(POSTER_PLACEHOLDER_COUNT);
    }
  });

  it("actually spreads across the palette", () => {
    // A hash that collapsed to one or two buckets would satisfy every test
    // above while showing every film the same colour — which is the outcome
    // this feature exists to avoid.
    const seen = new Set<string>();
    for (let id = 1; id < 200; id += 1) seen.add(posterPlaceholderClass(id));
    expect(seen.size).toBe(POSTER_PLACEHOLDER_COUNT);
  });

  it("varies rather than collapsing when there is no id", () => {
    // Search rows and legacy entries may have only a title. Falling back to a
    // single constant would put every poster-less film on one colour, which is
    // a guaranteed collision rather than a 1-in-8 one.
    const a = posterPlaceholderClass("Bobo-kun");
    const b = posterPlaceholderClass("Mei and the Kittenbus");
    const c = posterPlaceholderClass("The Day I Bought a Star");
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it("never throws on a missing key", () => {
    for (const key of [null, undefined, ""]) {
      expect(() => posterPlaceholderClass(key)).not.toThrow();
      expect(posterPlaceholderClass(key)).toMatch(/^pp-\d$/);
    }
  });
});
