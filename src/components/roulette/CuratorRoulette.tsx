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
import MoviePoster from "@/components/list/MoviePoster";

/** How many posters from a pack's roster ride the filmstrip. */
const FILMSTRIP_SIZE = 6;

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
  // Announced once, when the spin settles — the rapid mid-spin churn itself
  // is hidden from assistive tech (see aria-hidden below) so this is the only
  // thing a screen reader user hears about a spin.
  const [announcement, setAnnouncement] = useState("");

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  function handleSpin() {
    if (isSpinning) return;
    setIsSpinning(true);

    const totalSteps = 16;
    let currentStep = 0;
    let delay = 60;
    // Tracks the pack shown on the PREVIOUS frame of this spin, not the one
    // selected before the spin started. `step` is one long-lived closure for
    // the whole spin (state updates don't re-run it), so reading
    // `selectedPack` here would keep excluding only the pre-spin pack on every
    // frame — letting the same pack land on two consecutive frames mid-spin.
    let previousSlug = selectedPack.slug;

    function step() {
      currentStep++;
      const nextPack = getRandomMicroPack(previousSlug);
      previousSlug = nextPack.slug;
      setSelectedPack(nextPack);

      // A real reel blurs past individual frames at speed — no distinct
      // click per frame — and only catches audibly as it decelerates. Skip
      // every other click during the fast first half so it ratchets rather
      // than machine-guns, and ramp the volume up as it settles.
      const isFastHalf = currentStep <= totalSteps / 2;
      if (!isFastHalf || currentStep % 2 === 0) {
        const intensity = 0.5 + 0.5 * (currentStep / totalSteps);
        playShutterClick(undefined, intensity);
      }

      if (currentStep < totalSteps) {
        // Progressively ease out / slow down
        delay = Math.floor(60 + Math.pow(currentStep / totalSteps, 2.2) * 220);
        spinTimeoutRef.current = setTimeout(step, delay);
      } else {
        // Finished spin
        setIsSpinning(false);
        setHasSpun(true);
        setAnnouncement(
          `Landed on ${nextPack.title}: ${nextPack.subtitle}. Featuring ${nextPack.sampleTitles
            .slice(0, 3)
            .join(", ")}.`,
        );
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
      // No aria-label here on purpose: home-client.tsx already wraps this
      // component in <section aria-label="Curator Roulette">, and a second
      // label on this plain div would either be ignored (no role) or, if a
      // role were added, duplicate the section's accessible name.
      className={`relative overflow-hidden rounded-2xl border border-gold/30 bg-surface/90 p-5 shadow-2xl backdrop-blur-md ring-1 ring-gold/20 sm:p-7 ${className}`}
    >
      {/* Ambient Spotlight with Dynamic Pack Color */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: selectedPack.accentColor || "#f5c518" }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Left column: Header, badge, and description.
            aria-busy flags this region as mid-update to assistive tech; the
            16-step churn underneath is marked aria-hidden so a screen reader
            hears silence (not sixteen rapid-fire announcements) during a
            spin, and the sr-only status region below announces the landed
            pack once, when it settles. */}
        <div className="flex-1 space-y-3" aria-busy={isSpinning}>
          <div aria-hidden={isSpinning || undefined}>
            {/* Was two badges: a generic "Spin the Reel · Instant Start"
                instruction pill plus this pack-identity badge. The instruction
                pill re-explained what the card already shows (a title, six
                posters, one gold button) — cut. The pack badge stays: it's
                content (which pack this is), not chrome. */}
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-bg shadow-sm"
              style={{ backgroundColor: selectedPack.accentColor }}
            >
              {selectedPack.badge}
            </span>

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

            {/* Featured Films Filmstrip — real poster art riding a sprocket-holed
                strip (see .cb-holes in globals.css), cycling with each spin
                step and settling on the landed pack's roster. The strip itself
                is decorative (posters carry empty alt text, same as
                MoviePoster everywhere else); the sr-only list right below it
                is the accessible source of truth for the film names, so
                nothing readable is lost by upgrading the old text chips to
                imagery. */}
            {/* No "Featured Candidates:" caption above the strip — six
                posters riding a filmstrip read as posters, not a labeled
                chart; the sr-only list below still names them for a screen
                reader. w-fit + max-w-full: this box (and the sprocket-hole
                bars, which span inset-x-0 of IT) sizes to the posters'
                actual content width instead of stretching to the column's
                full width — that stretch used to leave ~450px of dead
                sprocket track on wide screens for a strip whose six posters
                only need ~366px. overflow-x-auto is a narrow-viewport
                fallback: at 390px there's a few px to spare so it never
                engages, but a little narrower (e.g. 360px) the strip
                scrolls instead of clipping a poster or forcing the card
                wider than its column. */}
            <div className="relative mt-3.5 w-fit max-w-full overflow-x-auto overflow-y-hidden no-scrollbar rounded-md bg-black/40 px-2 py-3.5">
              <div aria-hidden="true" className="cb-holes absolute inset-x-0 top-0 z-[1] h-2.5" />
              <div aria-hidden="true" className="cb-holes absolute inset-x-0 bottom-0 z-[1] h-2.5" />
              <div aria-hidden="true" className="relative z-0 flex w-fit gap-1.5">
                {selectedPack.movies.slice(0, FILMSTRIP_SIZE).map((movie) => (
                  <div
                    key={movie.tmdbId}
                    className={`w-11 shrink-0 sm:w-14 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:scale-100 motion-reduce:opacity-100 ${
                      isSpinning ? "scale-90 opacity-60" : "scale-100 opacity-100"
                    }`}
                  >
                    <MoviePoster
                      title={movie.title}
                      posterPath={movie.posterPath ?? null}
                      tmdbId={movie.tmdbId}
                    />
                  </div>
                ))}
              </div>
            </div>
            <ul className="sr-only">
              {selectedPack.sampleTitles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </div>

          <div className="sr-only" role="status" aria-live="polite">
            {announcement}
          </div>
        </div>

        {/* Right column: Theatrical Reel Animation & Instant Launch Actions */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-3 sm:flex-row lg:flex-col self-center lg:self-center">
          <button
            type="button"
            onClick={() => handleStart(selectedPack)}
            disabled={isSpinning}
            className="flex min-h-12 w-full sm:w-auto lg:w-48 items-center justify-center gap-2 rounded-full bg-gold px-7 text-sm font-bold uppercase tracking-wider text-bg shadow-xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(245,197,24,0.4)] focus-visible:outline-2 focus-visible:outline-gold active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <span aria-hidden="true" className="text-base">✦</span>
            <span>Rank This Reel</span>
          </button>

          {/* Ghost/text action, not a second pill: this used to match "Rank
              This Reel" almost exactly (same width classes, same rounded-full
              pill shape, same bold-uppercase treatment, just a duller fill),
              which read as two stacked primaries. Rank is the one dominant
              action on this card; Spin is a quiet, low-commitment "try
              another" — no fill, no ring, just text that golds on hover. */}
          <button
            type="button"
            onClick={handleSpin}
            disabled={isSpinning}
            className={`flex min-h-11 w-full sm:w-auto lg:w-48 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-wider text-muted transition-colors duration-200 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95 cursor-pointer disabled:opacity-50 ${
              isSpinning ? "animate-pulse" : ""
            }`}
          >
            <span
              aria-hidden="true"
              // animate-spin (continuous) rather than a one-shot rotate-360
              // transition: a single 360deg turn over the ~2s spin either
              // freezes mid-spin or has to unwind backwards from 360deg to
              // 0deg the moment the spin settles, which reads as the reel
              // reversing right when the result lands. motion-reduce kills
              // the loop locally since this element is decorative, not a
              // blocking loading indicator.
              className={`text-sm ${
                isSpinning ? "animate-spin scale-125 motion-reduce:animate-none" : ""
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
