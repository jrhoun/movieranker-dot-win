/**
 * Share-text formatter. The ONLY place share copy is assembled.
 *
 * THE SPOILER RULE: for a marquee share (themeSlug set), the theme title, the
 * theme blurb and the connection answer must never appear in the output. The
 * weekly Marquee's appeal is the puzzle; a share that names the theme hands the
 * answer to everyone who has not played. See the curation doctrine in
 * ./shortlist-themes.ts. This module is never given the connection answer text
 * at all — what is not passed cannot leak.
 *
 * The marquee share shows the podium but withholds the theme, inverting the
 * reverted c3d48db format: the post becomes the puzzle ("what connects these?")
 * rather than the answer key.
 *
 * THE TRUTHFULNESS RULE: readConnectionOutcome never upgrades ambiguity into a
 * stronger claim. Unknown, legacy or malformed storage yields "revealed" or
 * "unplayed", never "solved".
 */

export type ConnectionOutcome = "solved" | "missed" | "revealed" | "unplayed";

export interface ShareMovie {
  title: string;
}

export interface ShareTextInput {
  /** List title. For a marquee share this is the THEME title — never emitted. */
  title: string;
  /** Absolute share URL. Always the last line of the output. */
  url: string;
  /** Non-empty when the list came from a weekly marquee theme. */
  themeSlug?: string | null;
  /** Human-facing marquee counter from marqueeNumber(). */
  marqueeNumber?: number | null;
  /** Ranked films, best first. At most the first three are used. */
  topMovies?: ShareMovie[];
  /** Total films in the list. */
  totalMovies?: number | null;
  /** List owner's public handle, without the "@". */
  curatorHandle?: string | null;
  /** Only meaningful for a marquee share; ignored otherwise. */
  connection?: ConnectionOutcome;
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

const CONNECTION_LINES: Record<ConnectionOutcome, string | null> = {
  solved: "Cracked it 🟩",
  missed: "Missed it ⬛",
  revealed: "Peeked ⬜",
  unplayed: null,
};

/**
 * Parses localStorage["mr-conn-<slug>"] into an outcome.
 * Shape: { selected: number|null, revealed: boolean, correct?: boolean }.
 * `correct` is absent on entries written before it was added — those degrade to
 * "revealed" so a share never claims a solve that was not recorded.
 */
export function readConnectionOutcome(raw: string | null): ConnectionOutcome {
  if (!raw) return "unplayed";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "unplayed";
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return "unplayed";
  const state = parsed as { selected?: unknown; revealed?: unknown; correct?: unknown };
  if (state.revealed !== true) return "unplayed";
  // Skipped to the answer without guessing.
  if (state.selected === null || state.selected === undefined) return "revealed";
  if (state.correct === true) return "solved";
  if (state.correct === false) return "missed";
  // Legacy entry: a guess happened but correctness was never stored.
  return "revealed";
}

/** Joins sections into a block: one blank line between, none trailing. */
function assemble(sections: (string | null)[][]): string {
  return sections
    .map((lines) => lines.filter((l): l is string => l !== null && l !== ""))
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join("\n"))
    .join("\n\n");
}

export function formatShareText(input: ShareTextInput): string {
  const { title, url, themeSlug, marqueeNumber, totalMovies, curatorHandle, connection } = input;
  const top = (input.topMovies ?? []).slice(0, 3);

  // 1. Marquee: theme title withheld; the post is the puzzle.
  if (themeSlug) {
    const header = marqueeNumber
      ? `MovieRanker ✦ Weekly Marquee #${marqueeNumber}`
      : "MovieRanker ✦ Weekly Marquee";
    const thread =
      typeof totalMovies === "number"
        ? `One thread runs through all ${totalMovies}.`
        : "One thread runs through them all.";
    return assemble([
      [header],
      top.map((m, i) => `${MEDALS[i]} ${m.title}`),
      [thread, connection ? CONNECTION_LINES[connection] : null],
      [url],
    ]);
  }

  // 2. Personal list: title is safe to show.
  if (top.length > 0) {
    const attribution = curatorHandle
      ? `Ranked by @${curatorHandle} on MovieRanker`
      : "Ranked on MovieRanker";
    return assemble([
      [title, attribution],
      top.map((m, i) => `${i + 1}. ${m.title}`),
      [typeof totalMovies === "number" ? `${totalMovies} films ranked` : null],
      [url],
    ]);
  }

  // 3. Minimal: versus pages and anything without a podium.
  return assemble([[title], [url]]);
}
