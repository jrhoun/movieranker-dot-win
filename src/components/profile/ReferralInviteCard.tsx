"use client";

import { useState } from "react";
import type { ReferralStats } from "@/lib/referrals";

export default function ReferralInviteCard({
  handle,
  stats,
}: {
  handle: string | null;
  stats: ReferralStats;
}) {
  const [copied, setCopied] = useState(false);
  const [origin] = useState(() =>
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.movieranker.win",
  );
  const [canShare] = useState(() =>
    typeof window !== "undefined" ? Boolean(navigator.share) : false,
  );

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
        title: "Join me on movieranker",
        text: "Rank your favorite movies, settle film debates, and build your ultimate lists with me on movieranker!",
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
      className="rounded-xl bg-surface p-5 ring-1 ring-gold/40 shadow-xl relative overflow-hidden"
    >
      {/* Background ticket punch notch effect */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2
          id="referral-heading"
          className="font-display text-sm uppercase tracking-[0.14em] text-gold flex items-center gap-1.5"
        >
          <span>✦</span>
          <span>Invite Friends &amp; Earn XP</span>
        </h2>
        <span className="rounded-full bg-gold/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gold ring-1 ring-gold/30">
          +15 XP / Friend
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Give friends your VIP invite link. When they join and publish their{" "}
        <strong className="text-text">first completed ranking</strong>, you unlock{" "}
        <strong className="text-gold">+15 Referral XP</strong> (+3 Career Levels)!
      </p>

      {/* Invite Link Bar */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 truncate rounded-lg bg-surface-raised px-3.5 py-2 font-mono text-xs text-text ring-1 ring-white/10 flex items-center select-all">
          {inviteUrl}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-9 flex-1 sm:flex-initial rounded-lg bg-gold px-4 text-xs font-bold uppercase tracking-wider text-bg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
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
              className="min-h-9 rounded-lg bg-surface-raised px-3.5 text-xs font-bold uppercase tracking-wider text-gold ring-1 ring-gold/40 hover:bg-gold/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="Share via messaging apps"
            >
              <span>↗</span>
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
        </div>
      </div>

      {/* Referral Milestone Stats Tracker */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-gold">🎟️</span>
          <span className="text-text font-medium">
            {stats.activeReferrals > 0 ? (
              <>
                <strong className="text-gold font-bold">{stats.activeReferrals}</strong> active friend
                {stats.activeReferrals === 1 ? "" : "s"} joined ·{" "}
                <span className="text-gold font-mono font-bold">+{stats.bonusXp} XP</span> earned
              </>
            ) : (
              <span className="text-muted">No referrals completed yet — share your link!</span>
            )}
          </span>
        </div>

        {pendingCount > 0 && (
          <span className="text-[11px] font-mono text-muted bg-white/5 px-2 py-0.5 rounded">
            ⏳ {pendingCount} awaiting first ranking
          </span>
        )}
      </div>
    </section>
  );
}
