// src/lib/cosmetics/taglines.test.ts
import { describe, expect, it } from "vitest";
import { TAGLINES, earnedTaglines, taglineById } from "./taglines";
import { SHORTLIST_THEMES } from "@/lib/shortlist-themes";

describe("the rights invariant", () => {
  it("no referential line is ever purchasable", () => {
    // Short phrases are usually not copyrightable, but "E.T. phone home!" was
    // held infringing because an ordinary observer recognises the source — and
    // charging is the aggravating fact. Referential lines may be earned or
    // free, never sold.
    const sold = TAGLINES.filter(
      (t) => t.rights === "referential" && t.unlock.kind === "purchase",
    );
    expect(sold.map((t) => t.id)).toEqual([]);
  });

  it("every line declares its rights explicitly", () => {
    for (const t of TAGLINES) {
      expect(["owned", "referential"]).toContain(t.rights);
    }
  });

  it("every line has text and a set", () => {
    for (const t of TAGLINES) {
      expect(t.text.trim().length).toBeGreaterThan(0);
      expect(t.set.trim().length).toBeGreaterThan(0);
      expect(t.slot).toBe("tagline");
    }
  });

  it("ships a library worth browsing", () => {
    expect(TAGLINES.length).toBeGreaterThanOrEqual(24);
    expect(new Set(TAGLINES.map((t) => t.set)).size).toBeGreaterThanOrEqual(5);
  });

  it("every weekly theme has a souvenir line, unlocked by finishing that week", () => {
    for (const theme of SHORTLIST_THEMES) {
      const souvenir = TAGLINES.find((t) => t.id === `tagline.marquee.${theme.slug}`);
      expect(souvenir, `no souvenir for ${theme.slug}`).toBeDefined();
      expect(souvenir?.unlock).toEqual({ kind: "marquee", themeSlug: theme.slug });
      expect(souvenir?.text).toBe(theme.title);
    }
  });
});

describe("earnedTaglines", () => {
  const base = { doneLists: 0, moviesRanked: 0 };

  it("gives nothing to an empty record", () => {
    expect(earnedTaglines(base)).toEqual([]);
  });

  it("awards the solver line once connections are cracked", () => {
    const lines = earnedTaglines({ ...base, marqueeConnectionsSolved: 5 });
    expect(lines.some((l) => l.id === "tagline.earned.solver")).toBe(true);
  });

  it("earned lines are never purchasable — they are a receipt", () => {
    const lines = earnedTaglines({
      ...base,
      doneLists: 60,
      moviesRanked: 500,
      marqueeWeeks: 52,
      marqueeConnectionsSolved: 9,
      firstToMarquee: true,
    });
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      expect(l.unlock.kind).not.toBe("purchase");
      expect(l.unlock.kind).not.toBe("drop");
      expect(l.rights).toBe("owned");
    }
  });

  it("interpolates the real count rather than a fixed string", () => {
    const nine = earnedTaglines({ ...base, marqueeWeeks: 9 });
    const forty = earnedTaglines({ ...base, marqueeWeeks: 40 });
    const nineText = nine.find((l) => l.id === "tagline.earned.attendance")?.text;
    const fortyText = forty.find((l) => l.id === "tagline.earned.attendance")?.text;
    expect(nineText).toContain("9");
    expect(fortyText).toContain("40");
  });
});

describe("taglineById", () => {
  it("returns a known line with its text intact", () => {
    expect(taglineById("tagline.trailer.in-a-world")?.text).toBe("In a world…");
  });

  it("returns undefined for an unknown id", () => {
    expect(taglineById("tagline.does-not-exist")).toBeUndefined();
  });
});
