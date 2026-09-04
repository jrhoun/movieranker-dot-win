import { describe, expect, it } from "vitest";
import {
  isEditableElement,
  resolveBlitzAction,
  type BlitzState,
  type KeyboardEventLike,
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
