import { describe, expect, it } from "vitest";
import { marqueeDisplayTitle } from "./marquee-title";
import { SHORTLIST_THEMES } from "./shortlist-themes";
import { CONNECTION_GAMES } from "./connection-games";

describe("marqueeDisplayTitle", () => {
  it("withholds a marquee theme title", () => {
    expect(marqueeDisplayTitle("The Golden Age of Hollywood", "golden-age-giants", 12)).toBe(
      "Weekly Marquee #12",
    );
  });

  it("leaves an ordinary list title alone", () => {
    // Only marquee lists carry a spoiler; a personal ranking's title is its own.
    expect(marqueeDisplayTitle("Marvel Movies Ranking 2026", null, 12)).toBe(
      "Marvel Movies Ranking 2026",
    );
    expect(marqueeDisplayTitle("Best Noir", undefined, null)).toBe("Best Noir");
  });

  it("still withholds when the week is unknown", () => {
    // A missing number must not fall back to showing the theme — that would
    // turn an edge case into the exact leak this prevents.
    expect(marqueeDisplayTitle("The Golden Age of Hollywood", "golden-age-giants", null)).toBe(
      "Weekly Marquee",
    );
  });

  it("never returns a real theme title for any theme that has a quiz", () => {
    // The whole catalogue, not one example. A theme added later with a title
    // that happens to answer its own quiz is caught here rather than in a feed.
    for (const theme of SHORTLIST_THEMES) {
      const shown = marqueeDisplayTitle(theme.title, theme.slug, 5);
      expect(shown, `${theme.slug} leaked its title`).not.toBe(theme.title);
      expect(shown).toMatch(/^Weekly Marquee/);
    }
  });

  it("covers the themes whose titles most plainly give the answer away", () => {
    // Named explicitly so the reason this rule exists stays legible: for these,
    // the title is close to a restatement of the correct option.
    for (const slug of ["golden-age-giants", "secretly-same-story", "one-location"]) {
      const theme = SHORTLIST_THEMES.find((t) => t.slug === slug);
      expect(theme, `${slug} is missing from SHORTLIST_THEMES`).toBeDefined();
      expect(CONNECTION_GAMES[slug], `${slug} has no quiz`).toBeDefined();
      expect(marqueeDisplayTitle(theme!.title, slug, 3)).toBe("Weekly Marquee #3");
    }
  });
});
