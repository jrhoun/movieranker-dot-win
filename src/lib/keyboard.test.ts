import { describe, expect, it } from "vitest";
import {
  isEditableElement,
  resolveBlitzAction,
  resolvePendingIntent,
  resolveSettlingIntent,
  sideOfPair,
  type BlitzState,
  type KeyboardEventLike,
  type PendingIntent,
} from "./keyboard";
import type { RankedMovie } from "./ranking";

const movieA: RankedMovie = {
  tmdbId: 101,
  title: "Inception",
  posterPath: "/inception.jpg",
  releaseYear: 2010,
  elo: 1200,
  comparisons: 5,
  parked: false,
};

const movieB: RankedMovie = {
  tmdbId: 102,
  title: "Interstellar",
  posterPath: "/interstellar.jpg",
  releaseYear: 2014,
  elo: 1180,
  comparisons: 4,
  parked: false,
};

const baseState: BlitzState = {
  pair: [movieA, movieB],
  canUndo: true,
  isSettling: false,
  isFinished: false,
  isConsensus: false,
  isModalOpen: false,
  activeMoviesCount: 2,
};

describe("resolveBlitzAction", () => {
  describe("Left Vote Hotkeys", () => {
    it("resolves ArrowLeft to vote_left", () => {
      const event: KeyboardEventLike = { key: "ArrowLeft" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_left",
        winnerId: 101,
        loserId: 102,
      });
    });

    it("resolves lowercase 'a' to vote_left", () => {
      const event: KeyboardEventLike = { key: "a" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_left",
        winnerId: 101,
        loserId: 102,
      });
    });

    it("resolves uppercase 'A' to vote_left", () => {
      const event: KeyboardEventLike = { key: "A" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_left",
        winnerId: 101,
        loserId: 102,
      });
    });

    it("resolves code 'KeyA' to vote_left", () => {
      const event: KeyboardEventLike = { key: "Unidentified", code: "KeyA" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_left",
        winnerId: 101,
        loserId: 102,
      });
    });
  });

  describe("Right Vote Hotkeys", () => {
    it("resolves ArrowRight to vote_right", () => {
      const event: KeyboardEventLike = { key: "ArrowRight" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_right",
        winnerId: 102,
        loserId: 101,
      });
    });

    it("resolves lowercase 'd' to vote_right", () => {
      const event: KeyboardEventLike = { key: "d" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_right",
        winnerId: 102,
        loserId: 101,
      });
    });

    it("resolves uppercase 'D' to vote_right", () => {
      const event: KeyboardEventLike = { key: "D" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_right",
        winnerId: 102,
        loserId: 101,
      });
    });

    it("resolves code 'KeyD' to vote_right", () => {
      const event: KeyboardEventLike = { key: "Unidentified", code: "KeyD" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({
        type: "vote_right",
        winnerId: 102,
        loserId: 101,
      });
    });
  });

  describe("Space Key Ignored (Click-Only Haven't Seen)", () => {
    it("ignores ' ' (Space character) so spacebar does not ambiguously park candidates", () => {
      const event: KeyboardEventLike = { key: " " };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toBeNull();
    });

    it("ignores 'Space' key name", () => {
      const event: KeyboardEventLike = { key: "Space" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toBeNull();
    });

    it("ignores code 'Space'", () => {
      const event: KeyboardEventLike = { key: "Unidentified", code: "Space" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toBeNull();
    });
  });

  describe("Undo Hotkey", () => {
    it("resolves 'z' to undo when canUndo is true", () => {
      const event: KeyboardEventLike = { key: "z" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({ type: "undo" });
    });

    it("resolves 'Z' to undo when canUndo is true", () => {
      const event: KeyboardEventLike = { key: "Z" };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({ type: "undo" });
    });

    it("resolves Ctrl+Z to undo", () => {
      const event: KeyboardEventLike = { key: "z", ctrlKey: true };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({ type: "undo" });
    });

    it("resolves Cmd+Z (metaKey) to undo", () => {
      const event: KeyboardEventLike = { key: "z", metaKey: true };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toEqual({ type: "undo" });
    });

    it("returns null for 'z' when canUndo is false", () => {
      const event: KeyboardEventLike = { key: "z" };
      const action = resolveBlitzAction(event, { ...baseState, canUndo: false });
      expect(action).toBeNull();
    });

    it("returns null for Shift+Ctrl+Z (Redo shortcut)", () => {
      const event: KeyboardEventLike = { key: "z", ctrlKey: true, shiftKey: true };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toBeNull();
    });

    it("returns null for Shift+Cmd+Z (Redo shortcut)", () => {
      const event: KeyboardEventLike = { key: "Z", metaKey: true, shiftKey: true };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toBeNull();
    });

    it("returns null for Alt+Z", () => {
      const event: KeyboardEventLike = { key: "z", altKey: true };
      const action = resolveBlitzAction(event, baseState);
      expect(action).toBeNull();
    });
  });

  describe("Modifier Protections (Browser Shortcuts)", () => {
    it("returns null on Ctrl+A (Select All)", () => {
      const event: KeyboardEventLike = { key: "a", ctrlKey: true };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null on Cmd+A (Select All on macOS)", () => {
      const event: KeyboardEventLike = { key: "a", metaKey: true };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null on Ctrl+D (Bookmark)", () => {
      const event: KeyboardEventLike = { key: "d", ctrlKey: true };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null on Cmd+D (Bookmark on macOS)", () => {
      const event: KeyboardEventLike = { key: "d", metaKey: true };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null on Alt+ArrowLeft (History Back)", () => {
      const event: KeyboardEventLike = { key: "ArrowLeft", altKey: true };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null on Alt+ArrowRight (History Forward)", () => {
      const event: KeyboardEventLike = { key: "ArrowRight", altKey: true };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });
  });

  describe("Focus & Form Controls Guards", () => {
    it("returns null when typing in an <input> element", () => {
      const inputTarget = { tagName: "INPUT" } as unknown as EventTarget;
      const event: KeyboardEventLike = { key: "a", target: inputTarget };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null when typing in a <textarea> element", () => {
      const textareaTarget = { tagName: "TEXTAREA" } as unknown as EventTarget;
      const event: KeyboardEventLike = { key: "ArrowLeft", target: textareaTarget };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null when typing in a <select> element", () => {
      const selectTarget = { tagName: "SELECT" } as unknown as EventTarget;
      const event: KeyboardEventLike = { key: "d", target: selectTarget };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null when typing in contenteditable element", () => {
      const ceTarget = {
        tagName: "DIV",
        isContentEditable: true,
      } as unknown as EventTarget;
      const event: KeyboardEventLike = { key: " ", target: ceTarget };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null when typing in element with contenteditable attribute", () => {
      const ceAttrTarget = {
        tagName: "DIV",
        getAttribute: (name: string) => (name === "contenteditable" ? "true" : null),
      } as unknown as EventTarget;
      const event: KeyboardEventLike = { key: "z", target: ceAttrTarget };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });

    it("returns null when IME composition is active (isComposing: true)", () => {
      const event: KeyboardEventLike = { key: "a", isComposing: true };
      expect(resolveBlitzAction(event, baseState)).toBeNull();
    });
  });

  describe("State Guards", () => {
    it("returns null when a modal is open (isModalOpen: true)", () => {
      const event: KeyboardEventLike = { key: "a" };
      expect(resolveBlitzAction(event, { ...baseState, isModalOpen: true })).toBeNull();
    });

    it("returns null when settling animations are running (isSettling: true)", () => {
      const event: KeyboardEventLike = { key: "ArrowLeft" };
      expect(resolveBlitzAction(event, { ...baseState, isSettling: true })).toBeNull();
    });

    it("returns null when dueling is finished (isFinished: true)", () => {
      const event: KeyboardEventLike = { key: "d" };
      expect(resolveBlitzAction(event, { ...baseState, isFinished: true })).toBeNull();
    });

    it("returns null when ranking is in consensus (isConsensus: true)", () => {
      const event: KeyboardEventLike = { key: "ArrowRight" };
      expect(resolveBlitzAction(event, { ...baseState, isConsensus: true })).toBeNull();
    });

    it("returns null when pair is null", () => {
      const event: KeyboardEventLike = { key: "a" };
      expect(resolveBlitzAction(event, { ...baseState, pair: null })).toBeNull();
    });

    it("returns null when activeMoviesCount < 2", () => {
      const event: KeyboardEventLike = { key: "a" };
      expect(resolveBlitzAction(event, { ...baseState, activeMoviesCount: 1 })).toBeNull();
    });

    it("returns null for unrelated keys (e.g. 'x', 'Escape', 'Enter')", () => {
      expect(resolveBlitzAction({ key: "x" }, baseState)).toBeNull();
      expect(resolveBlitzAction({ key: "Escape" }, baseState)).toBeNull();
      expect(resolveBlitzAction({ key: "Enter" }, baseState)).toBeNull();
      expect(resolveBlitzAction({ key: "Tab" }, baseState)).toBeNull();
    });
  });
});

describe("isEditableElement", () => {
  it("returns false for null or non-objects", () => {
    expect(isEditableElement(null)).toBe(false);
    expect(isEditableElement(undefined as unknown as EventTarget)).toBe(false);
    expect(isEditableElement("string" as unknown as EventTarget)).toBe(false);
  });

  it("returns true for input, textarea, select elements", () => {
    expect(isEditableElement({ tagName: "input" } as unknown as EventTarget)).toBe(true);
    expect(isEditableElement({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isEditableElement({ tagName: "textarea" } as unknown as EventTarget)).toBe(true);
    expect(isEditableElement({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isEditableElement({ tagName: "select" } as unknown as EventTarget)).toBe(true);
    expect(isEditableElement({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
  });

  it("returns false for ordinary elements like div, button, span", () => {
    expect(isEditableElement({ tagName: "DIV" } as unknown as EventTarget)).toBe(false);
    expect(isEditableElement({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(isEditableElement({ tagName: "SPAN" } as unknown as EventTarget)).toBe(false);
  });

  it("returns true for contenteditable elements", () => {
    expect(isEditableElement({ isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(
      isEditableElement({
        getAttribute: (attr: string) => (attr === "contenteditable" ? "true" : null),
      } as unknown as EventTarget)
    ).toBe(true);
    expect(
      isEditableElement({
        getAttribute: (attr: string) => (attr === "contenteditable" ? "false" : null),
      } as unknown as EventTarget)
    ).toBe(false);
  });
});

/*
 * THE SETTLE QUEUE. These cover the semantics the room relies on to stop
 * dropping fast input: a key pressed inside the 380ms lock becomes a SIDE, and
 * that side is resolved against the pair that mounts next — never against the
 * outgoing pair, whose result is already decided.
 */

// A second pair, used to prove the queued side is resolved against the NEW
// movies rather than the ones that were on screen when the key was pressed.
const movieC: RankedMovie = {
  tmdbId: 201,
  title: "Heat",
  posterPath: "/heat.jpg",
  releaseYear: 1995,
  elo: 1210,
  comparisons: 3,
  parked: false,
};

const movieD: RankedMovie = {
  tmdbId: 202,
  title: "The Insider",
  posterPath: "/insider.jpg",
  releaseYear: 1999,
  elo: 1190,
  comparisons: 3,
  parked: false,
};

const settlingState: BlitzState = { ...baseState, isSettling: true };

describe("sideOfPair", () => {
  it("maps the left movie to 'left' and the right movie to 'right'", () => {
    expect(sideOfPair([movieA, movieB], 101)).toBe("left");
    expect(sideOfPair([movieA, movieB], 102)).toBe("right");
  });

  it("returns null for a movie that is not in the pair, rather than guessing", () => {
    expect(sideOfPair([movieA, movieB], 999)).toBeNull();
  });

  it("returns null when there is no pair", () => {
    expect(sideOfPair(null, 101)).toBeNull();
  });
});

describe("resolvePendingIntent", () => {
  it("resolves a queued left side against the NEW pair, not the old one", () => {
    const intent: PendingIntent = { kind: "vote", side: "left" };
    expect(resolvePendingIntent(intent, [movieC, movieD])).toEqual({
      type: "vote_left",
      winnerId: 201,
      loserId: 202,
    });
  });

  it("resolves a queued right side against the NEW pair", () => {
    const intent: PendingIntent = { kind: "vote", side: "right" };
    expect(resolvePendingIntent(intent, [movieC, movieD])).toEqual({
      type: "vote_right",
      winnerId: 202,
      loserId: 201,
    });
  });

  it("never replays the pair that was on screen when the key was pressed", () => {
    const action = resolvePendingIntent({ kind: "vote", side: "left" }, [movieC, movieD]);
    expect(action).not.toBeNull();
    if (action && "winnerId" in action) {
      expect([action.winnerId, action.loserId]).not.toContain(movieA.tmdbId);
      expect([action.winnerId, action.loserId]).not.toContain(movieB.tmdbId);
    }
  });

  it("resolves a queued skip to parking the movie on that side of the new pair", () => {
    expect(resolvePendingIntent({ kind: "skip", side: "left" }, [movieC, movieD])).toEqual({
      type: "park_candidate",
      tmdbId: 201,
    });
    expect(resolvePendingIntent({ kind: "skip", side: "right" }, [movieC, movieD])).toEqual({
      type: "park_candidate",
      tmdbId: 202,
    });
  });

  it("returns null when nothing is queued or no pair mounted", () => {
    expect(resolvePendingIntent(null, [movieC, movieD])).toBeNull();
    expect(resolvePendingIntent({ kind: "vote", side: "left" }, null)).toBeNull();
  });
});

describe("resolveSettlingIntent", () => {
  it("queues a left side for every left hotkey", () => {
    for (const event of [
      { key: "ArrowLeft" },
      { key: "a" },
      { key: "A" },
      { code: "KeyA", key: "Unidentified" },
    ] as KeyboardEventLike[]) {
      expect(resolveSettlingIntent(event, settlingState)).toEqual({ kind: "vote", side: "left" });
    }
  });

  it("queues a right side for every right hotkey", () => {
    for (const event of [
      { key: "ArrowRight" },
      { key: "d" },
      { key: "D" },
      { code: "KeyD", key: "Unidentified" },
    ] as KeyboardEventLike[]) {
      expect(resolveSettlingIntent(event, settlingState)).toEqual({ kind: "vote", side: "right" });
    }
  });

  it("does not look at the pair — the same key queues the same side either way", () => {
    const otherPair: BlitzState = { ...settlingState, pair: [movieC, movieD] };
    expect(resolveSettlingIntent({ key: "d" }, settlingState)).toEqual(
      resolveSettlingIntent({ key: "d" }, otherPair),
    );
  });

  it("ignores undo mid-flight — you cannot undo a vote that is still animating", () => {
    expect(resolveSettlingIntent({ key: "z" }, settlingState)).toBeNull();
    expect(resolveSettlingIntent({ key: "Z", ctrlKey: true }, settlingState)).toBeNull();
  });

  it("ignores Space, which is not a hotkey outside the lock either", () => {
    expect(resolveSettlingIntent({ key: " " }, settlingState)).toBeNull();
    expect(resolveSettlingIntent({ key: "Space" }, settlingState)).toBeNull();
  });

  it("returns null when not settling, so a key is never handled twice", () => {
    expect(resolveSettlingIntent({ key: "a" }, baseState)).toBeNull();
  });

  it("respects the same guards as resolveBlitzAction", () => {
    expect(resolveSettlingIntent({ key: "a", isComposing: true }, settlingState)).toBeNull();
    expect(
      resolveSettlingIntent(
        { key: "a", target: { tagName: "INPUT" } as unknown as EventTarget },
        settlingState,
      ),
    ).toBeNull();
    expect(resolveSettlingIntent({ key: "a" }, { ...settlingState, isModalOpen: true })).toBeNull();
    expect(resolveSettlingIntent({ key: "a" }, { ...settlingState, isFinished: true })).toBeNull();
    expect(resolveSettlingIntent({ key: "a" }, { ...settlingState, isConsensus: true })).toBeNull();
    expect(resolveSettlingIntent({ key: "a" }, { ...settlingState, pair: null })).toBeNull();
    expect(
      resolveSettlingIntent({ key: "a" }, { ...settlingState, activeMoviesCount: 1 }),
    ).toBeNull();
  });

  it("ignores browser shortcuts so Ctrl+A / Cmd+D never enter the queue", () => {
    expect(resolveSettlingIntent({ key: "a", ctrlKey: true }, settlingState)).toBeNull();
    expect(resolveSettlingIntent({ key: "a", metaKey: true }, settlingState)).toBeNull();
    expect(resolveSettlingIntent({ key: "d", altKey: true }, settlingState)).toBeNull();
  });

  it("a burst inside one lock collapses to the LAST intent (cap of one)", () => {
    // The room stores the result of each call in a single ref, so this models
    // the room's own write: three keys in, one queued side out.
    let queued: PendingIntent | null = null;
    for (const key of ["a", "d", "a"]) {
      const intent = resolveSettlingIntent({ key }, settlingState);
      if (intent) queued = intent;
    }
    expect(queued).toEqual({ kind: "vote", side: "left" });
  });
});
