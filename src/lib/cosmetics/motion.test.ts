import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";

/**
 * Every `@media (prefers-reduced-motion: reduce)` body in the file.
 *
 * Brace-matched rather than sliced to EOF: globals.css has three such blocks,
 * and a substring search from the first one to the end would be satisfied by a
 * cosmetic's own rule appearing later in the file, silenced or not.
 */
function reducedMotionBlocks(css: string): string[] {
  const marker = "@media (prefers-reduced-motion: reduce)";
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(marker, from);
    if (at === -1) break;
    const open = css.indexOf("{", at);
    if (open === -1) break;
    let depth = 0;
    let i = open;
    for (; i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}" && --depth === 0) break;
    }
    out.push(css.slice(open, i + 1));
    from = i + 1;
  }
  return out;
}

describe("reduced motion", () => {
  it("every animated item's class is switched off under prefers-reduced-motion", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    const animated = CATALOGUE.filter((i) => i.animated);
    expect(animated.length, "no animated items — this test would pass vacuously").toBeGreaterThan(0);

    const blocks = reducedMotionBlocks(css).join("\n");
    expect(blocks.length, "no reduced-motion blocks found — the parser is wrong").toBeGreaterThan(0);

    for (const item of animated) {
      const cls = item.id.replace(/^frame\./, "cf-").replace(/^overlay\./, "co-");
      expect(blocks, `${item.id} animates with no reduced-motion rule`).toMatch(
        new RegExp(`\\.${cls}\\b`),
      );
    }
  });
});
