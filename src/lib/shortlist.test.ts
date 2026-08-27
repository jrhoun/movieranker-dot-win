import { describe, expect, it } from "vitest";
import {
  daysSinceUtcEpoch,
  weeksSinceUtcEpoch,
  getNextWeeklyMarqueeRotation,
  pickTonightsEntry,
  tonightsShortlist,
  overlapsTheme,
} from "./shortlist";
import { SHORTLIST_THEMES } from "./shortlist-themes";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const d = (utcMs: number) => new Date(utcMs);

describe("daysSinceUtcEpoch", () => {
  it("counts whole UTC days since 1970-01-01", () => {
    expect(daysSinceUtcEpoch(d(Date.UTC(1970, 0, 1)))).toBe(0);
    expect(daysSinceUtcEpoch(d(Date.UTC(2026, 7, 24)))).toBe(20689);
  });

  it("ignores time of day and local timezone", () => {
    const noon = d(Date.UTC(2026, 7, 24, 12, 30));
    const almostNextDay = d(Date.UTC(2026, 7, 24, 23, 59, 59));
    expect(daysSinceUtcEpoch(noon)).toBe(daysSinceUtcEpoch(almostNextDay));
  });
});

describe("weeksSinceUtcEpoch", () => {
  // Known dates (UTC): Mon Aug 24 2026 = day 20689, Wed Aug 26 = 20691,
  // Thu Aug 27 = 20692, Mon Aug 31 = 20696. Weeks flip at UTC Monday midnight.
  it("anchors to ISO Monday: Wed and Thu of one calendar week share an index", () => {
    expect(weeksSinceUtcEpoch(d(Date.UTC(2026, 7, 26)))).toBe(
      weeksSinceUtcEpoch(d(Date.UTC(2026, 7, 27))),
    );
  });

  it("advances between adjacent ISO Mondays", () => {
    expect(weeksSinceUtcEpoch(d(Date.UTC(2026, 7, 31)))).toBe(
      weeksSinceUtcEpoch(d(Date.UTC(2026, 7, 24))) + 1,
    );
  });

  it("flips at UTC Monday midnight, not mid-week", () => {
    // d(3*DAY) is Sunday (still week 0), d(4*DAY) is the next Monday.
    expect(weeksSinceUtcEpoch(d(3 * DAY))).toBe(0);
    expect(weeksSinceUtcEpoch(d(4 * DAY))).toBe(1);
  });
});

describe("getNextWeeklyMarqueeRotation", () => {
  it("returns next Monday UTC midnight", () => {
    // Wed Aug 26 2026 -> next Monday is Aug 31 2026 00:00:00 UTC
    const wed = d(Date.UTC(2026, 7, 26, 15, 30));
    const nextRotation = getNextWeeklyMarqueeRotation(wed);
    expect(nextRotation.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
});

describe("pickTonightsEntry", () => {
  it("is deterministic: same week index -> same entry", () => {
    expect(pickTonightsEntry(SHORTLIST_THEMES, 2951)).toBe(
      pickTonightsEntry(SHORTLIST_THEMES, 2951),
    );
  });

  it("wraps around the pool and handles empty pools", () => {
    const pool = ["a", "b", "c"];
    expect(pickTonightsEntry(pool, 0)).toBe("a");
    expect(pickTonightsEntry(pool, 3)).toBe("a");
    expect(pickTonightsEntry(pool, -1)).toBe("c");
    expect(pickTonightsEntry([], 5)).toBeUndefined();
  });
});

describe("tonightsShortlist", () => {
  const proposals = [
    {
      slug: "community-x",
      title: "Community Pick",
      blurb: "",
      movieIds: [1, 2, 3, 4, 5, 6],
      source: "community" as const,
      proposalId: "x",
      proposedBy: "cinephile92",
    },
  ];

  it("same ISO week -> same theme; adjacent ISO weeks differ when possible", () => {
    // Hardcoded known dates: Wed Aug 26 + Thu Aug 27 2026 are one calendar
    // week; Mon Aug 24 vs Mon Aug 31 are adjacent ISO weeks.
    const wed = tonightsShortlist([], d(Date.UTC(2026, 7, 26)))!.slug;
    expect(wed).toBe(tonightsShortlist([], d(Date.UTC(2026, 7, 27)))!.slug);
    // pool length > 1, so adjacent weeks always rotate
    const monA = tonightsShortlist([], d(Date.UTC(2026, 7, 24)))!.slug;
    const monB = tonightsShortlist([], d(Date.UTC(2026, 7, 31)))!.slug;
    expect(monB).not.toBe(monA);
  });

  it("includes approved community proposals in the rotation pool", () => {
    const total = SHORTLIST_THEMES.length + proposals.length;
    let sawCommunity = false;
    for (let i = 0; i < total; i++) {
      const picked = tonightsShortlist(proposals, d(i * WEEK))!;
      if (picked.source === "community") {
        sawCommunity = true;
        expect(picked.slug).toBe("community-x");
      }
    }
    expect(sawCommunity).toBe(true);
  });

  it("cycles back to the same theme after a full rotation", () => {
    const a = tonightsShortlist([], d(0 * WEEK))!.slug;
    const b = tonightsShortlist([], d(SHORTLIST_THEMES.length * WEEK))!.slug;
    expect(a).toBe(b);
  });

  it("tags curated themes with no proposal id or proposer", () => {
    const picked = tonightsShortlist(proposals, d(0 * WEEK));
    if (picked!.source === "curated") {
      expect(picked!.proposalId).toBeNull();
      expect(picked!.proposedBy).toBeNull();
    }
    // and at least one curated day exists across the rotation
    const curated = Array.from({ length: SHORTLIST_THEMES.length + proposals.length }, (_, i) =>
      tonightsShortlist(proposals, d(i * WEEK)),
    ).filter((t) => t!.source === "curated");
    expect(curated.length).toBeGreaterThan(0);
    for (const t of curated) {
      expect(t!.proposalId).toBeNull();
      expect(t!.proposedBy).toBeNull();
    }
  });

  it("tags community picks with their proposal id and proposer handle", () => {
    const total = SHORTLIST_THEMES.length + proposals.length;
    let sawCommunity = false;
    for (let i = 0; i < total; i++) {
      const picked = tonightsShortlist(proposals, d(i * WEEK))!;
      if (picked.source === "community") {
        sawCommunity = true;
        expect(picked.proposalId).toBe("x");
        expect(picked.proposedBy).toBe("cinephile92");
      }
    }
    expect(sawCommunity).toBe(true);
  });
});

describe("overlapsTheme", () => {
  const theme = [1, 2, 3, 4, 5];

  it("is true at exactly the minimum overlap", () => {
    expect(overlapsTheme([1, 2, 3], theme)).toBe(true);
    expect(overlapsTheme([1, 2, 3], theme, 3)).toBe(true);
  });

  it("is false below the minimum overlap", () => {
    expect(overlapsTheme([1, 2], theme)).toBe(false);
    expect(overlapsTheme([1, 2, 99], theme)).toBe(false);
  });

  it("ignores duplicates and handles empty inputs", () => {
    // duplicates collapse: [1,1,2,9] touches only 2 distinct theme ids
    expect(overlapsTheme([1, 1, 2, 9], theme)).toBe(false);
    expect(overlapsTheme([1, 1, 2, 2, 3], theme)).toBe(true); // distinct: 1,2,3
    expect(overlapsTheme([7, 8, 9], theme)).toBe(false);
    expect(overlapsTheme([], theme)).toBe(false);
    expect(overlapsTheme([1, 2, 3], [])).toBe(false);
  });
});
