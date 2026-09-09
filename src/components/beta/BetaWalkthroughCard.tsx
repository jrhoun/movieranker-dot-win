"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { playGoldenChime } from "@/lib/audio";
import { patchShowcase } from "@/lib/public-profile";

function CanisterConfetti({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const colors = ["#f5c518", "#ffd700", "#ffffff", "#e50914", "#ff8c00", "#00e5ff"];
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      vRot: number;
      shape: "rect" | "circle";
      opacity: number;
    }[] = [];

    const count = 120;
    const originX = rect.width / 2;
    const originY = rect.height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 8 + 4;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.3 ? "rect" : "circle",
        opacity: 1,
      });
    }

    let start: number | null = null;
    const duration = 4000;

    const render = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;
      const progress = elapsed / duration;

      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.985; // air drag
        p.rotation += p.vRot;
        p.opacity = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        onComplete?.();
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      aria-hidden="true"
    />
  );
}

export interface BetaWalkthroughCardProps {
  isSignedIn?: boolean;
  hasHandle?: boolean;
  publicDoneLists?: number;
  equipped?: {
    avatar?: string | null;
    frame?: string | null;
    tagline?: string | null;
  } | null;
  className?: string;
}

export default function BetaWalkthroughCard({
  isSignedIn = true,
  hasHandle = false,
  publicDoneLists = 0,
  equipped,
  className,
}: BetaWalkthroughCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [equippedItems, setEquippedItems] = useState(equipped ?? {});
  const [equippingSlot, setEquippingSlot] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const step1Done = Boolean(isSignedIn);
  const step2Done = Boolean(hasHandle);
  const step3Done = (publicDoneLists ?? 0) >= 1;

  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const allCompleted = completedCount === 3;
  const percent = Math.round((completedCount / 3) * 100);

  const isAnyBetaEquipped =
    equipped?.frame === "frame.beta" ||
    equipped?.tagline === "tagline.betamax" ||
    equipped?.avatar === "avatar.gen.beta-reel";

  const [claimedCanister, setClaimedCanister] = useState(isAnyBetaEquipped);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("mr_beta_canister_claimed") === "1") {
        setClaimedCanister(true);
      }
      if (localStorage.getItem("mr_beta_card_collapsed") === "1") {
        setIsCollapsed(true);
      }
      if (localStorage.getItem("mr_beta_card_dismissed") === "1") {
        setIsDismissed(true);
      }
    }
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mr_beta_card_collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mr_beta_card_dismissed", "1");
      } catch {
        // ignore
      }
    }
  };

  const handleClaim = () => {
    playGoldenChime();
    setCelebrating(true);
    setClaimedCanister(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mr_beta_canister_claimed", "1");
      } catch {
        // Ignore storage errors in restricted iframe/sandbox
      }
    }
  };

  const handleEquip = (slot: "avatar" | "frame" | "tagline", itemId: string) => {
    setEquippingSlot(slot);
    startTransition(async () => {
      const ok = await patchShowcase({ equipped: { [slot]: itemId } });
      if (ok) {
        setEquippedItems((prev) => ({ ...prev, [slot]: itemId }));
        router.refresh();
      }
      setEquippingSlot(null);
    });
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
          className="text-xs text-muted/70 hover:text-gold transition-colors cursor-pointer"
        >
          ✦ Show Beta Test Screening Card
        </button>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <section
        aria-label="Public Beta Test Screening"
        className={`relative overflow-hidden rounded-2xl border border-gold/30 bg-bg/90 p-4 shadow-md backdrop-blur-md flex flex-wrap items-center justify-between gap-3 ${className ?? ""}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl text-gold" aria-hidden="true">📼</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-gold/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold ring-1 ring-gold/40">
                Beta Event
              </span>
              <h2 className="font-display text-base uppercase tracking-wider text-text sm:text-lg">
                Beta Test Screening
              </h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {allCompleted
                ? claimedCanister
                  ? "All 3 steps complete · Beta Canister Unlocked"
                  : "3 / 3 steps done · Ready to claim canister!"
                : `${completedCount} of 3 steps completed`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleCollapse}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-surface/80 px-3 py-1.5 text-xs font-semibold text-text hover:border-gold hover:text-gold transition-colors cursor-pointer"
          >
            <span>Show Details</span>
            <span aria-hidden="true">▼</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Public Beta Test Screening"
      className={`relative overflow-hidden rounded-2xl border border-gold/30 bg-bg/90 p-5 sm:p-7 shadow-lg backdrop-blur-md ${className ?? ""}`}
    >
      {celebrating && <CanisterConfetti onComplete={() => setCelebrating(false)} />}

      {/* Decorative cinema background tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-md bg-gold/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold ring-1 ring-gold/40">
              Beta Event
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Beta Test Screening
            </span>
          </div>
          <h2 className="mt-1.5 font-display text-2xl uppercase tracking-wider text-text sm:text-3xl">
            Claim Your Beta Canister
          </h2>
          <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-muted sm:text-sm">
            Complete all three onboarding steps during public beta to become a Beta Test Screener and
            unlock the exclusive Beta Canister cosmetic suite.
          </p>
        </div>

        {/* Progress summary badge & collapse control */}
        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-2">
          <div className="flex flex-col sm:items-end">
            <span className="font-display text-xl text-gold sm:text-2xl">
              {completedCount} / 3
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Steps Done
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={toggleCollapse}
              title="Minimize card"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-surface/60 px-2.5 py-1 text-xs text-muted hover:border-gold/50 hover:text-text transition-colors cursor-pointer"
            >
              <span>Minimize</span>
              <span aria-hidden="true">▲</span>
            </button>
            {claimedCanister && (
              <button
                type="button"
                onClick={handleDismiss}
                title="Dismiss card"
                className="inline-flex items-center rounded-md border border-white/10 bg-surface/60 px-2 py-1 text-xs text-muted hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-label="Beta test screening progress"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={3}
          className="h-2 w-full overflow-hidden rounded-full bg-surface-raised ring-1 ring-white/10"
        >
          <div
            className="h-full rounded-full bg-gold transition-all duration-500 ease-out shadow-[0_0_12px_rgba(245,197,24,0.6)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 3 Steps List */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {/* Step 1: Sign in */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
            step1Done
              ? "border-gold/30 bg-gold/5"
              : "border-white/10 bg-surface/40 hover:border-white/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step1Done ? "bg-gold text-bg" : "border border-white/20 text-muted"
              }`}
            >
              {step1Done ? "✓" : "1"}
            </span>
            <div>
              <h3 className="font-display text-sm uppercase tracking-wide text-text">
                Create account
              </h3>
              <p className="mt-1 text-xs text-muted">
                {step1Done ? "Signed in & authenticated" : "Sign in with your account"}
              </p>
            </div>
          </div>
          {!step1Done && (
            <div className="mt-3">
              <Link
                href="/login"
                className="inline-flex min-h-8 items-center text-xs font-semibold uppercase tracking-wider text-gold hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Sign In →
              </Link>
            </div>
          )}
        </div>

        {/* Step 2: Claim handle */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
            step2Done
              ? "border-gold/30 bg-gold/5"
              : "border-white/10 bg-surface/40 hover:border-white/20"
          }`}
        >
          <div className="flex items-start gap-3">
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
              <p className="mt-1 text-xs text-muted">
                {step2Done ? "Curator handle claimed" : "Pick your permanent handle"}
              </p>
            </div>
          </div>
          {!step2Done && (
            <div className="mt-3">
              <Link
                href="#claim-heading"
                className="inline-flex min-h-8 items-center text-xs font-semibold uppercase tracking-wider text-gold hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Claim Handle →
              </Link>
            </div>
          )}
        </div>

        {/* Step 3: Contribute public list */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
            step3Done
              ? "border-gold/30 bg-gold/5"
              : "border-white/10 bg-surface/40 hover:border-white/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step3Done ? "bg-gold text-bg" : "border border-white/20 text-muted"
              }`}
            >
              {step3Done ? "✓" : "3"}
            </span>
            <div>
              <h3 className="font-display text-sm uppercase tracking-wide text-text">
                Contribute publicly
              </h3>
              <p className="mt-1 text-xs text-muted">
                {step3Done
                  ? `${publicDoneLists} public ranking${publicDoneLists > 1 ? "s" : ""} settled`
                  : "Rank 1 list & share to Spotlight"}
              </p>
            </div>
          </div>
          {!step3Done && (
            <div className="mt-3">
              <Link
                href="/"
                className="inline-flex min-h-8 items-center text-xs font-semibold uppercase tracking-wider text-gold hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Start Ranking →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Resolution / Canister Unveil */}
      {allCompleted && (
        <div className="mt-6 border-t border-gold/20 pt-6">
          {!claimedCanister ? (
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-gold/40 bg-gold/10 p-5 text-center sm:flex-row sm:text-left">
              <div>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <span className="text-xl">📼</span>
                  <h3 className="font-display text-xl uppercase tracking-wider text-gold sm:text-2xl">
                    Challenge Complete!
                  </h3>
                </div>
                <p className="mt-1 text-xs text-text/80 sm:text-sm">
                  You conquered the 3-step Beta Test Screening! Claim your Beta Canister to reveal your
                  cosmetics.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClaim}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-6 py-2.5 font-display text-base uppercase tracking-wider text-bg shadow-[0_0_24px_rgba(245,197,24,0.45)] transition-all hover:bg-gold/90 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-gold active:scale-[0.98] cursor-pointer"
              >
                <span>📼</span>
                <span>Claim Beta Canister</span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl border border-gold/40 bg-surface/80 p-5 backdrop-blur-md shadow-[0_0_35px_rgba(245,197,24,0.25)] ring-1 ring-gold/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl animate-bounce">✨</span>
                  <h3 className="font-display text-lg uppercase tracking-wider text-gold sm:text-xl">
                    Beta Canister Cosmetics Unlocked
                  </h3>
                </div>
                <span className="rounded bg-gold/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold shadow-sm ring-1 ring-gold/40">
                  Legendary Bundle
                </span>
              </div>

              {/* 3 Unveiled Cosmetics */}
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {/* 1. Beta Reel Avatar */}
                <div className="flex flex-col items-center justify-between rounded-lg border border-white/10 bg-bg/80 p-4 text-center">
                  <div className="flex flex-col items-center">
                    <img
                      src="/avatars/beta-reel.svg"
                      alt="Beta Reel"
                      className="h-16 w-16 rounded-full border-2 border-gold/50 bg-black p-0.5 shadow-[0_0_12px_rgba(245,197,24,0.3)]"
                    />
                    <div className="mt-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Avatar
                      </span>
                      <h4 className="font-display text-base uppercase tracking-wide text-text">
                        Beta Reel
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={equippedItems.avatar === "avatar.gen.beta-reel" || isPending}
                    onClick={() => handleEquip("avatar", "avatar.gen.beta-reel")}
                    className={`mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all focus-visible:outline-2 focus-visible:outline-gold ${
                      equippedItems.avatar === "avatar.gen.beta-reel"
                        ? "border border-gold/40 bg-gold/20 text-gold"
                        : "border border-white/20 bg-surface text-text hover:border-gold hover:text-gold"
                    }`}
                  >
                    {equippingSlot === "avatar"
                      ? "Equipping…"
                      : equippedItems.avatar === "avatar.gen.beta-reel"
                      ? "Equipped ✓"
                      : "Equip Avatar"}
                  </button>
                </div>

                {/* 2. Beta Cassette Frame */}
                <div className="flex flex-col items-center justify-between rounded-lg border border-white/10 bg-bg/80 p-4 text-center">
                  <div className="flex flex-col items-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border-2 border-gold bg-[#12131a] shadow-[0_0_16px_3px_rgba(245,197,24,0.45)]">
                      <span className="font-display text-sm uppercase tracking-widest text-gold">
                        BETA
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Frame
                      </span>
                      <h4 className="font-display text-base uppercase tracking-wide text-text">
                        Beta Cassette
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={equippedItems.frame === "frame.beta" || isPending}
                    onClick={() => handleEquip("frame", "frame.beta")}
                    className={`mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all focus-visible:outline-2 focus-visible:outline-gold ${
                      equippedItems.frame === "frame.beta"
                        ? "border border-gold/40 bg-gold/20 text-gold"
                        : "border border-white/20 bg-surface text-text hover:border-gold hover:text-gold"
                    }`}
                  >
                    {equippingSlot === "frame"
                      ? "Equipping…"
                      : equippedItems.frame === "frame.beta"
                      ? "Equipped ✓"
                      : "Equip Frame"}
                  </button>
                </div>

                {/* 3. Betamax Tagline */}
                <div className="flex flex-col items-center justify-between rounded-lg border border-white/10 bg-bg/80 p-4 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-full items-center justify-center rounded-lg border border-gold/30 bg-surface/50 px-3">
                      <p className="font-display text-xs tracking-wide text-gold/90">
                        &ldquo;Betamax was better&rdquo;
                      </p>
                    </div>
                    <div className="mt-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Tagline
                      </span>
                      <h4 className="font-display text-base uppercase tracking-wide text-text">
                        Betamax
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={equippedItems.tagline === "tagline.betamax" || isPending}
                    onClick={() => handleEquip("tagline", "tagline.betamax")}
                    className={`mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all focus-visible:outline-2 focus-visible:outline-gold ${
                      equippedItems.tagline === "tagline.betamax"
                        ? "border border-gold/40 bg-gold/20 text-gold"
                        : "border border-white/20 bg-surface text-text hover:border-gold hover:text-gold"
                    }`}
                  >
                    {equippingSlot === "tagline"
                      ? "Equipping…"
                      : equippedItems.tagline === "tagline.betamax"
                      ? "Equipped ✓"
                      : "Equip Tagline"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
