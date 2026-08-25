import { describe, expect, it } from "vitest";
import {
  daysSinceUtcEpoch,
  pickTonightsEntry,
  tonightsShortlist,
  overlapsTheme,
} from "./shortlist";
import { SHORTLIST_THEMES } from "./shortlist-themes";

const DAY = 86_400_000;
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

describe("pickTonightsEntry", () => {
  it("is deterministic: same day index -> same entry", () => {
    expect(pickTonightsEntry(SHORTLIST_THEMES, 20659)).toBe(
      pickTonightsEntry(SHORTLIST_THEMES, 20659),
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

  it("same date -> same theme; adjacent dates differ", () => {
    const date = new Date(Date.UTC(2026, 7, 24));
    const next = new Date(date.getTime() + DAY);
    expect(tonightsShortlist([], date)).toEqual(tonightsShortlist([], date));
    // pool length > 1, so adjacent days always rotate
    expect(tonightsShortlist([], date)!.slug).not.toBe(
      tonightsShortlist([], next)!.slug,
    );
  });

  it("includes approved community proposals in the rotation pool", () => {
    const total = SHORTLIST_THEMES.length + proposals.length;
    let sawCommunity = false;
    for (let i = 0; i < total; i++) {
      const picked = tonightsShortlist(proposals, d(i * DAY))!;
      if (picked.source === "community") {
        sawCommunity = true;
        expect(picked.slug).toBe("community-x");
      }
    }
    expect(sawCommunity).toBe(true);
  });

  it("cycles back to the same theme after a full rotation", () => {
    const a = tonightsShortlist([], d(0 * DAY))!.slug;
    const b = tonightsShortlist([], d(SHORTLIST_THEMES.length * DAY))!.slug;
    expect(a).toBe(b);
  });

  it("tags curated themes with no proposal id or proposer", () => {
    const picked = tonightsShortlist(proposals, d(0 * DAY));
    if (picked!.source === "curated") {
      expect(picked!.proposalId).toBeNull();
      expect(picked!.proposedBy).toBeNull();
    }
    // and at least one curated day exists across the rotation
    const curated = Array.from({ length: SHORTLIST_THEMES.length + proposals.length }, (_, i) =>
      tonightsShortlist(proposals, d(i * DAY)),
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
      const picked = tonightsShortlist(proposals, d(i * DAY))!;
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
