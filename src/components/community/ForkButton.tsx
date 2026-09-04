"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createForkSession, type ForkableListInput } from "@/lib/fork";
import { loadSession, clearSession, type PlaySession } from "@/lib/session";

export interface ForkButtonProps {
  list: ForkableListInput & { id?: string };
  ownerHandle?: string | null;
  variant?: "primary" | "secondary" | "pill" | "compact" | "card";
  className?: string;
  onFork?: () => void;
}

export default function ForkButton({
  list,
  ownerHandle,
  variant = "primary",
  className = "",
  onFork,
}: ForkButtonProps) {
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [existingSession, setExistingSession] = useState<PlaySession | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const existing = loadSession();
    if (existing && (existing.movies?.length ?? 0) >= 2) {
      setExistingSession(existing);
      setShowConfirmModal(true);
      return;
    }

    executeFork();
  }

  function executeFork() {
    createForkSession(list, ownerHandle);
    onFork?.();
    router.push("/r/play");
  }

  function handleStartFresh() {
    clearSession();
    setShowConfirmModal(false);
    executeFork();
  }

  function handleResumeSaved() {
    setShowConfirmModal(false);
    router.push("/r/play");
  }

  let buttonStyles = "";
  if (variant === "compact" || variant === "card") {
    buttonStyles =
      "inline-flex items-center justify-center gap-1 rounded-full bg-surface-raised/90 px-3 py-1 text-xs font-semibold text-text ring-1 ring-white/10 hover:bg-gold/15 hover:text-gold hover:ring-gold/40 transition-all duration-200 active:scale-95";
  } else if (variant === "secondary") {
    buttonStyles =
      "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-raised px-5 text-sm font-semibold text-text ring-1 ring-white/15 transition-all duration-200 ease-out hover:bg-gold/10 hover:text-gold hover:ring-gold/50 active:scale-95";
  } else if (variant === "pill") {
    buttonStyles =
      "inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-raised px-4 py-2 text-sm font-semibold text-text ring-1 ring-white/15 transition-all duration-200 hover:ring-gold/50 hover:text-gold hover:bg-gold/10 active:scale-95";
  } else {
    // primary
    buttonStyles =
      "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wider text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(245,197,24,0.35)] focus-visible:outline-2 focus-visible:outline-gold active:scale-[0.98]";
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Fork and re-rank ${list.title}`}
        title={`Fork and start a fresh ranking duel with these ${list.movies?.length ?? 0} films`}
        className={`${buttonStyles} ${className} cursor-pointer`}
      >
        <span aria-hidden="true" className="text-base">✦</span>
        <span>Fork &amp; Re-rank</span>
      </button>

      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fork-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-sheet-up"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl ring-1 ring-gold/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-gold">
              <span className="text-xl" aria-hidden="true">✦</span>
              <h3
                id="fork-confirm-title"
                className="font-display text-xl uppercase tracking-wider text-text"
              >
                Unfinished Ranking in Progress
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
              You already have an active ranking duel in progress for &ldquo;
              <strong className="text-text">{existingSession?.title || "Movie ranking"}</strong>
              &rdquo;. Would you like to resume your existing session or start fresh by forking &ldquo;
              <strong className="text-gold">{list.title}</strong>&rdquo;?
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleResumeSaved}
                className="min-h-11 rounded-full bg-surface-raised px-5 text-sm font-semibold text-text ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-gold"
              >
                Resume Saved
              </button>
              <button
                type="button"
                onClick={handleStartFresh}
                className="min-h-11 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold"
              >
                Start Fresh with Fork
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
