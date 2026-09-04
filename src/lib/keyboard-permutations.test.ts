import { describe, expect, it } from "vitest";
import { resolveBlitzAction, type BlitzState } from "./keyboard";
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

describe("Adversarial Permutations: Keyboard Blitz Resolution", () => {
  describe("Exhaustive 16-Modifier Combination Matrix", () => {
    const modifierCombinations = [
      { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, name: "none" },
      { ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, name: "Ctrl" },
      { ctrlKey: false, metaKey: true, altKey: false, shiftKey: false, name: "Meta" },
      { ctrlKey: false, metaKey: false, altKey: true, shiftKey: false, name: "Alt" },
      { ctrlKey: false, metaKey: false, altKey: false, shiftKey: true, name: "Shift" },
      { ctrlKey: true, metaKey: false, altKey: false, shiftKey: true, name: "Ctrl+Shift" },
      { ctrlKey: false, metaKey: true, altKey: false, shiftKey: true, name: "Meta+Shift" },
      { ctrlKey: false, metaKey: false, altKey: true, shiftKey: true, name: "Alt+Shift" },
      { ctrlKey: true, metaKey: true, altKey: false, shiftKey: false, name: "Ctrl+Meta" },
      { ctrlKey: true, metaKey: false, altKey: true, shiftKey: false, name: "Ctrl+Alt" },
      { ctrlKey: false, metaKey: true, altKey: true, shiftKey: false, name: "Meta+Alt" },
      { ctrlKey: true, metaKey: true, altKey: false, shiftKey: true, name: "Ctrl+Meta+Shift" },
      { ctrlKey: true, metaKey: false, altKey: true, shiftKey: true, name: "Ctrl+Alt+Shift" },
      { ctrlKey: false, metaKey: true, altKey: true, shiftKey: true, name: "Meta+Alt+Shift" },
      { ctrlKey: true, metaKey: true, altKey: true, shiftKey: false, name: "Ctrl+Meta+Alt" },
      { ctrlKey: true, metaKey: true, altKey: true, shiftKey: true, name: "Ctrl+Meta+Alt+Shift" },
    ];

    it("evaluates vote_left (A / ArrowLeft) against all 16 modifier combinations", () => {
      for (const mod of modifierCombinations) {
        const arrowResult = resolveBlitzAction({ key: "ArrowLeft", ...mod }, baseActiveState);
        const keyAResult = resolveBlitzAction({ key: "a", ...mod }, baseActiveState);

        const hasBlockingModifier = mod.ctrlKey || mod.metaKey || mod.altKey;
        if (hasBlockingModifier) {
          expect(arrowResult).toBeNull();
          expect(keyAResult).toBeNull();
        } else {
          expect(arrowResult).toEqual({ type: "vote_left", winnerId: 101, loserId: 102 });
          expect(keyAResult).toEqual({ type: "vote_left", winnerId: 101, loserId: 102 });
        }
      }
    });

    it("evaluates vote_right (D / ArrowRight) against all 16 modifier combinations", () => {
      for (const mod of modifierCombinations) {
        const arrowResult = resolveBlitzAction({ key: "ArrowRight", ...mod }, baseActiveState);
        const keyDResult = resolveBlitzAction({ key: "d", ...mod }, baseActiveState);

        const hasBlockingModifier = mod.ctrlKey || mod.metaKey || mod.altKey;
        if (hasBlockingModifier) {
          expect(arrowResult).toBeNull();
          expect(keyDResult).toBeNull();
        } else {
          expect(arrowResult).toEqual({ type: "vote_right", winnerId: 102, loserId: 101 });
          expect(keyDResult).toEqual({ type: "vote_right", winnerId: 102, loserId: 101 });
        }
      }
    });

    it("verifies space never accidentally triggers park candidate with any modifier", () => {
      for (const mod of modifierCombinations) {
        const spaceResult = resolveBlitzAction({ key: " ", ...mod }, baseActiveState);
        const wordSpaceResult = resolveBlitzAction({ key: "Space", ...mod }, baseActiveState);
        expect(spaceResult).toBeNull();
        expect(wordSpaceResult).toBeNull();
      }
    });

    it("evaluates undo (Z / Ctrl+Z / Cmd+Z) against all 16 modifier combinations", () => {
      for (const mod of modifierCombinations) {
        const zResult = resolveBlitzAction({ key: "z", ...mod }, baseActiveState);

        // Undo is permitted on: plain 'z', Ctrl+Z, Meta+Z, Ctrl+Meta+Z
        // But blocked on Shift (Shift+Ctrl+Z is Redo) and Alt (Alt+Z)
        if (mod.shiftKey || mod.altKey) {
          expect(zResult).toBeNull();
        } else {
          expect(zResult).toEqual({ type: "undo" });
        }
      }
    });
  });

  describe("Unknown Keys, Whitespace Variations, and Legacy Browser Keys", () => {
    it("handles whitespace variations cleanly without accidental triggers", () => {
      expect(resolveBlitzAction({ key: " " }, baseActiveState)).toBeNull();
      expect(resolveBlitzAction({ key: "Space" }, baseActiveState)).toBeNull();

      const invalidWhitespaces = [
        "\t",
        "\n",
        "\r",
        "\r\n",
        "  ",
        "\u00A0",
        "\u2000",
        "\u2003",
        "\u3000",
        "",
      ];

      for (const ws of invalidWhitespaces) {
        expect(resolveBlitzAction({ key: ws }, baseActiveState)).toBeNull();
      }
    });

    it("safely rejects exotic and functional keys", () => {
      const exoticKeys = [
        "Unidentified",
        "Dead",
        "Process",
        "Compose",
        "CapsLock",
        "NumLock",
        "ScrollLock",
        "Pause",
        "Insert",
        "Delete",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "F1",
        "F5",
        "F12",
        "PrintScreen",
        "ContextMenu",
      ];

      for (const key of exoticKeys) {
        expect(resolveBlitzAction({ key }, baseActiveState)).toBeNull();
      }
    });
  });

  describe("Exhaustive State Matrix Permutations (64 Combinations)", () => {
    it("verifies state invariant guards across all 64 state flag combinations", () => {
      const bools = [false, true];
      let testCount = 0;

      for (const canUndo of bools) {
        for (const isSettling of bools) {
          for (const isFinished of bools) {
            for (const isConsensus of bools) {
              for (const isModalOpen of bools) {
                for (const hasPair of bools) {
                  testCount++;
                  const state: BlitzState = {
                    pair: hasPair ? [movieA, movieB] : null,
                    canUndo,
                    isSettling,
                    isFinished,
                    isConsensus,
                    isModalOpen,
                    activeMoviesCount: hasPair ? 2 : 0,
                  };

                  const voteLeft = resolveBlitzAction({ key: "ArrowLeft" }, state);
                  const voteRight = resolveBlitzAction({ key: "ArrowRight" }, state);
                  const park = resolveBlitzAction({ key: " " }, state);
                  const undo = resolveBlitzAction({ key: "z" }, state);

                  const canVote =
                    !isModalOpen && !isSettling && !isFinished && !isConsensus && hasPair;

                  if (canVote) {
                    expect(voteLeft).toEqual({ type: "vote_left", winnerId: 101, loserId: 102 });
                    expect(voteRight).toEqual({ type: "vote_right", winnerId: 102, loserId: 101 });
                  } else {
                    expect(voteLeft).toBeNull();
                    expect(voteRight).toBeNull();
                  }
                  // Space is ignored (Haven't Seen is click-only)
                  expect(park).toBeNull();

                  const canPerformUndo = !isModalOpen && !isSettling && !isFinished && canUndo;
                  if (canPerformUndo) {
                    expect(undo).toEqual({ type: "undo" });
                  } else {
                    expect(undo).toBeNull();
                  }
                }
              }
            }
          }
        }
      }

      expect(testCount).toBe(64);
    });
  });
});
