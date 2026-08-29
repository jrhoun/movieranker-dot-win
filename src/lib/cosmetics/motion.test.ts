import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";

describe("reduced motion", () => {
  it("every animated item's class is switched off under prefers-reduced-motion", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const item of CATALOGUE.filter((i) => i.animated)) {
      const cls = item.id.replace(/^frame\./, "cf-").replace(/^overlay\./, "co-");
      expect(block, `${item.id} animates with no reduced-motion rule`).toContain(cls);
    }
  });
});
