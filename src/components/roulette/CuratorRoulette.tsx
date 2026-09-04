"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CURATOR_MICRO_PACKS,
  getRandomMicroPack,
  launchMicroPackSession,
  type CuratorMicroPack,
} from "@/lib/curator-roulette";
import { playShutterClick, playGoldenChime } from "@/lib/audio";
import { loadSession, clearSession, type PlaySession } from "@/lib/session";

export interface CuratorRouletteProps {
  initialPack?: CuratorMicroPack;
  className?: string;
}

export default function CuratorRoulette({
  initialPack,
  className = "",
}: CuratorRouletteProps) {
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState<CuratorMicroPack>(
    initialPack ?? CURATOR_MICRO_PACKS[0],
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [existingSession, setExistingSession] = useState<PlaySession | null>(null);

  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  function handleSpin() {
    if (isSpinning) return;
    setIsSpinning(true);

    const totalSteps = 16;
    let currentStep = 0;
    let delay = 60;

    function step() {
      currentStep++;
      const nextPack = getRandomMicroPack(selectedPack.slug);
      setSelectedPack(nextPack);
      playShutterClick();

      if (currentStep < totalSteps) {
        // Progressively ease out / slow down
        delay = Math.floor(60 + Math.pow(currentStep / totalSteps, 2.2) * 220);
        spinTimeoutRef.current = setTimeout(step, delay);
      } else {
        // Finished spin
        setIsSpinning(false);
        setHasSpun(true);
        playGoldenChime();
      }
    }

    step();
  }

  function handleStart(pack: CuratorMicroPack) {
    const existing = loadSession();
    if (existing && (existing.movies?.length ?? 0) >= 2) {
      setExistingSession(existing);
      setShowConfirmModal(true);
      return;
    }
    executeLaunch(pack);
  }

  function executeLaunch(pack: CuratorMicroPack) {
    launchMicroPackSession(pack);
    router.push("/r/play");
  }

  function handleStartFresh() {
    clearSession();
    setShowConfirmModal(false);
    executeLaunch(selectedPack);
  }

  function handleResumeSaved() {
    setShowConfirmModal(false);
    router.push("/r/play");
  }

  return (
    <div
      aria-label="Curator Roulette (Spin the Reel)"
      className={`relative overflow-hidden rounded-2xl border border-gold/30 bg-surface/90 p-5 shadow-2xl backdrop-blur-md ring-1 ring-gold/20 sm:p-7 ${className}`}
    >
      {/* Ambient Spotlight with Dynamic Pack Color */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: selectedPack.accentColor || "#f5c518" }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left column: Header, badge, and description */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-gold ring-1 ring-gold/30">
              <span aria-hidden="true" className="text-sm">🎬</span>
              <span>Spin the Reel · Instant Start</span>
            </span>
            <span
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-bg shadow-sm"
              style={{ backgroundColor: selectedPack.accentColor }}
            >
              {selectedPack.badge}
            </span>
          </div>

          <div>
            <p className="font-display text-xs uppercase tracking-[0.25em] text-muted">
              {selectedPack.subtitle}
            </p>
            <h3
              className={`font-display text-3xl uppercase leading-none tracking-wide text-text sm:text-4xl transition-all duration-150 ${
                isSpinning ? "opacity-60 scale-95" : "opacity-100 scale-100"
              }`}
            >
              {selectedPack.title}
            </h3>
          </div>

          <p className="max-w-xl text-xs leading-relaxed text-muted sm:text-sm">
            {selectedPack.blurb}
          </p>

          {/* Sample Films Ticker */}
          <div className="pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted/80">
              Featured Candidates:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {selectedPack.sampleTitles.map((title, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-text ring-1 ring-white/10"
                >
                  <span className="text-[10px] text-gold" aria-hidden="true">✦</span>
                  <span>{title}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Theatrical Reel Animation & Instant Launch Actions */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-3 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={() => handleStart(selectedPack)}
            disabled={isSpinning}
            className="flex min-h-12 w-full sm:w-auto lg:w-48 items-center justify-center gap-2 rounded-full bg-gold px-7 text-sm font-bold uppercase tracking-wider text-bg shadow-xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(245,197,24,0.4)] focus-visible:outline-2 focus-visible:outline-gold active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <span aria-hidden="true" className="text-base">✦</span>
            <span>Rank This Reel</span>
          </button>

          <button
            type="button"
            onClick={handleSpin}
            disabled={isSpinning}
            className={`flex min-h-11 w-full sm:w-auto lg:w-48 items-center justify-center gap-2 rounded-full bg-surface-raised px-5 text-xs font-bold uppercase tracking-wider text-text ring-1 ring-white/15 transition-all duration-200 hover:bg-white/10 hover:text-gold hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-gold active:scale-95 cursor-pointer ${
              isSpinning ? "animate-pulse" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-sm transition-transform duration-500 ${
                isSpinning ? "rotate-360 scale-125" : ""
              }`}
            >
              🎬
            </span>
            <span>{isSpinning ? "Spinning Reel…" : hasSpun ? "Spin Again" : "Spin Another"}</span>
          </button>
        </div>
      </div>

      {/* Unfinished Session Conflict Dialog */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="roulette-confirm-title"
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
                id="roulette-confirm-title"
                className="font-display text-xl uppercase tracking-wider text-text"
              >
                Unfinished Ranking in Progress
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
              You already have an active ranking session for &ldquo;
              <strong className="text-text">{existingSession?.title || "Movie ranking"}</strong>
              &rdquo;. Would you like to resume your existing session or start fresh with &ldquo;
              <strong className="text-gold">{selectedPack.title}</strong>&rdquo;?
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleResumeSaved}
                className="min-h-11 rounded-full bg-surface-raised px-5 text-sm font-semibold text-text ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-gold cursor-pointer"
              >
                Resume Saved
              </button>
              <button
                type="button"
                onClick={handleStartFresh}
                className="min-h-11 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
              >
                Start Reel Ranking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
