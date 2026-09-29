"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { trackSignInClick } from "@/lib/analytics";

export interface BetaRequirementsStats {
  isSignedIn?: boolean;
  hasHandle?: boolean;
  handle?: string | null;
  publicDoneLists?: number;
}

export interface BetaRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: BetaRequirementsStats;
}

export default function BetaRequirementsModal({
  isOpen,
  onClose,
  stats: initialStats,
}: BetaRequirementsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loadedStats, setLoadedStats] = useState<BetaRequirementsStats | null>(null);

  // Sync open state with native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle native dialog close (e.g. Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  // Fetch stats if not explicitly provided and modal opens
  useEffect(() => {
    if (!isOpen || initialStats !== undefined) return;

    let isCancelled = false;

    async function fetchStats() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
          if (!isCancelled) {
            setLoadedStats({
              isSignedIn: false,
              hasHandle: false,
              handle: null,
              publicDoneLists: 0,
            });
          }
          return;
        }

        const [{ data: profile }, { count: publicCount }] = await Promise.all([
          supabase
            .from("profiles")
            .select("handle")
            .eq("id", authData.user.id)
            .maybeSingle<{ handle: string | null }>(),
          supabase
            .from("lists")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", authData.user.id)
            .eq("status", "done")
            .eq("visibility", "public"),
        ]);

        if (!isCancelled) {
          setLoadedStats({
            isSignedIn: true,
            hasHandle: Boolean(profile?.handle),
            handle: profile?.handle ?? null,
            publicDoneLists: publicCount ?? 0,
          });
        }
      } catch {
        if (!isCancelled) {
          setLoadedStats({
            isSignedIn: false,
            hasHandle: false,
            handle: null,
            publicDoneLists: 0,
          });
        }
      }
    }

    fetchStats();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, initialStats]);

  const isLoading = isOpen && initialStats === undefined && loadedStats === null;

  const currentStats = initialStats ?? loadedStats ?? {
    isSignedIn: false,
    hasHandle: false,
    handle: null,
    publicDoneLists: 0,
  };

  const step1Done = Boolean(currentStats.isSignedIn);
  const step2Done = Boolean(currentStats.hasHandle);
  const step3Done = (currentStats.publicDoneLists ?? 0) >= 1;
  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const allCompleted = completedCount === 3;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="beta-requirements-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="m-auto w-full max-w-xl bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-surface p-5 sm:p-7 shadow-2xl ring-1 ring-white/10">
        {/* Cinema aura blur */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl"
        />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 font-display text-[10px] uppercase tracking-widest text-gold bg-gold/15 px-2 py-0.5 rounded-md ring-1 ring-gold/40">
              <span>Public beta</span>
            </div>
            <h2
              id="beta-requirements-title"
              className="font-display text-2xl uppercase tracking-wider text-text sm:text-3xl"
            >
              Beta Test Screener
            </h2>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Three steps during the public beta earn the{" "}
              <strong className="text-gold font-normal">Beta Test Screener</strong> laurel and its
              avatar, frame and tagline.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close beta requirements dialog"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="mt-5 rounded-xl border border-white/10 bg-bg/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span className="text-muted">Your progress</span>
            <span className="text-gold font-display text-base tracking-normal">
              {isLoading ? "Checking…" : `${completedCount} / 3 Completed`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Beta requirements progress"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={3}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface ring-1 ring-white/10"
          >
            <div
              className="h-full rounded-full bg-gold transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,197,24,0.5)]"
              style={{ width: `${Math.round((completedCount / 3) * 100)}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="mt-4 space-y-2.5">
          {/* Step 1: Create Account */}
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
              step1Done
                ? "border-gold/40 bg-gold/5"
                : "border-white/10 bg-surface/40 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step1Done ? "bg-gold text-bg" : "border border-white/20 text-muted"
                }`}
              >
                {step1Done ? "✓" : "1"}
              </span>
              <div>
                <h3 className="font-display text-sm uppercase tracking-wide text-text">
                  Create an account
                </h3>
                <p className="text-xs text-muted">
                  {step1Done ? "Authenticated as early tester" : "Sign in to join the public beta"}
                </p>
              </div>
            </div>
            {!step1Done && (
              <Link
                href="/login"
                onClick={() => {
                  trackSignInClick("beta_modal");
                  onClose();
                }}
                className="shrink-0 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold hover:bg-gold hover:text-bg transition-colors"
              >
                Sign In →
              </Link>
            )}
          </div>

          {/* Step 2: Claim Handle */}
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
              step2Done
                ? "border-gold/40 bg-gold/5"
                : "border-white/10 bg-surface/40 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step2Done ? "bg-gold text-bg" : "border border-white/20 text-muted"
                }`}
              >
                {step2Done ? "✓" : "2"}
              </span>
              <div>
                <h3 className="font-display text-sm uppercase tracking-wide text-text">
                  Claim your handle
                </h3>
                <p className="text-xs text-muted">
                  {step2Done
                    ? currentStats.handle
                      ? `@${currentStats.handle} claimed`
                      : "Handle claimed"
                    : "Claim your unique curator handle on MovieRanker"}
                </p>
              </div>
            </div>
            {!step2Done && (
              <Link
                href={step1Done ? "/u/profile#claim-heading" : "/login"}
                onClick={onClose}
                className="shrink-0 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold hover:bg-gold hover:text-bg transition-colors"
              >
                Claim Handle →
              </Link>
            )}
          </div>

          {/* Step 3: Contribute Public Ranking */}
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
              step3Done
                ? "border-gold/40 bg-gold/5"
                : "border-white/10 bg-surface/40 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step3Done ? "bg-gold text-bg" : "border border-white/20 text-muted"
                }`}
              >
                {step3Done ? "✓" : "3"}
              </span>
              <div>
                <h3 className="font-display text-sm uppercase tracking-wide text-text">
                  Contribute a public ranking
                </h3>
                <p className="text-xs text-muted">
                  {step3Done
                    ? `${currentStats.publicDoneLists} public ranking${
                        (currentStats.publicDoneLists ?? 0) > 1 ? "s" : ""
                      } completed`
                    : "Rank and publish any movie list (the weekly Marquee counts!)"}
                </p>
              </div>
            </div>
            {!step3Done && (
              <Link
                href="/#start"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold hover:bg-gold hover:text-bg transition-colors"
              >
                Start Ranking →
              </Link>
            )}
          </div>
        </div>

        {/* All completed celebratory banner */}
        {allCompleted && (
          <div className="mt-4 rounded-xl border border-gold/50 bg-gold/10 p-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-lg">🎉</span>
                <h4 className="font-display text-base uppercase tracking-wider text-gold">
                  All 3 Requirements Completed!
                </h4>
              </div>
              <p className="mt-0.5 text-xs text-text/80">
                The Beta Test Screener laurel is yours, with its avatar, frame and tagline. Wear them from your profile.
              </p>
            </div>
            <Link
              href="/u/profile#beta"
              onClick={onClose}
              className="shrink-0 rounded-lg bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-bg shadow-[0_0_15px_rgba(245,197,24,0.4)] hover:bg-gold/90 transition-colors"
            >
              View Rewards →
            </Link>
          </div>
        )}

        {/* Rewards Showcase */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2.5">
            What the Beta Test Screener wears
          </h4>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Reward 1 */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-bg/40 p-3 text-center">
              <span className="font-display text-xs uppercase tracking-wider text-text">
                Beta Reel
              </span>
              <span className="text-[10px] text-muted">Avatar</span>
            </div>
            {/* Reward 2 */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-bg/40 p-3 text-center">
              <span className="font-display text-xs uppercase tracking-wider text-text">
                Beta Cassette
              </span>
              <span className="text-[10px] text-muted">Frame</span>
            </div>
            {/* Reward 3 */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-bg/40 p-3 text-center">
              <span className="font-display text-xs uppercase tracking-wider text-gold">
                &ldquo;Betamax was better&rdquo;
              </span>
              <span className="text-[10px] text-muted">Tagline</span>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
