import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isEditableElement,
  isInputOrEditableFocused,
  resolveBlitzAction,
  type BlitzState,
  type KeyboardEventLike,
} from "./keyboard";
import type { RankedMovie } from "./ranking";

const movieA: RankedMovie = {
  tmdbId: 101,
  title: "The Godfather",
  posterPath: "/godfather.jpg",
  releaseYear: 1972,
  elo: 1200,
  comparisons: 5,
  parked: false,
};

const movieB: RankedMovie = {
  tmdbId: 102,
  title: "Pulp Fiction",
  posterPath: "/pulpfiction.jpg",
  releaseYear: 1994,
  elo: 1180,
  comparisons: 4,
  parked: false,
};

const baseActiveState: BlitzState = {
  pair: [movieA, movieB],
  canUndo: true,
  isSettling: false,
  isFinished: false,
  isConsensus: false,
  isModalOpen: false,
  activeMoviesCount: 2,
};

describe("Adversarial Stress Test: Input Focus Isolation & Guard Robustness", () => {
  const hotkeys = [
    { key: "a", desc: "lowercase 'a' (vote left)" },
    { key: "A", desc: "uppercase 'A' (vote left)" },
    { key: "Unidentified", code: "KeyA", desc: "code KeyA" },
    { key: "d", desc: "lowercase 'd' (vote right)" },
    { key: "D", desc: "uppercase 'D' (vote right)" },
    { key: "Unidentified", code: "KeyD", desc: "code KeyD" },
    { key: " ", desc: "space character (haven't seen)" },
    { key: "Space", desc: "key 'Space'" },
    { key: "Unidentified", code: "Space", desc: "code Space" },
    { key: "z", desc: "lowercase 'z' (undo)" },
    { key: "Z", desc: "uppercase 'Z' (undo)" },
    { key: "Unidentified", code: "KeyZ", desc: "code KeyZ" },
    { key: "ArrowLeft", desc: "ArrowLeft (vote left)" },
    { key: "ArrowRight", desc: "ArrowRight (vote right)" },
  ];

  const inputTargetVariations = [
    { name: "text input", target: { tagName: "INPUT", type: "text" } },
    { name: "search input", target: { tagName: "input", type: "search" } },
    { name: "email input", target: { tagName: "INPUT", type: "email" } },
    { name: "password input", target: { tagName: "INPUT", type: "password" } },
    { name: "number input", target: { tagName: "input", type: "number" } },
    { name: "textarea", target: { tagName: "TEXTAREA" } },
    { name: "lowercase textarea", target: { tagName: "textarea" } },
    { name: "select box", target: { tagName: "SELECT" } },
    { name: "lowercase select", target: { tagName: "select" } },
    { name: "contentEditable bool true", target: { tagName: "DIV", isContentEditable: true } },
    {
      name: "contenteditable attr true",
      target: {
        tagName: "SPAN",
        getAttribute: (attr: string) => (attr === "contenteditable" ? "true" : null),
      },
    },
    {
      name: "contenteditable attr empty string",
      target: {
        tagName: "SECTION",
        getAttribute: (attr: string) => (attr === "contenteditable" ? "" : null),
      },
    },
    {
      name: "contenteditable attr plaintext-only",
      target: {
        tagName: "P",
        getAttribute: (attr: string) => (attr === "contenteditable" ? "plaintext-only" : null),
      },
    },
    {
      name: "nested span inside contenteditable",
      target: {
        tagName: "SPAN",
        isContentEditable: true,
      },
    },
  ];

  for (const inputVar of inputTargetVariations) {
    for (const hk of hotkeys) {
      it(`never triggers action for hotkey ${hk.desc} when target is ${inputVar.name}`, () => {
        const event: KeyboardEventLike = {
          key: hk.key,
          code: hk.code,
          target: inputVar.target as unknown as EventTarget,
        };
        const action = resolveBlitzAction(event, baseActiveState);
        expect(action).toBeNull();
      });
    }
  }

  describe("ActiveElement focus bypass (bubbled events or window target)", () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
    });

    it("blocks hotkeys when document.activeElement is an INPUT", () => {
      const mockActiveInput = { tagName: "INPUT" } as unknown as HTMLElement;
      vi.stubGlobal("document", { activeElement: mockActiveInput });

      for (const hk of hotkeys) {
        const event: KeyboardEventLike = {
          key: hk.key,
          code: hk.code,
          target: { tagName: "BODY" } as unknown as EventTarget,
        };
        expect(resolveBlitzAction(event, baseActiveState)).toBeNull();
      }
    });

    it("blocks hotkeys when document.activeElement is a TEXTAREA", () => {
      const mockActiveTextarea = { tagName: "TEXTAREA" } as unknown as HTMLElement;
      vi.stubGlobal("document", { activeElement: mockActiveTextarea });

      for (const hk of hotkeys) {
        const event: KeyboardEventLike = {
          key: hk.key,
          code: hk.code,
          target: null,
        };
        expect(resolveBlitzAction(event, baseActiveState)).toBeNull();
      }
    });

    it("blocks hotkeys when document.activeElement is contenteditable", () => {
      const mockActiveCE = {
        tagName: "DIV",
        isContentEditable: true,
      } as unknown as HTMLElement;
      vi.stubGlobal("document", { activeElement: mockActiveCE });

      for (const hk of hotkeys) {
        const event: KeyboardEventLike = {
          key: hk.key,
          code: hk.code,
          target: { tagName: "MAIN" } as unknown as EventTarget,
        };
        expect(resolveBlitzAction(event, baseActiveState)).toBeNull();
      }
    });

    it("allows hotkeys when document.activeElement is a non-input element (e.g. BODY)", () => {
      const mockActiveBody = { tagName: "BODY" } as unknown as HTMLElement;
      vi.stubGlobal("document", { activeElement: mockActiveBody });

      const event: KeyboardEventLike = {
        key: "a",
        target: { tagName: "BODY" } as unknown as EventTarget,
      };
      expect(resolveBlitzAction(event, baseActiveState)).toEqual({
        type: "vote_left",
        winnerId: 101,
        loserId: 102,
      });
    });
  });

  describe("Fuzz Typing Simulation inside form controls", () => {
    it("simulates typing a paragraph of text into an input without triggering any blitz actions", () => {
      const sampleText =
        "The quick brown fox jumps over the lazy dog. A quick dash and a leap into the dark zone! 1234567890 !@#$%^&*() _+~";
      const inputTarget = { tagName: "INPUT" } as unknown as EventTarget;

      for (let i = 0; i < sampleText.length; i++) {
        const char = sampleText[i];
        const event: KeyboardEventLike = {
          key: char,
          target: inputTarget,
        };
        const action = resolveBlitzAction(event, baseActiveState);
        expect(action).toBeNull();
      }
    });
  });

  describe("IME Composition and Complex Modifier Matrix", () => {
    it("blocks any key during IME composition", () => {
      const compositionKeys = ["a", "d", " ", "z", "ArrowLeft", "ArrowRight", "Process", "Unidentified"];
      for (const key of compositionKeys) {
        const event: KeyboardEventLike = {
          key,
          isComposing: true,
        };
        expect(resolveBlitzAction(event, baseActiveState)).toBeNull();
      }
    });

    it("blocks votes and parks when Ctrl, Meta, or Alt is pressed", () => {
      const modifierCombos = [
        { ctrlKey: true },
        { metaKey: true },
        { altKey: true },
        { ctrlKey: true, altKey: true },
        { metaKey: true, altKey: true },
      ];

      for (const mod of modifierCombos) {
        expect(resolveBlitzAction({ key: "a", ...mod }, baseActiveState)).toBeNull();
        expect(resolveBlitzAction({ key: "d", ...mod }, baseActiveState)).toBeNull();
        expect(resolveBlitzAction({ key: " ", ...mod }, baseActiveState)).toBeNull();
        expect(resolveBlitzAction({ key: "ArrowLeft", ...mod }, baseActiveState)).toBeNull();
        expect(resolveBlitzAction({ key: "ArrowRight", ...mod }, baseActiveState)).toBeNull();
      }
    });
  });
});
