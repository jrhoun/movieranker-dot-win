"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { announceConnectionRevealed, connectionStorageKey } from "@/lib/connection-state";
import { shuffledOptions } from "@/lib/connection-options";
import { CONNECTION_SOLVE_XP } from "@/lib/gamification";
import type { ThemeConnectionGame } from "@/lib/shortlist-themes";

interface MarqueeConnectionGameProps {
  themeSlug: string;
  /** Human marquee counter, for the header. NOT the theme title — see below. */
  marqueeNumber?: number | null;
  game: ThemeConnectionGame;
  /**
   * True only when the viewer has just been redirected here from finishing the
   * ranking. Drives the congratulations modal; a later visit shows the card
   * inline instead.
   */
  justFinished?: boolean;
  /**
   * The theme title, shown ONLY after the answer is revealed. The page hides it
   * everywhere else because it paraphrases the answer — so this is the one
   * place it can safely appear, and it is what tells the player which week they
   * just cracked.
   */
  revealTitle?: string | null;
  onBonusEarned?: (xp: number) => void;
  className?: string;
}

interface GameState {
  /**
   * The AUTHORED option index, never the on-screen position. The buttons are
   * shuffled for display, so storing a display position would score old saved
   * answers against the wrong option and would break the moment the order
   * changed.
   */
  selected: number | null;
  revealed: boolean;
  /** Whether the guess was right. Absent on entries written before this field existed. */
  correct?: boolean;
}

export default function MarqueeConnectionGame({
  themeSlug,
  marqueeNumber,
  game,
  justFinished = false,
  revealTitle,
  onBonusEarned,
  className = "",
}: MarqueeConnectionGameProps) {
  const storageKey = connectionStorageKey(themeSlug);
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window === "undefined") return { selected: null, revealed: false };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as GameState;
    } catch {
      // ignore
    }
    return { selected: null, revealed: false };
  });
  // Resolved ONCE, in a lazy initializer, for two reasons: a later prop change
  // must not yank the modal away mid-answer, and the modal has to stay open
  // after a guess so the reveal can be read — so it cannot simply derive from
  // `revealed`.
  const [modalOpen, setModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!justFinished) return false;
    try {
      return localStorage.getItem(storageKey) === null;
    } catch {
      return true;
    }
  });

  const dialogRef = useRef<HTMLDialogElement>(null);

  const { selected, revealed } = gameState;

  // showModal() rather than an `open` attribute: only the former puts the
  // dialog in the top layer, which is what makes it immune to an ancestor's
  // overflow, transform or stacking context. Escape, the focus trap and the
  // inert background all come with it, so the old keydown listener is gone.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (modalOpen && !el.open) el.showModal();
    if (!modalOpen && el.open) el.close();
  }, [modalOpen]);

  // Display order. Every authored game puts its answer at index 0, so without
  // this the answer is always button A. See lib/connection-options.ts.
  const options = useMemo(
    () => shuffledOptions(themeSlug, game.options),
    [themeSlug, game.options],
  );

  /**
   * Tells the server this attempt happened. `guessIndex` is null for a peek,
   * and is always the AUTHORED index, which is what the API scores against.
   *
   * Every outcome is reported, not just wins. The server records only the FIRST
   * attempt per theme, so staying silent about a wrong guess would leave the
   * try unspent — clear localStorage and you could come back and claim the
   * badge on a second go. Fire-and-forget: a signed-out user gets a 401 and
   * simply earns no badge.
   */
  function recordAttempt(guessIndex: number | null) {
    void fetch("/api/marquee-solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeSlug, guessIndex }),
    }).catch(() => {
      // Offline or blocked: the local state still stands; the badge just waits
      // until an attempt is successfully recorded.
    });
  }

  /**
   * Save the reveal, then announce it.
   *
   * Both reveal paths — guessing and peeking — used to inline the same write,
   * and neither told anything else on the page. The heading above this card
   * decides between the question and the theme title from exactly this stored
   * value, so without an announcement it kept asking "what connects these
   * films?" directly above the card that had just answered it, until a reload.
   * A `storage` event cannot cover this: the DOM delivers those only to other
   * tabs, never the one that wrote.
   */
  function persistReveal(nextState: GameState) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch {
      // Storage blocked: the in-page state still stands for this session.
    }
    announceConnectionRevealed(themeSlug);
  }

  function handleGuess(originalIndex: number) {
    if (revealed) return;
    const isRight = originalIndex === game.correctIndex;
    const nextState: GameState = { selected: originalIndex, revealed: true, correct: isRight };
    setGameState(nextState);

    if (isRight) {
      onBonusEarned?.(5);
      // Local counter kept for the immediate in-page nudge; the SERVER row is
      // what backs the codebreaker achievement, because localStorage is
      // per-device and editable from the console.
      try {
        const solvedCount = parseInt(localStorage.getItem("mr-connections-solved") || "0", 10);
        localStorage.setItem("mr-connections-solved", String(solvedCount + 1));
      } catch {
        // ignore
      }
    }
    recordAttempt(originalIndex);

    persistReveal(nextState);
  }

  function handleSkipToReveal() {
    if (revealed) return;
    // Peeked without guessing: not correct, and selected stays null so the
    // share can distinguish "peeked" from "guessed and missed". This still
    // spends the attempt — otherwise you could read the answer here and then
    // clear storage to "solve" it.
    const nextState: GameState = { selected: null, revealed: true, correct: false };
    setGameState(nextState);
    recordAttempt(null);
    persistReveal(nextState);
  }

  const isCorrect = selected === game.correctIndex;
  // THE HEADER NAMES THE WEEK, NOT THE THEME. The theme title is a paraphrase of
  // the answer — "Thin Air, Vertical Drops" sitting above an option about
  // high-altitude drops hands the quiz over.
  const weekLabel = marqueeNumber ? `Weekly Marquee #${marqueeNumber}` : "Weekly Marquee";

  const card = (
    <div
      className={`w-full max-w-xl mx-auto rounded-2xl border border-gold/30 bg-gradient-to-b from-surface to-surface/80 p-5 sm:p-6 shadow-2xl backdrop-blur-md ring-1 ring-gold/20 animate-fade-in ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-gold/20 text-gold font-display text-sm font-bold ring-1 ring-gold/40">
            ✦
          </span>
          <div>
            <h3 className="font-display text-base uppercase tracking-wider text-gold sm:text-lg">
              The Secret Connection
            </h3>
            <p className="text-xs text-muted">{weekLabel}</p>
          </div>
        </div>

        {revealed && isCorrect && (
          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 font-mono text-xs font-bold text-gold ring-1 ring-gold/40 animate-fade-in">
            +{CONNECTION_SOLVE_XP} XP Solved!
          </span>
        )}
      </div>

      {!revealed ? (
        /* Stage 1: Interactive Guessing Challenge */
        <div className="mt-4 space-y-4">
          {justFinished && (
            <p className="text-sm font-semibold text-gold leading-relaxed">
              Congratulations! You finished the marquee ranking for this week.
            </p>
          )}
          <p className="text-sm font-medium text-text leading-relaxed">
            {justFinished
              ? "Now for bonus points — what's the theme connecting the marquee movies?"
              : "What's the theme connecting the marquee movies?"}
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {options.map(({ option, originalIndex }, position) => {
              const letter = String.fromCharCode(65 + position);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleGuess(originalIndex)}
                  className="group flex items-start gap-2.5 rounded-xl border border-white/10 bg-surface-raised/80 p-3 text-left transition-all duration-200 hover:border-gold/50 hover:bg-gold/10 hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10 font-mono text-xs font-bold text-text group-hover:bg-gold group-hover:text-bg transition-colors">
                    {letter}
                  </span>
                  <span className="text-xs sm:text-sm text-text/90 group-hover:text-text leading-snug">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[11px] text-muted">
              💡 Correct deductions earn +5 Bonus XP
            </span>
            <button
              type="button"
              onClick={handleSkipToReveal}
              className="text-xs text-muted/70 hover:text-gold hover:underline transition-colors"
            >
              Reveal without guessing →
            </button>
          </div>
        </div>
      ) : (
        /* Stage 2: Revealed Connection Story */
        <div className="mt-4 space-y-4 animate-fade-in">
          {selected !== null && (
            <div
              className={`rounded-xl p-3 text-xs sm:text-sm font-medium flex items-center gap-2 ${
                isCorrect
                  ? "bg-gold/15 text-gold border border-gold/30"
                  : "bg-surface-raised text-muted border border-white/10"
              }`}
            >
              <span className="text-base">{isCorrect ? "🏆" : "🔍"}</span>
              <span>
                {isCorrect
                  ? "Brilliant deduction! You cracked the connection."
                  : "Good intuition! Here is the official common thread uniting the roster:"}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-gold/25 bg-gold/5 p-4 space-y-2">
            <p className="font-display text-xs uppercase tracking-widest text-gold">
              The Common Thread
            </p>
            {revealTitle && (
              <p className="font-display text-lg uppercase tracking-wide text-text">
                {revealTitle}
              </p>
            )}
            <p className="text-sm sm:text-base font-semibold text-text leading-relaxed">
              {game.connection}
            </p>
            {game.triviaNote && (
              <p className="text-xs leading-relaxed text-muted pt-2 border-t border-white/10">
                <span className="font-semibold text-gold">Cinema Note: </span>
                {game.triviaNote}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* One instance, not two. The card used to be rendered inline AND again
          inside the overlay, so the same interactive quiz existed twice in the
          DOM at once. It now lives in exactly one place at a time. */}
      {!modalOpen && card}
      <dialog
        ref={dialogRef}
        aria-label="Bonus round: the secret connection"
        // Keeps React in step when the platform closes it — Escape, or the
        // close() call above.
        onClose={() => setModalOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setModalOpen(false);
        }}
        className="m-auto w-full max-w-xl bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        {modalOpen && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              className="absolute -top-2 -right-2 z-10 rounded-full bg-surface-raised p-1.5 text-muted ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            {card}
          </div>
        )}
      </dialog>
    </>
  );
}
