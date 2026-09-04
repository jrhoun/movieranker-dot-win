/**
 * Pure helper and action resolver for Keyboard Blitz Duel navigation.
 */

import type { RankedMovie } from "./ranking";

export type BlitzAction =
  | { type: "vote_left"; winnerId: number; loserId: number }
  | { type: "vote_right"; winnerId: number; loserId: number }
  | { type: "park_candidate"; tmdbId: number }
  | { type: "undo" };

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
