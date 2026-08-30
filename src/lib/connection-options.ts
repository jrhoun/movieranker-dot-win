/**
 * Presentation order for the weekly-marquee connection quiz.
 *
 * WHY THIS EXISTS: every theme in shortlist-themes.ts authors its answer at
 * correctIndex 0, and the generated fallback game does too. Rendered in authored
 * order, the answer is ALWAYS option A — one observation and the quiz is solved
 * forever, in every week, for everyone.
 *
 * WHY DETERMINISTIC RATHER THAN RANDOM: the quiz is server-rendered before it
 * hydrates. A Math.random() order would differ between the server's HTML and the
 * client's first render, which React reports as a hydration mismatch and repairs
 * by throwing the markup away. Seeding from the theme slug gives a stable order
 * for a given week that still moves the answer around from week to week, which
 * is all that is needed to kill the positional tell.
 *
 * Everyone sees the same order in a given week. That is not a weakness: the
 * answer itself is equally shareable, and /api/marquee-solve caps each user at
 * one attempt regardless.
 */

import { hashString, mulberry32 } from "./seeded-random";

export interface ShuffledOption {
  option: string;
  /**
   * Index into the authored options array. This — never the display position —
   * is what gets stored and sent to the API, so scoring stays correct no matter
   * how the order changes.
   */
  originalIndex: number;
}

/**
 * The quiz options in display order, each carrying the authored index it came
 * from. Stable for a given slug; empty in, empty out.
 */
export function shuffledOptions(slug: string, options: string[]): ShuffledOption[] {
  const entries: ShuffledOption[] = options.map((option, originalIndex) => ({
    option,
    originalIndex,
  }));
  const random = mulberry32(hashString(slug));
  // Fisher-Yates, back to front.
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  return entries;
}
