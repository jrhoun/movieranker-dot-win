"use client";

import { useState } from "react";
import type { ThemeConnectionGame } from "@/lib/shortlist-themes";

interface MarqueeConnectionGameProps {
  themeSlug: string;
  themeTitle: string;
  game: ThemeConnectionGame;
  onBonusEarned?: (xp: number) => void;
  className?: string;
}

export default function MarqueeConnectionGame({
  themeSlug,
  themeTitle,
  game,
  onBonusEarned,
  className = "",
}: MarqueeConnectionGameProps) {
  const storageKey = `mr-conn-${themeSlug}`;
  const [gameState, setGameState] = useState<{
    selected: number | null;
    revealed: boolean;
    /** Whether the guess was right. Absent on entries written before this field existed. */
    correct?: boolean;
  }>(() => {
    if (typeof window === "undefined") return { selected: null, revealed: false };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { selected: null, revealed: false };
  });

  const { selected, revealed } = gameState;

  function handleGuess(index: number) {
    if (revealed) return;
    const isCorrect = index === game.correctIndex;
    const nextState = { selected: index, revealed: true, correct: isCorrect };
    setGameState(nextState);

    if (isCorrect) {
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
      // Fire-and-forget: a signed-out user gets a 401 and simply earns no badge.
      void fetch("/api/marquee-solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeSlug, guessIndex: index }),
      }).catch(() => {
        // Offline or blocked: the local nudge still happened; the badge just
        // waits until a solve is successfully recorded.
      });
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }

  function handleSkipToReveal() {
    // Peeked without guessing: not correct, and selected stays null so the
    // share can distinguish "peeked" from "guessed and missed".
    const nextState = { selected: null, revealed: true, correct: false };
    setGameState(nextState);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }

  const isCorrect = selected === game.correctIndex;

  return (
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
            <p className="text-xs text-muted">Weekly Marquee: {themeTitle}</p>
          </div>
        </div>

        {revealed && isCorrect && (
          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 font-mono text-xs font-bold text-gold ring-1 ring-gold/40 animate-fade-in">
            +5 XP Solved!
          </span>
        )}
      </div>

      {!revealed ? (
        /* Stage 1: Interactive Guessing Challenge */
        <div className="mt-4 space-y-4">
          <p className="text-sm font-medium text-text leading-relaxed">
            Can you deduce the secret cinematic thread connecting every film in this week&apos;s marquee?
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {game.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleGuess(idx)}
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
}
