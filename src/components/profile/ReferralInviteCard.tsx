"use client";

import { useSyncExternalStore, useState } from "react";
import type { ReferralStats } from "@/lib/referrals";
import { REFERRAL_XP_BONUS } from "@/lib/gamification";

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

/**
 * The invite link, as prose.
 *
 * This was a bordered panel with a heading, a "+25 XP PER FRIEND" chip, a
 * boxed URL, a gold pill reading "📋 Copy Link", an "↗ Share" pill and a
 * "Status:" row with a "⏳ 2 awaiting first list" badge — a card kit around
 * one link and one number. Same information, three sentences and two verbs.
 */
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

  // No handle, no link. This used to fall back to `?ref=join`, which resolves
  // to nobody — every friend who followed it was credited to no one.
  const inviteUrl = handle ? `${origin}/?ref=${encodeURIComponent(handle)}` : null;

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard refused (permission, or an insecure context): the link is
      // selectable text right above the button, so there is still a way out.
    }
  }

  async function handleNativeShare() {
    if (!inviteUrl) return;
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
    <div>
      <p className="max-w-[70ch] text-base leading-relaxed text-text/90">
        Send someone your link. When they sign up and finish their first ranking, you earn{" "}
        {REFERRAL_XP_BONUS} XP.
      </p>

      {inviteUrl ? (
        <>
          <p
            suppressHydrationWarning
            className="mt-4 max-w-[70ch] break-all text-base text-text select-all"
          >
            {inviteUrl}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-11 rounded text-base text-gold underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-gold"
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="min-h-11 rounded text-base text-gold underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Share
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-text">
          <a
            href="#claim-heading"
            className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
          >
            Claim your handle
          </a>{" "}
          to get your invite link.
        </p>
      )}

      <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-muted">
        {stats.activeReferrals > 0 ? (
          <>
            {stats.activeReferrals} {stats.activeReferrals === 1 ? "friend has" : "friends have"}{" "}
            joined and finished a ranking, earning you {stats.bonusXp} XP.
          </>
        ) : (
          <>Nobody has joined through your link yet.</>
        )}
        {pendingCount > 0 && (
          <>
            {" "}
            {pendingCount} {pendingCount === 1 ? "person is" : "people are"} still working on a
            first ranking.
          </>
        )}
      </p>
    </div>
  );
}
