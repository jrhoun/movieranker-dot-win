"use client";

import { useEffect, useRef, useState } from "react";

export default function MarqueeInfoTooltip() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-label="What is the weekly marquee theme?"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className="flex size-5 items-center justify-center rounded-full bg-white/5 font-mono text-[11px] font-bold text-muted ring-1 ring-white/10 transition-colors duration-150 hover:bg-gold/20 hover:text-gold hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
      >
        i
      </button>

      {/* Popover Tooltip Box */}
      <div
        role="tooltip"
        className={`absolute left-0 top-full z-30 mt-2 w-72 sm:w-80 rounded-xl border border-gold/40 bg-surface/98 p-4 text-left shadow-2xl backdrop-blur-md transition-all duration-200 ease-out ${
          open
            ? "visible translate-y-0 opacity-100 scale-100"
            : "pointer-events-none invisible -translate-y-1 opacity-0 scale-95"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 font-display text-xs uppercase tracking-widest text-gold">
            <span>✦</span>
            <span>Weekly Marquee Theme</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close tooltip"
            className="text-muted hover:text-text text-xs p-0.5"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-text">
          A limited-time, hand-picked pack of movies ready to rank in under 5 minutes.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Rotates weekly — rank the movies head-to-head, earn bonus XP, and see how your final ranking compares to the rest of the community.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-white/5 text-[10px] font-medium text-muted">
          <span className="rounded bg-white/5 px-2 py-0.5 ring-1 ring-white/5">⏱️ ~5 min ranking</span>
          <span className="rounded bg-gold/10 px-2 py-0.5 text-gold ring-1 ring-gold/20">✨ Bonus XP</span>
          <span className="rounded bg-white/5 px-2 py-0.5 ring-1 ring-white/5">📊 Community Stats</span>
        </div>
      </div>
    </div>
  );
}
