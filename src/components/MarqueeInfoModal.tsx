"use client";

import { useRef } from "react";
import { MIN_PROPOSAL_LEVEL, rankForLevel } from "@/lib/gamification";

/**
 * "What is this?" — the weekly Marquee explainer.
 *
 * Uses a native <dialog> opened with showModal() rather than a hand-rolled
 * `fixed inset-0` overlay. The browser puts a modal dialog in the top layer, so
 * it cannot be clipped or mis-stacked by an ancestor's overflow, transform,
 * filter or z-index — which is exactly how the previous version broke when this
 * trigger moved into the hero. It also brings Escape-to-close, a focus trap,
 * focus restoration and an inert background for free, all of which the old
 * version either hand-wrote or did without.
 *
 * The typography reset on the panel is deliberate: the top layer changes where
 * a dialog PAINTS, not where it INHERITS from, so a trigger placed inside
 * styled text would otherwise drag uppercase, letter-spacing and a display face
 * into the dialog with it.
 */
export default function MarqueeInfoModal() {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted ring-1 ring-white/10 transition-all duration-200 ease-out hover:bg-gold/10 hover:text-gold hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
      >
        <span aria-hidden="true" className="text-gold">✦</span>
        <span>What is this?</span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="marquee-modal-title"
        // Clicking the backdrop targets the dialog itself; the panel inside
        // stops propagation by simply not being the event target.
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-full max-w-lg bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <div className="animate-fade-in relative overflow-hidden rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl ring-1 ring-white/10 sm:p-7">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-widest text-gold">
                <span aria-hidden="true">✦</span>
                <span>Feature Guide</span>
              </div>
              <h2
                id="marquee-modal-title"
                className="font-display text-2xl uppercase tracking-wide text-text sm:text-3xl"
              >
                This Week&apos;s Marquee
              </h2>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close dialog"
              className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-4 text-sm leading-relaxed text-text">
            <p className="text-sm text-muted sm:text-base">
              A hand-picked set of six films, ready to rank in under five minutes. Everyone gets the
              same set, so your order is worth comparing — and there is a thread running through
              them for you to work out.
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3.5 ring-1 ring-white/5">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-xl">⏳</span>
                <div>
                  <h3 className="font-display text-base uppercase tracking-wide text-gold">
                    A new set every Monday
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Themes rotate at midnight UTC — from neon sci-fi to high-tension single-room
                    thrillers. Each set runs for the whole week.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3.5 ring-1 ring-white/5">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-xl">📊</span>
                <div>
                  <h3 className="font-display text-base uppercase tracking-wide text-gold">
                    Compare with everyone else
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Finish ranking to see consensus charts showing how everyone else settled the
                    same matchups.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3.5 ring-1 ring-white/5">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-xl">✨</span>
                <div>
                  <h3 className="font-display text-base uppercase tracking-wide text-gold">
                    Bonus XP and theme pitches
                  </h3>
                  {/* Read from the constant the API actually enforces. This said
                      Level 3 while /api/proposals rejected anything under 20,
                      so following it earned you an error. */}
                  <p className="mt-0.5 text-xs text-muted">
                    Crack the connection for bonus XP toward your career rank, and pitch your own
                    themes once you reach Level {MIN_PROPOSAL_LEVEL} ({rankForLevel(MIN_PROPOSAL_LEVEL)}).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="min-h-11 w-full cursor-pointer rounded-full bg-gold px-8 text-center text-xs font-bold uppercase tracking-wider text-bg shadow-lg transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 sm:w-auto"
            >
              ✦ Got it, let&apos;s rank
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
