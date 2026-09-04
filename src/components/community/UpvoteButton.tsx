"use client";

import { useState } from "react";
import Link from "next/link";

export interface UpvoteButtonProps {
  listId: string;
  initialCount?: number;
  initialHasUpvoted?: boolean;
  variant?: "default" | "compact" | "pill" | "card";
  className?: string;
  showLabel?: boolean;
}

export default function UpvoteButton({
  listId,
  initialCount = 0,
  initialHasUpvoted = false,
  variant = "default",
  className = "",
  showLabel = true,
}: UpvoteButtonProps) {
  const [count, setCount] = useState<number>(initialCount);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(initialHasUpvoted);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;

    // Optimistic state
    const nextHasUpvoted = !hasUpvoted;
    const nextCount = nextHasUpvoted ? count + 1 : Math.max(0, count - 1);

    setHasUpvoted(nextHasUpvoted);
    setCount(nextCount);
    setIsPending(true);

    try {
      const res = await fetch(`/api/lists/${listId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 401) {
        // Revert optimistic update and show auth prompt
        setHasUpvoted(hasUpvoted);
        setCount(count);
        setShowAuthModal(true);
        return;
      }

      if (!res.ok) {
        // Revert optimistic update
        setHasUpvoted(hasUpvoted);
        setCount(count);
        return;
      }

      const data = (await res.json()) as {
        upvotesCount: number;
        hasUpvoted: boolean;
      };
      setCount(data.upvotesCount);
      setHasUpvoted(data.hasUpvoted);
    } catch {
      // Revert on error
      setHasUpvoted(hasUpvoted);
      setCount(count);
    } finally {
      setIsPending(false);
    }
  }

  const basePillStyles =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-200 ease-out cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-gold";

  let variantStyles = "";
  if (variant === "compact" || variant === "card") {
    variantStyles = hasUpvoted
      ? "bg-gold/20 text-gold ring-1 ring-gold shadow-[0_0_12px_rgba(245,197,24,0.3)] px-2.5 py-1 text-xs"
      : "bg-surface-raised/80 text-muted ring-1 ring-white/10 hover:ring-gold/40 hover:text-text px-2.5 py-1 text-xs";
  } else if (variant === "pill") {
    variantStyles = hasUpvoted
      ? "bg-gold/25 text-gold ring-1 ring-gold shadow-[0_0_16px_rgba(245,197,24,0.35)] px-4 py-2 text-sm font-semibold"
      : "bg-surface-raised text-text ring-1 ring-white/15 hover:ring-gold/50 hover:text-gold px-4 py-2 text-sm";
  } else {
    // default
    variantStyles = hasUpvoted
      ? "bg-gold/20 text-gold ring-1 ring-gold shadow-[0_0_14px_rgba(245,197,24,0.3)] px-3.5 py-1.5 text-sm"
      : "bg-surface-raised text-muted ring-1 ring-white/10 hover:ring-gold/40 hover:text-text px-3.5 py-1.5 text-sm";
  }

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={hasUpvoted}
        aria-label={`Upvote list (${count} ${count === 1 ? "upvote" : "upvotes"})`}
        title={hasUpvoted ? "Remove upvote" : "Upvote this ranking"}
        className={`${basePillStyles} ${variantStyles} ${className}`}
      >
        <span
          aria-hidden="true"
          className={`text-sm transition-transform duration-200 ${
            hasUpvoted ? "scale-110 text-gold" : "group-hover:scale-110"
          }`}
        >
          {hasUpvoted ? "▲" : "△"}
        </span>
        <span className="font-mono font-semibold">{count}</span>
        {showLabel && variant !== "compact" && (
          <span className="text-xs uppercase tracking-wider font-semibold">
            {count === 1 ? "Upvote" : "Upvotes"}
          </span>
        )}
      </button>

      {/* Guest Sign-In Prompt Modal */}
      {showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upvote-auth-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-sheet-up"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl ring-1 ring-gold/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-gold">
              <span className="text-xl" aria-hidden="true">✦</span>
              <h3
                id="upvote-auth-title"
                className="font-display text-xl uppercase tracking-wider text-text"
              >
                Sign in to upvote
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
              Sign in or create a free account to upvote curated rankings and help surface top community showcases.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href={`/login?next=${encodeURIComponent(`/l/${listId}`)}`}
                className="flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold"
              >
                Sign in to continue
              </Link>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="min-h-10 rounded-full bg-surface-raised px-4 text-xs font-semibold text-muted ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
