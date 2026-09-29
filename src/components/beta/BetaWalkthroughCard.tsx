"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Laurel } from "@/components/Laurel";

/**
 * The three steps to the Beta Test Screener achievement, and what it gives.
 *
 * This card used to end in a "Claim" button that played a chime, fired
 * confetti and wrote a localStorage flag — a ceremony for a reward the user
 * already held, since the achievement and its cosmetics are derived from the
 * same rows the steps read (see gamification.ts and cosmetics/ownership.ts).
 * A claim that changes nothing is a lie the next device exposes. Now the card
 * says what is true: three steps, and when they are done, a laurel, what it
 * came with, and one link to the dressing room where it is worn.
 */

export interface BetaWalkthroughCardProps {
  isSignedIn?: boolean;
  hasHandle?: boolean;
  publicDoneLists?: number;
  /** Accepted for compatibility with the profile page; the card no longer equips. */
  equipped?: {
    avatar?: string | null;
    frame?: string | null;
    tagline?: string | null;
  } | null;
  className?: string;
}

const LINK =
  "inline-flex min-h-8 items-center text-base text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold";

const QUIET_BUTTON =
  "inline-flex items-center rounded-md border border-white/10 bg-surface/60 px-2.5 py-1 text-xs text-muted transition-colors hover:border-gold/50 hover:text-text focus-visible:outline-2 focus-visible:outline-gold cursor-pointer";

function Step({
  n,
  done,
  title,
  detail,
  action,
}: {
  n: number;
  done: boolean;
  title: string;
  detail: string;
  action?: { href: string; label: string };
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border p-4 ${
        done ? "border-gold/30 bg-gold/5" : "border-white/10 bg-surface/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            done ? "bg-gold text-bg" : "border border-white/20 text-muted"
          }`}
          aria-label={done ? `Step ${n}, done` : `Step ${n}`}
        >
          {n}
        </span>
        <div>
          <h3 className="font-display text-sm uppercase tracking-wide text-text">{title}</h3>
          <p className="mt-1 text-xs text-muted">{detail}</p>
        </div>
      </div>
      {!done && action && (
        <div className="mt-3">
          <Link href={action.href} className={LINK}>
            {action.label}
          </Link>
        </div>
      )}
    </div>
  );
}

export default function BetaWalkthroughCard({
  isSignedIn = true,
  hasHandle = false,
  publicDoneLists = 0,
  className,
}: BetaWalkthroughCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const step1Done = Boolean(isSignedIn);
  const step2Done = Boolean(hasHandle);
  const step3Done = (publicDoneLists ?? 0) >= 1;

  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const earned = completedCount === 3;
  const percent = Math.round((completedCount / 3) * 100);

  useEffect(() => {
    try {
      if (localStorage.getItem("mr_beta_card_collapsed") === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsCollapsed(true);
      }
      if (localStorage.getItem("mr_beta_card_dismissed") === "1") {
        setIsDismissed(true);
      }
    } catch {
      // Storage may be unavailable; the card simply opens.
    }
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("mr_beta_card_collapsed", next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("mr_beta_card_dismissed", "1");
    } catch {
      // ignore
    }
  };

  if (isDismissed) {
    return (
      <div className="flex justify-end py-1">
        <button
          type="button"
          onClick={() => {
            setIsDismissed(false);
            try {
              localStorage.removeItem("mr_beta_card_dismissed");
            } catch {
              // ignore
            }
          }}
          className="text-xs text-muted/70 transition-colors hover:text-gold cursor-pointer"
        >
          Show the Beta Test Screener card
        </button>
      </div>
    );
  }

  const status = earned
    ? "All three steps done. Beta Test Screener is yours."
    : `${completedCount} of 3 steps done`;

  if (isCollapsed) {
    return (
      <section
        aria-label="Beta Test Screener"
        className={`relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-gold/30 bg-bg/90 p-4 shadow-md backdrop-blur-md ${className ?? ""}`}
      >
        <div>
          <h2 className="font-display text-base uppercase tracking-wider text-text sm:text-lg">
            Beta Test Screener
          </h2>
          <p className="mt-0.5 text-xs text-muted">{status}</p>
        </div>
        <button type="button" onClick={toggleCollapse} className={QUIET_BUTTON}>
          Show details
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Beta Test Screener"
      className={`relative overflow-hidden rounded-2xl border border-gold/30 bg-bg/90 p-5 shadow-lg backdrop-blur-md sm:p-7 ${className ?? ""}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Public beta</p>
          <h2 className="mt-1.5 font-display text-2xl uppercase tracking-wider text-text sm:text-3xl">
            Beta Test Screener
          </h2>
          <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-muted sm:text-sm">
            {earned
              ? "You were here for the public beta, and the site remembers it."
              : "Finish all three steps during public beta to earn the Beta Test Screener achievement and the cosmetics that come with it."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="flex flex-col sm:items-end">
            <span className="font-display text-xl text-gold sm:text-2xl">{completedCount} / 3</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Steps done
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleCollapse} className={QUIET_BUTTON}>
              Minimise
            </button>
            {earned && (
              <button type="button" onClick={handleDismiss} className={QUIET_BUTTON}>
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div
          role="progressbar"
          aria-label="Beta Test Screener progress"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={3}
          className="h-2 w-full overflow-hidden rounded-full bg-surface-raised ring-1 ring-white/10"
        >
          <div
            className="h-full rounded-full bg-gold transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Step
          n={1}
          done={step1Done}
          title="Create an account"
          detail={step1Done ? "Signed in" : "Sign in with your account"}
          action={{ href: "/login", label: "Sign in" }}
        />
        <Step
          n={2}
          done={step2Done}
          title="Claim your handle"
          detail={step2Done ? "Handle claimed" : "Pick your permanent handle"}
          action={{ href: "#claim-heading", label: "Claim a handle" }}
        />
        {/*
          Step 3 points at the homepage's ranking builder (`id="start"` in
          home-client.tsx) rather than /r/play: starting a curated ranking
          needs client state (`begin` saves the session to localStorage before
          pushing) that a plain link cannot set up.
        */}
        <Step
          n={3}
          done={step3Done}
          title="Finish one ranking and publish it"
          detail={
            step3Done
              ? `${publicDoneLists} public ranking${publicDoneLists > 1 ? "s" : ""} settled`
              : "The weekly Marquee counts"
          }
          action={{ href: "/#start", label: "Start a ranking" }}
        />
      </div>

      {earned && (
        <div className="mt-6 border-t border-gold/20 pt-5">
          <Laurel>Beta Test Screener</Laurel>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="max-w-[60ch] text-base leading-relaxed text-text/90">
              Yours: the Beta Reel avatar, the Beta Cassette frame, and one tagline.
            </p>
            <Link href="/u/profile/customise" className={LINK}>
              Wear them
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
