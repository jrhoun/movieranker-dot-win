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

  it("gives the recoil long enough to read as a recoil", () => {
    // This bound exists because 240 was tried and was too short: the motion is
    // a 70px flight with a scale, a rotation and an overshoot ease, and at
    // 240ms it was reported as not happening at all. Shortening this to chase
    // "snappy" removes the feedback the tap exists to give — the earlier
    // version of this test asserted <= 280ms and encoded exactly that mistake
    // as a requirement.
    expect(MATCHUP_SETTLE_MS).toBeGreaterThanOrEqual(320);

    // Still bounded. The failure being prevented is layering delays back up:
    // the old gesture cost ~630ms (260ms interrupted motion, then a full-page
    // cross-fade) and this must stay clearly under that.
    expect(MATCHUP_SETTLE_MS).toBeLessThanOrEqual(450);
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
