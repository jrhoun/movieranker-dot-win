/**
 * Where a reader's connection-quiz result lives, and how the page hears about
 * it changing.
 *
 * The result is per-DEVICE and per-reader, not per-list — that is what lets a
 * shared marquee link open on the question for someone who has not played while
 * showing the answer to someone who has. `readConnectionOutcome` in share-text
 * parses the stored shape; this module owns the key it is stored under and the
 * event announcing a change, so no two components can disagree about either.
 */

/** localStorage key holding `{selected, revealed, correct}` for one theme. */
export function connectionStorageKey(themeSlug: string): string {
  return `mr-conn-${themeSlug}`;
}

/**
 * Fired on `window` the moment a reader reveals an answer.
 *
 * A `storage` event will not do this job: the DOM only delivers those to OTHER
 * tabs, never the one that wrote. Without an explicit announcement the page
 * heading would keep asking "what connects these films?" directly above the
 * card that had just answered it, until a reload.
 */
export const CONNECTION_REVEALED_EVENT = "mr:connection-revealed";

/** Persist a reveal and tell the rest of the page, in that order. */
export function announceConnectionRevealed(themeSlug: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(CONNECTION_REVEALED_EVENT, { detail: { themeSlug } }),
    );
  } catch {
    // CustomEvent is universally available in browsers; swallowing here only
    // guards the non-DOM case so a caller never breaks on it.
  }
}
