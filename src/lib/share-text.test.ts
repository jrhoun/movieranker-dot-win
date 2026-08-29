import { describe, expect, it } from "vitest";
import { formatShareText, readConnectionOutcome } from "./share-text";

const THREE = [{ title: "Darkman" }, { title: "The Elephant Man" }, { title: "Vice" }];

const MARQUEE_INPUT = {
  // For a marquee share this is the THEME title and must never be emitted.
  title: "Best Hairpieces & Prosthetics",
  themeSlug: "best-hairpieces",
  marqueeNumber: 1,
  topMovies: THREE,
  totalMovies: 7,
  connection: "solved" as const,
  url: "https://www.movieranker.win/l/abc123",
};

describe("formatShareText — THE SPOILER RULE", () => {
  // These tests exist because a previous implementation (commit c3d48db,
  // reverted) leaked the theme title and the solve state together, spoiling
  // the week's puzzle for anyone reading the post. Do not delete them.

  it("never emits the theme title for a marquee share", () => {
    const out = formatShareText(MARQUEE_INPUT);
    expect(out).not.toContain("Best Hairpieces & Prosthetics");
    expect(out).not.toContain("Hairpieces");
    expect(out).not.toContain("Prosthetics");
  });

  it("never emits the theme slug for a marquee share", () => {
    expect(formatShareText(MARQUEE_INPUT)).not.toContain("best-hairpieces");
  });

  it("withholds the theme title for every connection outcome", () => {
    for (const connection of ["solved", "missed", "revealed", "unplayed"] as const) {
      const out = formatShareText({ ...MARQUEE_INPUT, connection });
      expect(out, `leaked for outcome ${connection}`).not.toContain("Hairpieces");
    }
  });

  it("still shows the podium — the films are the hook, the connection is the secret", () => {
    const out = formatShareText(MARQUEE_INPUT);
    expect(out).toContain("Darkman");
    expect(out).toContain("The Elephant Man");
    expect(out).toContain("Vice");
  });
});

describe("formatShareText — marquee format", () => {
  it("renders the full marquee share exactly", () => {
    expect(formatShareText(MARQUEE_INPUT)).toBe(
      [
        "MovieRanker ✦ Weekly Marquee #1",
        "",
        "🥇 Darkman",
        "🥈 The Elephant Man",
        "🥉 Vice",
        "",
        "One thread runs through all 7.",
        "Cracked it 🟩",
        "",
        "https://www.movieranker.win/l/abc123",
      ].join("\n"),
    );
  });

  it("uses the generic header when no marquee number is given", () => {
    expect(formatShareText({ ...MARQUEE_INPUT, marqueeNumber: null }).split("\n")[0]).toBe(
      "MovieRanker ✦ Weekly Marquee",
    );
  });

  it("renders each connection outcome's line", () => {
    const line = (connection: "solved" | "missed" | "revealed" | "unplayed") =>
      formatShareText({ ...MARQUEE_INPUT, connection })
        .split("\n")
        .find((l) => /^(Cracked|Missed|Peeked)/.test(l)) ?? null;

    expect(line("solved")).toBe("Cracked it 🟩");
    expect(line("missed")).toBe("Missed it ⬛");
    expect(line("revealed")).toBe("Peeked ⬜");
    expect(line("unplayed")).toBe(null);
  });

  it("omits the connection line entirely when unplayed", () => {
    expect(formatShareText({ ...MARQUEE_INPUT, connection: "unplayed" })).toBe(
      [
        "MovieRanker ✦ Weekly Marquee #1",
        "",
        "🥇 Darkman",
        "🥈 The Elephant Man",
        "🥉 Vice",
        "",
        "One thread runs through all 7.",
        "",
        "https://www.movieranker.win/l/abc123",
      ].join("\n"),
    );
  });

  it("omits the connection line when the field is absent", () => {
    const noConnection = { ...MARQUEE_INPUT, connection: undefined };
    expect(formatShareText(noConnection)).not.toMatch(/Cracked|Missed|Peeked/);
  });

  it("falls back to a countless thread line when totalMovies is absent", () => {
    const out = formatShareText({ ...MARQUEE_INPUT, totalMovies: null });
    expect(out).toContain("One thread runs through them all.");
    expect(out).not.toContain("all null");
  });

  it("uses only as many medals as there are films", () => {
    const out = formatShareText({ ...MARQUEE_INPUT, topMovies: [{ title: "Solo" }], totalMovies: 1 });
    expect(out).toContain("🥇 Solo");
    expect(out).not.toContain("🥈");
    expect(out).not.toContain("🥉");
  });

  it("never lists more than three films", () => {
    const out = formatShareText({
      ...MARQUEE_INPUT,
      topMovies: [...THREE, { title: "Fourth Film" }, { title: "Fifth Film" }],
    });
    expect(out).not.toContain("Fourth Film");
    expect(out).not.toContain("Fifth Film");
  });
});

describe("formatShareText — personal list format", () => {
  const PERSONAL = {
    title: "Best Sci-Fi of the 90s",
    topMovies: THREE,
    totalMovies: 12,
    curatorHandle: "jrhoun",
    url: "https://www.movieranker.win/l/xyz789",
  };

  it("renders the full personal share exactly", () => {
    expect(formatShareText(PERSONAL)).toBe(
      [
        "Best Sci-Fi of the 90s",
        "Ranked by @jrhoun on MovieRanker",
        "",
        "1. Darkman",
        "2. The Elephant Man",
        "3. Vice",
        "",
        "12 films ranked",
        "",
        "https://www.movieranker.win/l/xyz789",
      ].join("\n"),
    );
  });

  it("shows the list title — a personal list has no puzzle to spoil", () => {
    expect(formatShareText(PERSONAL)).toContain("Best Sci-Fi of the 90s");
  });

  it("drops the handle from the attribution when there is none", () => {
    const out = formatShareText({ ...PERSONAL, curatorHandle: null });
    expect(out.split("\n")[1]).toBe("Ranked on MovieRanker");
    expect(out).not.toContain("@");
  });

  it("omits the count line when totalMovies is absent", () => {
    expect(formatShareText({ ...PERSONAL, totalMovies: null })).not.toContain("films ranked");
  });

  it("uses numerals, not medals", () => {
    const out = formatShareText(PERSONAL);
    expect(out).toContain("1. Darkman");
    expect(out).not.toContain("🥇");
  });

  it("ignores a connection outcome on a non-marquee list", () => {
    expect(formatShareText({ ...PERSONAL, connection: "solved" })).not.toContain("Cracked");
  });
});

describe("formatShareText — minimal format", () => {
  it("renders title and url when there are no movies (versus page)", () => {
    expect(
      formatShareText({
        title: "The Vault vs Sarah's Picks",
        url: "https://www.movieranker.win/compare/a/b",
      }),
    ).toBe(["The Vault vs Sarah's Picks", "", "https://www.movieranker.win/compare/a/b"].join("\n"));
  });

  it("treats an empty topMovies array as no movies", () => {
    expect(formatShareText({ title: "Empty", topMovies: [], url: "https://x.test/1" })).toBe(
      ["Empty", "", "https://x.test/1"].join("\n"),
    );
  });
});

describe("readConnectionOutcome — THE TRUTHFULNESS RULE", () => {
  // Ambiguous or unreadable storage must degrade to the WEAKER claim.
  const json = (o: unknown) => JSON.stringify(o);

  it("reports solved only when correctness was recorded as true", () => {
    expect(readConnectionOutcome(json({ selected: 0, revealed: true, correct: true }))).toBe("solved");
  });

  it("reports missed for a recorded wrong guess", () => {
    expect(readConnectionOutcome(json({ selected: 2, revealed: true, correct: false }))).toBe("missed");
  });

  it("reports revealed when the player skipped without guessing", () => {
    expect(readConnectionOutcome(json({ selected: null, revealed: true, correct: false }))).toBe("revealed");
  });

  it("reports unplayed when nothing is stored", () => {
    expect(readConnectionOutcome(null)).toBe("unplayed");
  });

  it("reports unplayed when the answer has not been revealed", () => {
    expect(readConnectionOutcome(json({ selected: null, revealed: false }))).toBe("unplayed");
  });

  it("degrades legacy entries without a correct field to revealed, never solved", () => {
    // Written before Task 2 existed: a guess was made but correctness is unknown.
    expect(readConnectionOutcome(json({ selected: 1, revealed: true }))).toBe("revealed");
  });

  it("degrades malformed JSON to unplayed rather than throwing", () => {
    expect(readConnectionOutcome("{not json")).toBe("unplayed");
    expect(readConnectionOutcome("")).toBe("unplayed");
  });

  it("degrades unexpected shapes to unplayed", () => {
    expect(readConnectionOutcome(json(["nope"]))).toBe("unplayed");
    expect(readConnectionOutcome(json(null))).toBe("unplayed");
    expect(readConnectionOutcome(json(42))).toBe("unplayed");
  });
});

describe("formatShareText — invariants across every format", () => {
  const CASES: Parameters<typeof formatShareText>[0][] = [
    MARQUEE_INPUT,
    { ...MARQUEE_INPUT, connection: "unplayed", marqueeNumber: null, totalMovies: null },
    { title: "P", topMovies: THREE, totalMovies: 3, curatorHandle: "a", url: "https://x.test/2" },
    { title: "M", url: "https://x.test/3" },
  ];

  it("never ends with a newline", () => {
    for (const c of CASES) expect(formatShareText(c).endsWith("\n")).toBe(false);
  });

  it("never contains two consecutive blank lines", () => {
    for (const c of CASES) expect(formatShareText(c)).not.toContain("\n\n\n");
  });

  it("ends with the url as the final line", () => {
    for (const c of CASES) {
      const lines = formatShareText(c).split("\n");
      expect(lines[lines.length - 1]).toBe(c.url);
    }
  });

  it("has no trailing whitespace on any line", () => {
    for (const c of CASES) {
      for (const line of formatShareText(c).split("\n")) expect(line).toBe(line.trimEnd());
    }
  });
});
