import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CareerPanes,
  careerSummary,
} from "@/components/profile/LevelProgressionModal";
import {
  MAX_BASE_XP,
  MAX_LEVEL,
  UNLOCKS,
  xpForLevel,
  type XpBreakdown,
} from "@/lib/gamification";

/**
 * The career guide has no DOM test harness (vitest runs in node here), but its
 * whole job is what it SAYS: which rungs read as earned, where "You are here"
 * sits, and whether a price the code does not pay ever reaches the page. Static
 * markup is enough to hold all three.
 */

const breakdown: XpBreakdown = {
  movies: 120,
  marquee: 30,
  coCuration: 5,
  connections: 20,
  referrals: 0,
  total: 175,
};

const render = (currentLevel: number, currentXp = breakdown.total) =>
  renderToStaticMarkup(
    createElement(CareerPanes, { currentLevel, currentXp, breakdown }),
  );

describe("careerSummary", () => {
  it("states the standing and the cost of the next level as one sentence", () => {
    const xp = xpForLevel(18);
    const summary = careerSummary(18, xp);
    expect(summary).toBe(
      `Level 18, Film Buff, with ${xp} XP. ${xpForLevel(19) - xp} more takes you to level 19.`,
    );
  });

  it("does not promise a next level at the ceiling", () => {
    const summary = careerSummary(MAX_LEVEL, MAX_BASE_XP);
    expect(summary).toContain(`Level ${MAX_LEVEL}, Cinema Legend`);
    expect(summary).toContain("last rank");
    expect(summary).not.toMatch(/takes you to level/);
  });
});

describe("CareerPanes", () => {
  it("stacks the ten ranks with the top rank first", () => {
    const html = render(18);
    expect(html.indexOf("Cinema Legend")).toBeLessThan(html.indexOf("Theater Usher"));
    expect(html).toContain("Levels 11–20");
    expect(html).toContain("Levels 91–100");
  });

  it("marks the rung the player is standing on, once", () => {
    const html = render(18);
    expect(html.match(/You are here/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="step"/);
  });

  it("hangs every unlock on a rung, with its level and its effect", () => {
    const html = render(18);
    for (const u of UNLOCKS) {
      expect(html).toContain(`Level ${u.atLevel} — `);
      expect(html).toContain(u.effect.charAt(0).toLowerCase() + u.effect.slice(1));
    }
  });

  it("quotes only prices the code pays, and reports what each has earned", () => {
    const html = render(18);
    expect(html).toContain("+1 each");
    expect(html).toContain("+10 XP");
    expect(html).toContain("+5 XP");
    expect(html).toContain("+15 XP");
    expect(html).toContain("You have earned 120 XP this way.");
    expect(html).toContain("Nothing from this one yet.");
    expect(html).toContain("175 XP in total.");
    expect(html).not.toContain("kept from rankings");
  });

  it("quotes the same XP the header shows, and explains any XP the rows cannot account for", () => {
    // The header shows the banked lifetime peak; the rows are the fresh
    // sources. After a deleted list they disagree, and the footer used to
    // print the fresh total under a header printing the banked one.
    const html = render(18, 200);
    expect(html).toContain("200 XP in total.");
    expect(html).not.toContain("175 XP in total");
    expect(html).toContain("Includes 25 XP kept from rankings you have since deleted.");
  });

  it("describes the referral rule the code enforces: a finished ranking, not a claimed spot", () => {
    const html = render(18);
    expect(html).toContain("A friend finishes their first ranking");
    expect(html).toContain(
      "Someone who joined through your link or a credit on your list finishes a ranking.",
    );
    expect(html).not.toContain("claims their spot");
    expect(html).not.toContain("takes their name");
  });

  it("keeps the interface free of icons, emoji and stat tiles", () => {
    const html = render(18);
    // Challenges were folded into achievements; the guide no longer lists them.
    expect(html).not.toContain("doing something hard");
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(html).not.toContain("✓");
    expect(html).not.toContain("○");
  });
});
