import { describe, expect, it } from "vitest";
import { marqueeDisplayTitle, marqueeListNumber, maskListTitle } from "./marquee-title";
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

describe("marqueeListNumber", () => {
  it("is null for a list that is not a marquee", () => {
    expect(marqueeListNumber(null, "2026-08-31T00:00:00Z")).toBeNull();
    expect(marqueeListNumber(undefined, new Date())).toBeNull();
  });

  it("anchors to the week the room was made, not the week it is read", () => {
    // The bug this replaces: calling marqueeNumber() bare relabelled every past
    // marquee with the CURRENT week's number, so a link shared in week 2 became
    // "Weekly Marquee #9" to anyone opening it in week 9.
    const launchWeek = marqueeListNumber("golden-age-giants", "2026-08-24T12:00:00Z");
    const weekLater = marqueeListNumber("golden-age-giants", "2026-08-31T12:00:00Z");
    expect(launchWeek).toBe(1);
    expect(weekLater).toBe(2);
    // Stable no matter when the test runs.
    expect(marqueeListNumber("golden-age-giants", "2026-08-31T12:00:00Z")).toBe(weekLater);
  });

  it("survives a missing or unparseable timestamp without inventing a week", () => {
    expect(marqueeListNumber("golden-age-giants", null)).toBeNull();
    expect(marqueeListNumber("golden-age-giants", "not a date")).toBeNull();
  });
});

describe("maskListTitle", () => {
  // Pin the clock. Week 2 (starting Mon 2026-08-31 UTC) is "live" in every
  // test below; without this the live/past split would flip on the next
  // rotation and the suite would start failing on a Monday for no reason.
  const NOW = new Date("2026-09-03T12:00:00Z");
  const live = {
    title: "The Golden Age of Hollywood",
    themeSlug: "golden-age-giants",
    createdAt: "2026-08-31T12:00:00Z",
  };
  const past = { ...live, createdAt: "2026-08-24T00:00:00Z" };

  it("withholds a LIVE marquee title everywhere and names the week instead", () => {
    expect(maskListTitle(live, NOW)).toBe("Weekly Marquee #2");
    expect(maskListTitle({ ...live, surface: "browse" }, NOW)).toBe("Weekly Marquee #2");
    expect(maskListTitle({ ...live, surface: "puzzle" }, NOW)).toBe("Weekly Marquee #2");
  });

  it("reveals a PAST week on browsing surfaces — the NYT rule: yesterday's answer is public", () => {
    expect(maskListTitle(past, NOW)).toBe(past.title);
    expect(maskListTitle({ ...past, surface: "browse" }, NOW)).toBe(past.title);
  });

  it("keeps a PAST week masked on the puzzle surface, where the connection game still renders", () => {
    expect(maskListTitle({ ...past, surface: "puzzle" }, NOW)).toBe("Weekly Marquee #1");
  });

  it("fails closed when the week cannot be worked out", () => {
    // An unknown week cannot prove the puzzle is over, so it is not permission
    // to print the answer — on either surface.
    expect(maskListTitle({ ...live, createdAt: null }, NOW)).toBe("Weekly Marquee");
    expect(maskListTitle({ ...live, createdAt: "garbage" }, NOW)).toBe("Weekly Marquee");
    expect(maskListTitle({ ...live, createdAt: "garbage", surface: "puzzle" }, NOW)).toBe("Weekly Marquee");
  });

  it("treats a week in the future as live, never as over", () => {
    // Clock skew or a room saved just after the UTC flip must not reveal.
    expect(maskListTitle({ ...live, createdAt: "2026-09-07T01:00:00Z" }, NOW)).toBe("Weekly Marquee #3");
  });

  it("leaves an ordinary list title alone", () => {
    expect(maskListTitle({ title: "Best Noir", themeSlug: null, createdAt: live.createdAt }, NOW)).toBe(
      "Best Noir",
    );
    expect(maskListTitle({ title: "Best Noir" }, NOW)).toBe("Best Noir");
  });

  it("reveals when a caller explicitly opts in, regardless of week", () => {
    // `reveal` is the owner's own dashboard, finished list only.
    expect(maskListTitle({ ...live, reveal: true }, NOW)).toBe(live.title);
    expect(maskListTitle({ ...live, reveal: false }, NOW)).toBe("Weekly Marquee #2");
  });

  it("never returns a real theme title for any LIVE theme in the catalogue", () => {
    for (const theme of SHORTLIST_THEMES) {
      const shown = maskListTitle(
        { title: theme.title, themeSlug: theme.slug, createdAt: live.createdAt },
        NOW,
      );
      expect(shown, `${theme.slug} leaked its title`).not.toBe(theme.title);
      expect(shown).toMatch(/^Weekly Marquee/);
    }
  });
});
