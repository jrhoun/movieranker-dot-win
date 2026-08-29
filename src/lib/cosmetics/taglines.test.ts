// src/lib/cosmetics/taglines.test.ts
import { describe, expect, it } from "vitest";
import { EARNED_TAGLINES, TAGLINES, earnedTaglines, taglineById } from "./taglines";
import { itemById } from "./catalogue";
import { SHORTLIST_THEMES } from "@/lib/shortlist-themes";
import { ACHIEVEMENTS } from "@/lib/gamification";

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

  it("never leaks the {count} placeholder to the UI", () => {
    const lines = earnedTaglines({
      ...base,
      moviesRanked: 500,
      marqueeWeeks: 52,
      marqueeConnectionsSolved: 9,
      firstToMarquee: true,
    });
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      expect(l.text).not.toContain("{count}");
      expect(l.name).not.toContain("{count}");
    }
  });
});

describe("EARNED_TAGLINES — static catalogue entries backing earned lines", () => {
  it("reaches CATALOGUE, itemById, and taglineById, so ownership/equip logic can see it", () => {
    for (const t of EARNED_TAGLINES) {
      expect(TAGLINES.some((tag) => tag.id === t.id), `${t.id} missing from TAGLINES`).toBe(true);
      expect(taglineById(t.id)?.id, `${t.id} not reachable via taglineById`).toBe(t.id);
      expect(itemById(t.id)?.id, `${t.id} not reachable via itemById`).toBe(t.id);
    }
  });

  it("every entry is a real, never-purchasable challenge unlock", () => {
    const achievementKeys = new Set(ACHIEVEMENTS.map((a) => a.key));
    for (const t of EARNED_TAGLINES) {
      expect(t.unlock.kind).toBe("challenge");
      if (t.unlock.kind === "challenge") {
        expect(achievementKeys.has(t.unlock.key), `unknown achievement key "${t.unlock.key}"`).toBe(true);
      }
      expect(t.rights).toBe("owned");
    }
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
