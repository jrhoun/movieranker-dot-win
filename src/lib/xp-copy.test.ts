import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the failure that kept recurring: UI copy quoting an XP price as a
 * literal, which then drifts from the constant that actually pays it.
 *
 * It had happened three separate times. The career guide advertised a "+10 XP"
 * marquee bonus and a "+5 XP" group bonus that no code paid at all; the quiz
 * badge congratulated you with "+5 XP Solved!" while the constant paid 10; the
 * marquee explainer promised proposals at Level 3 against an API that rejected
 * anything under 20. Every one of them read plausibly and every one was false.
 *
 * So prices in copy must come from the constant. Rendering `{MARQUEE_XP}` is
 * fine; typing `+10 XP` is not.
 */
const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

/** Comments discuss the historical bug on purpose; only rendered copy counts. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("XP prices in UI copy", () => {
  const files = walk(SRC);

  it("finds files to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("never hardcodes an XP amount", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const body = stripComments(readFileSync(file, "utf8"));
      for (const [line] of body.matchAll(/[+-]?\b\d+\s*XP\b/g)) {
        offenders.push(`${file.replace(SRC, "src")}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never hardcodes a level gate in copy", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const body = stripComments(readFileSync(file, "utf8"));
      // "Level {MIN_PROPOSAL_LEVEL}" is right; "Level 20" is a promise waiting
      // to rot.
      for (const [line] of body.matchAll(/\bLevel\s+\d+\b/g)) {
        offenders.push(`${file.replace(SRC, "src")}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
