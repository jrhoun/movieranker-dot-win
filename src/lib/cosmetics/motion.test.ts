import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";
import { BACKGROUND_MOTION_CLASSES } from "./classes";

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
      // Backgrounds are checked below instead: their motion is on layer
      // classes (`.cb-strip`), which no rule can derive from the item id.
      if (item.slot === "background") continue;
      const cls = item.id.replace(/^frame\./, "cf-").replace(/^overlay\./, "co-");
      expect(blocks, `${item.id} animates with no reduced-motion rule`).toMatch(
        new RegExp(`\\.${cls}\\b`),
      );
    }
  });

  /**
   * WHY BACKGROUNDS NEED THEIR OWN THREE TESTS.
   *
   * The check above works by DERIVING a class name from an item id, which is
   * only possible because a frame or an overlay is one element wearing one
   * class. A background is a composition — the filmstrip's drift lives on
   * `.cb-strip`, the marquee's chase on `.cb-bulb-chase`, and nothing in the
   * id "background.filmstrip" points at either. So a page-wide loop could ship
   * with no `prefers-reduced-motion` rule and the suite above would pass,
   * which is precisely what happened to the searchlights (see the long note in
   * globals.css). `BACKGROUND_MOTION_CLASSES` is the missing link, and it is
   * only load-bearing if all three ends of it are pinned: the map is complete,
   * every class in it is silenced, and every class in it is really applied.
   */
  it("every animated background is listed in BACKGROUND_MOTION_CLASSES", () => {
    for (const item of CATALOGUE.filter((i) => i.animated && i.slot === "background")) {
      const classes = BACKGROUND_MOTION_CLASSES[item.id];
      expect(classes, `${item.id} is animated but lists no motion classes`).toBeDefined();
      expect(classes?.length, `${item.id} lists an empty motion class array`).toBeGreaterThan(0);
    }
  });

  it("every background motion class is switched off under prefers-reduced-motion", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const blocks = reducedMotionBlocks(css).join("\n");

    const entries = Object.entries(BACKGROUND_MOTION_CLASSES);
    expect(entries.length, "no background motion classes — this would pass vacuously").toBeGreaterThan(0);

    for (const [id, classes] of entries) {
      for (const cls of classes) {
        expect(blocks, `${id} animates \`.${cls}\` with no reduced-motion rule`).toMatch(
          new RegExp(`\\.${cls}\\b`),
        );
        // A class that is silenced but never painted is a stale entry, and a
        // stale entry is how the map stops being trustworthy: the next
        // background's real moving layer gets added to a list nobody believes.
        expect(backdropSource(), `${id} lists \`.${cls}\`, which ProfileBackdrop never applies`).toContain(cls);
      }
    }
  });

  it("declares an @keyframes for every background motion class", () => {
    // `animation: cb-strip 40s ...` with no `@keyframes cb-strip` is a silent
    // no-op: the element renders at rest, in the right place, forever. Nothing
    // else in this suite can tell that apart from working motion.
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    for (const [id, classes] of Object.entries(BACKGROUND_MOTION_CLASSES)) {
      for (const cls of classes) {
        const rule = new RegExp(`\\.${cls}\\b[^{]*\\{[^}]*animation(?:-name)?:\\s*([\\w-]+)`);
        const name = css.match(rule)?.[1];
        expect(name, `${id}: no animation declared on \`.${cls}\``).toBeTruthy();
        expect(css, `${id}: \`.${cls}\` animates "${name}", which has no @keyframes`).toContain(
          `@keyframes ${name}`,
        );
      }
    }
  });
});

/** ProfileBackdrop's source — the one place these classes are applied. */
function backdropSource(): string {
  return readFileSync(join(process.cwd(), "src/components/profile/ProfileBackdrop.tsx"), "utf8");
}
