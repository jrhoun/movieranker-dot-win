"use client";

import { useSyncExternalStore, useState } from "react";
import type { ReferralStats } from "@/lib/referrals";

const emptySubscribe = () => () => {};

function getClientOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "https://www.movieranker.win";
}
function getServerOrigin() {
  return "https://www.movieranker.win";
}

function getCanShare() {
  return typeof navigator !== "undefined" ? Boolean(navigator.share) : false;
}
function getServerCanShare() {
  return false;
}

export default function ReferralInviteCard({
  handle,
  stats,
}: {
  handle: string | null;
  stats: ReferralStats;
}) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(emptySubscribe, getClientOrigin, getServerOrigin);
  const canShare = useSyncExternalStore(emptySubscribe, getCanShare, getServerCanShare);

  const referralCode = handle || "join";
  const inviteUrl = `${origin}/?ref=${encodeURIComponent(referralCode)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      void handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: "Join me on MovieRanker",
        text: "Rank your favorite movies and build lists with me on MovieRanker!",
        url: inviteUrl,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        void handleCopy();
      }
    }
  }

  const pendingCount = Math.max(0, stats.totalReferred - stats.activeReferrals);

  return (
    <section
      aria-labelledby="referral-heading"
      className="rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2
          id="referral-heading"
          className="font-display text-sm uppercase tracking-[0.14em] text-gold flex items-center gap-1.5"
        >
          <span>✦</span>
          <span>Invite Friends</span>
        </h2>
        <span className="rounded-full bg-gold/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gold ring-1 ring-gold/30">
          +15 XP per friend
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Refer your friends. When they create an account and finish their first ranking list, you get{" "}
        <strong className="text-gold font-semibold">+15 XP</strong>.
      </p>

      {/* Dedicated full-width URL row */}
      <div className="mt-3.5 space-y-2.5">
        <div
          suppressHydrationWarning
          className="w-full break-all rounded-lg bg-surface-raised px-3.5 py-2.5 font-mono text-xs text-text ring-1 ring-white/10 select-all"
        >
          {inviteUrl}
        </div>

        {/* Action buttons on their own clean line */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-9 flex-1 rounded-lg bg-gold px-4 text-xs font-bold uppercase tracking-wider text-bg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy Link</span>
              </>
            )}
          </button>

          {canShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="min-h-9 rounded-lg bg-surface-raised px-4 text-xs font-semibold uppercase tracking-wider text-gold ring-1 ring-gold/40 hover:bg-gold/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>↗</span>
              <span>Share</span>
            </button>
          )}
        </div>
      </div>

      {/* Referral Stats Summary */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted">Status:</span>
          <span className="text-text font-medium">
            {stats.activeReferrals > 0 ? (
              <>
                <strong className="text-gold font-bold">{stats.activeReferrals}</strong> friend
                {stats.activeReferrals === 1 ? "" : "s"} joined ·{" "}
                <span className="text-gold font-mono font-bold">+{stats.bonusXp} XP</span> earned
              </>
            ) : (
              <span className="text-muted">No referrals completed yet</span>
            )}
          </span>
        </div>

        {pendingCount > 0 && (
          <span className="text-[11px] font-mono text-muted bg-white/5 px-2 py-0.5 rounded">
            ⏳ {pendingCount} awaiting first list
          </span>
        )}
      </div>
    </section>
  );
}
