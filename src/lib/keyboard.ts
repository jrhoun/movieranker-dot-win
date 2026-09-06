/**
 * Pure helper and action resolver for Keyboard Blitz Duel navigation.
 */

import type { RankedMovie } from "./ranking";

export type BlitzAction =
  | { type: "vote_left"; winnerId: number; loserId: number }
  | { type: "vote_right"; winnerId: number; loserId: number }
  | { type: "park_candidate"; tmdbId: number }
  | { type: "undo" };

/**
 * A vote that arrived while the previous one was still flying out.
 *
 * THE BUG THIS EXISTS FOR. Every vote locks input for MATCHUP_SETTLE_MS (380ms
 * — matchup-timing.ts explains why that number is the animation's length and
 * not negotiable). Both input paths simply DROPPED anything pressed inside that
 * window: `resolveBlitzAction` returns null on `isSettling`, and `handleVote`
 * bails on `settlingLoserId !== null`. Measured in the browser, six keypresses
 * at 250ms intervals produced three votes. Half the input silently vanished,
 * which is the one thing a game like this can never do.
 *
 * WHY THE QUEUE STORES A SIDE AND NOT A PAIR. The obvious fix — "remember the
 * winner/loser ids and apply them when the lock lifts" — is wrong, and it is
 * worth writing down why so it is not "fixed" back. The old pair's result is
 * ALREADY DECIDED the instant the first key lands; re-applying it would either
 * double-count that matchup or do nothing. What the second keypress actually
 * expresses is a physical intent — "the left one", "the right one" — aimed at
 * whatever the stage is about to show. So the queue keeps the SIDE, and the
 * side is resolved against the pair that mounts when the timer fires.
 *
 * `kind` separates the two things a side can mean: a vote (poster tap, A/D/←/→)
 * and a skip (the "Haven't seen" button under a poster), which parks the movie
 * on that side instead of voting for it.
 *
 * The queue holds exactly ONE intent. A third key inside the same lock replaces
 * the second rather than stacking, because a queue deeper than one turns a
 * mashed keyboard into a burst of votes the player never watched — the same
 * "motion that never resolves" failure the settle timing was tuned to fix.
 */
export type PendingSide = "left" | "right";

export type PendingIntent =
  | { kind: "vote"; side: PendingSide }
  | { kind: "skip"; side: PendingSide };

export interface BlitzState {
  pair: [RankedMovie, RankedMovie] | null;
  canUndo: boolean;
  isSettling: boolean; // settlingLoserId !== null
  isFinished: boolean; // finished === true
  isConsensus: boolean; // stable && !sharpening
  isModalOpen: boolean; // exitOpen || unlockOpen || joinOpen || sheetStatus !== null
  activeMoviesCount: number; // active.length
}

export interface KeyboardEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  target?: EventTarget | null;
}

/**
 * Determines whether an element or target is an editable form input or contenteditable.
 */
export function isEditableElement(target: EventTarget | null | undefined): boolean {
  if (!target || typeof target !== "object") return false;

  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (name: string) => string | null;
  };

  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }

  if (el.isContentEditable === true) {
    return true;
  }

  if (typeof el.getAttribute === "function") {
    const attr = el.getAttribute("contenteditable");
    if (attr !== null && attr !== "false") {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether document.activeElement is an editable input or contenteditable element.
 */
export function isInputOrEditableFocused(): boolean {
  if (typeof document === "undefined" || !document.activeElement) return false;
  return isEditableElement(document.activeElement);
}

/**
 * Resolves a keyboard event into a BlitzAction or null if blocked by guards or unrecognized key.
 */
export function resolveBlitzAction(
  event: KeyboardEventLike,
  state: BlitzState
): BlitzAction | null {
  // 1. Guard against IME composition
  if (event.isComposing) {
    return null;
  }

  // 2. Guard against typing inside form controls or active editable elements
  if (isEditableElement(event.target) || isInputOrEditableFocused()) {
    return null;
  }

  // 3. Guard against modal states, settling animations, and finished states
  if (state.isModalOpen || state.isSettling || state.isFinished) {
    return null;
  }

  const key = event.key;
  const code = event.code;
  const isCtrlOrMeta = !!(event.ctrlKey || event.metaKey);
  const isAlt = !!event.altKey;
  const isShift = !!event.shiftKey;

  // 4. Undo Resolution: 'z', 'Z', 'KeyZ' (plain or with Ctrl/Cmd, but not Shift+Ctrl+Z Redo and not Alt+Z)
  const isZKey = key === "z" || key === "Z" || code === "KeyZ";
  if (isZKey && !isAlt && !isShift) {
    if (state.canUndo) {
      return { type: "undo" };
    }
    return null;
  }

  // Any remaining hotkeys require pair existence, not in consensus, no modifier keys, and active count >= 2
  if (isCtrlOrMeta || isAlt) {
    return null;
  }

  if (state.isConsensus || !state.pair || state.activeMoviesCount < 2) {
    return null;
  }

  const [leftMovie, rightMovie] = state.pair;

  // 5. Left Vote: ArrowLeft or A / a
  if (key === "ArrowLeft" || key === "a" || key === "A" || code === "KeyA") {
    return {
      type: "vote_left",
      winnerId: leftMovie.tmdbId,
      loserId: rightMovie.tmdbId,
    };
  }

  // 6. Right Vote: ArrowRight or D / d
  if (key === "ArrowRight" || key === "d" || key === "D" || code === "KeyD") {
    return {
      type: "vote_right",
      winnerId: rightMovie.tmdbId,
      loserId: leftMovie.tmdbId,
    };
  }

  return null;
}

/**
 * Which half of the stage a movie is currently occupying, or null if the movie
 * is not in this pair at all.
 *
 * The pointer paths (`onVote`, `onPark`) hand the room tmdbIds, not positions —
 * so this is how a tap gets turned into the same side vocabulary the keyboard
 * already speaks. The null case is not paranoia: an event queued against a pair
 * that has since been replaced must be discarded, not silently coerced to
 * "right" by an `=== pair[0]` check that happens to be false.
 */
export function sideOfPair(
  pair: readonly [RankedMovie, RankedMovie] | null,
  tmdbId: number,
): PendingSide | null {
  if (!pair) return null;
  if (pair[0].tmdbId === tmdbId) return "left";
  if (pair[1].tmdbId === tmdbId) return "right";
  return null;
}

/**
 * Resolves a queued side intent against the pair that has just mounted.
 *
 * This is the whole point of the queue expressed as a pure function: the caller
 * holds a side, the stage now holds a new pair, and the vote falls out of the
 * two. Returns null when there is nothing to apply, so the flush site can stay
 * a single `if`.
 */
export function resolvePendingIntent(
  intent: PendingIntent | null,
  pair: readonly [RankedMovie, RankedMovie] | null,
): BlitzAction | null {
  if (!intent || !pair) return null;
  const [leftMovie, rightMovie] = pair;

  if (intent.kind === "skip") {
    return {
      type: "park_candidate",
      tmdbId: intent.side === "left" ? leftMovie.tmdbId : rightMovie.tmdbId,
    };
  }

  return intent.side === "left"
    ? { type: "vote_left", winnerId: leftMovie.tmdbId, loserId: rightMovie.tmdbId }
    : { type: "vote_right", winnerId: rightMovie.tmdbId, loserId: leftMovie.tmdbId };
}

/**
 * Resolves a keydown that landed DURING the settle lock into a queued intent.
 *
 * Deliberately a SECOND function rather than a flag on `resolveBlitzAction`.
 * `resolveBlitzAction` returning null while settling is correct and is asserted
 * by existing tests — a key pressed mid-flight must not act on the outgoing
 * pair. This function answers a different question ("what did they mean for the
 * NEXT pair?"), and keeping the two apart means the caller cannot accidentally
 * do both with one event.
 *
 * WHAT IS NOT QUEUED, and why:
 *
 *   - UNDO. You cannot undo a vote that is still in the air; the snapshot the
 *     room would restore is mid-swap and `canUndo` is false for the duration by
 *     design. Silently deferring a Z to land on the NEXT pair would undo a
 *     different vote than the one the player was looking at. Dropped on purpose.
 *
 *   - SPACE. The task that asked for this queue assumed Space was bound to
 *     "Haven't seen". It is not, and never has been — see the "Space Key
 *     Ignored (Click-Only Haven't Seen)" tests: the spacebar is ambiguous next
 *     to a focused button, so parking is click-only. Queuing a skip on Space
 *     here would have QUIETLY ADDED A NEW HOTKEY that does nothing outside the
 *     380ms lock, which is worse than either binding it or leaving it alone.
 *     The `skip` intent is still fully supported — it just enters the queue
 *     from the pointer path, where the control actually lives.
 */
export function resolveSettlingIntent(
  event: KeyboardEventLike,
  state: BlitzState,
): PendingIntent | null {
  // Only meaningful inside the lock. Outside it, resolveBlitzAction is the
  // authority and this returning a value too would double-handle the key.
  if (!state.isSettling) return null;

  if (event.isComposing) return null;
  if (isEditableElement(event.target) || isInputOrEditableFocused()) return null;
  if (state.isModalOpen || state.isFinished) return null;
  if (state.isConsensus || !state.pair || state.activeMoviesCount < 2) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const key = event.key;
  const code = event.code;

  if (key === "ArrowLeft" || key === "a" || key === "A" || code === "KeyA") {
    return { kind: "vote", side: "left" };
  }
  if (key === "ArrowRight" || key === "d" || key === "D" || code === "KeyD") {
    return { kind: "vote", side: "right" };
  }

  return null;
}
