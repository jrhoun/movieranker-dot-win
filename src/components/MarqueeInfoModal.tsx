"use client";

import { useEffect, useState } from "react";

export default function MarqueeInfoModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted ring-1 ring-white/10 transition-all duration-200 ease-out hover:bg-gold/10 hover:text-gold hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
      >
        <span aria-hidden="true" className="text-gold">✦</span>
        <span>What is this?</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="marquee-modal-title"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/40 bg-surface p-6 sm:p-7 shadow-2xl ring-1 ring-white/10 text-left"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-widest text-gold mb-1">
                  <span>✦</span>
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
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="rounded-full p-1.5 text-muted hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-text">
              <p className="text-muted text-sm sm:text-base">
                A limited-time, hand-picked pack of movies ready to rank in under 5 minutes — perfect for settling debates on movie night without building a list from scratch.
              </p>

              {/* 3 Core Points */}
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3.5 ring-1 ring-white/5">
                  <span className="text-xl shrink-0 mt-0.5">⏳</span>
                  <div>
                    <h3 className="font-display text-base uppercase tracking-wide text-gold">
                      Rotates Weekly
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Every week brings a fresh theme — from neon sci-fi to high-tension single-room thrillers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3.5 ring-1 ring-white/5">
                  <span className="text-xl shrink-0 mt-0.5">📊</span>
                  <div>
                    <h3 className="font-display text-base uppercase tracking-wide text-gold">
                      Community Stats &amp; Consensus
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Once you finish ranking, see live consensus charts showing how the community voted on the same matchups.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3.5 ring-1 ring-white/5">
                  <span className="text-xl shrink-0 mt-0.5">✨</span>
                  <div>
                    <h3 className="font-display text-base uppercase tracking-wide text-gold">
                      Bonus XP &amp; Theme Pitches
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Earn extra XP toward your career rank, and pitch your own custom movie themes once you reach Level 3.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto min-h-11 rounded-full bg-gold px-8 text-xs font-bold uppercase tracking-wider text-bg shadow-lg transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-center"
              >
                ✦ Got It, Let&apos;s Rank!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
