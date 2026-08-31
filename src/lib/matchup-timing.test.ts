import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MATCHUP_SETTLE_MS } from "./matchup-timing";

/**
 * The regression this pins: `handleVote` swapped the next pair in at 260ms
 * while the CSS flight animations ran 380ms, so every vote mounted a new pair
 * on top of two cards still visibly in motion. Nothing failed — no error, no
 * broken test, no type complaint. The animation just stopped resolving, and
 * the only symptom was that it felt wrong.
 *
 * Two numbers in two languages with no reason to agree is the whole failure
 * mode, so the test reads the real stylesheet rather than trusting a comment.
 */
describe("matchup animation timing", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  /** Every duration on a vote animation, as declared in globals.css. */
  const durations = [
    "hit-right",
    "recoil-right",
    "hit-left",
    "recoil-left",
    "winner-poster-glow",
  ].map((name) => {
    const m = new RegExp(`animation:\\s*${name}\\s+(\\d+)ms`).exec(css);
    return { name, ms: m ? Number(m[1]) : null };
  });

  it("declares a duration for every vote animation", () => {
    // If a rename made one unmatchable, the checks below would pass on an empty
    // set and this suite would guard nothing.
    for (const d of durations) {
      expect(d.ms, `no animation duration found for ${d.name} in globals.css`).not.toBeNull();
    }
  });

  it("swaps the next pair exactly when the animation ends", () => {
    // The heart of it. Swapping early cuts the motion off mid-flight; swapping
    // late leaves a settled, empty stage waiting.
    for (const d of durations) {
      expect(
        d.ms,
        `${d.name} runs ${d.ms}ms but the pair swaps at ${MATCHUP_SETTLE_MS}ms — the animation is cut off mid-flight`,
      ).toBe(MATCHUP_SETTLE_MS);
    }
  });

  it("keeps the whole gesture inside a snappy budget", () => {
    // Ranking is a long sequence of taps and this delay is paid on every one.
    // 380ms plus a full-page cross-fade was the "laggy" half of the report.
    expect(MATCHUP_SETTLE_MS).toBeLessThanOrEqual(280);
    // Fast enough to feel instant is not the goal either — the recoil has to
    // be legible as a recoil.
    expect(MATCHUP_SETTLE_MS).toBeGreaterThanOrEqual(160);
  });

  it("does not layer a full-page view transition over the vote", () => {
    // startViewTransition with no view-transition-name anywhere cross-fades the
    // ENTIRE page — sticky header, progress bar, VS divider — on every vote,
    // over the top of the recoil. That soft dissolve was the other half of
    // "not crisp". Reinstating it needs named transitions first.
    const playRoom = readFileSync(join(process.cwd(), "src/app/r/play/play-room.tsx"), "utf8");
    // A CALL, not a mention — the comment explaining why this is gone names it,
    // and a bare substring match flagged that as the bug it warns about.
    const usesViewTransition = /startViewTransition\s*\(/.test(playRoom);
    const hasNamedTransitions = /view-transition-name/.test(css);
    expect(
      usesViewTransition && !hasNamedTransitions,
      "play-room calls startViewTransition but nothing declares a view-transition-name, so the whole page cross-fades on every vote",
    ).toBe(false);
  });
});
