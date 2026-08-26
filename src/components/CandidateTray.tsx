"use client";

import { useState } from "react";
import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import type { TmdbMovieCredit } from "@/lib/tmdb";
import { MAX_LIST_SIZE, SOFT_WARN_AT, parseParticipantNames } from "@/lib/tray";

export default function CandidateTray({
  candidates,
  onRemove,
  onClearAll,
  participants,
  onParticipantsChange,
  title,
  onTitleChange,
  onStart,
}: {
  candidates: TmdbMovieCredit[];
  onRemove: (tmdbId: number) => void;
  onClearAll: () => void;
  participants: string[];
  onParticipantsChange: (p: string[]) => void;
  title: string;
  onTitleChange: (t: string) => void;
  onStart: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const ready = candidates.length >= 2;

  // Gentle heads-up shown once per browser session when the list crosses the
  // soft-warning size. Uses the "adjusting state when props change" render
  // pattern (lint forbids setState directly in effects); sessionStorage flag
  // keeps it once-per-session across reloads.
  const [seenCount, setSeenCount] = useState(-1);
  const [showSizeHint, setShowSizeHint] = useState(false);
  if (seenCount !== candidates.length) {
    setSeenCount(candidates.length);
    if (
      candidates.length >= SOFT_WARN_AT &&
      typeof window !== "undefined"
    ) {
      try {
        const seen = sessionStorage.getItem("mr-cap-hint") === "1";
        sessionStorage.setItem("mr-cap-hint", "1");
        if (!seen) setShowSizeHint(true);
      } catch {
        // ponytail: storage-blocked browsers get the hint once per page-load instead
        setShowSizeHint(true);
      }
    }
  }
  const atCap = candidates.length >= MAX_LIST_SIZE;

  function addParticipants() {
    const names = parseParticipantNames(draft);
    if (!names.length) return;
    const merged = [...participants];
    for (const n of names) if (!merged.includes(n)) merged.push(n);
    onParticipantsChange(merged);
    setDraft("");
  }

  function clearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onClearAll();
    setConfirmClear(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Expanded sheet: opens upward (200ms ease-out grid-rows animation;
            reduced-motion kill-switch in globals.css flattens it). inert while
            collapsed so its controls leave the tab order. */}
        <div
          id="tray-panel"
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <section aria-label="Your selections" inert={!open}>
              <div className="flex items-center justify-between pt-3">
                <MarqueeHeading as="h3">
                  Your selections ({candidates.length})
                </MarqueeHeading>
                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    onBlur={() => setConfirmClear(false)}
                    className={`ml-3 shrink-0 rounded-full px-4 text-xs font-medium uppercase tracking-wide transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      confirmClear
                        ? "min-h-11 bg-accent-red text-white focus-visible:outline-accent-red"
                        : "min-h-11 min-w-11 text-muted hover:text-accent-red focus-visible:outline-accent-red"
                    }`}
                  >
                    {confirmClear ? "Sure? Tap again" : "Clear all"}
                  </button>
                )}
              </div>
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {candidates.map((m) => (
                  <li key={m.tmdbId} className="text-center">
                    <MoviePoster title={m.title} posterPath={m.posterPath} />
                    <p className="mt-1 truncate text-sm text-text">{m.title}</p>
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(m.tmdbId);
                        setConfirmClear(false);
                      }}
                      aria-label={`Remove ${m.title}`}
                      className="mt-0.5 min-h-11 w-full rounded text-xs text-muted uppercase tracking-wide transition-colors duration-200 ease-out hover:text-accent-red focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-red"
                    >
                      × Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Collapsed bar */}
        <div aria-live="polite" className="sr-only">
          {candidates.length} movies selected
        </div>
        <div className="flex items-center gap-2 pt-2 pb-1">
          <span className="font-display shrink-0 text-xl uppercase leading-none tracking-wide">
            {candidates.length} selected
          </span>
          <ul aria-label="Selected movies" className="flex flex-1 gap-2 overflow-x-auto pb-2">
            {candidates.map((m) => (
              <li key={m.tmdbId} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onRemove(m.tmdbId)}
                  aria-label={`Remove ${m.title}`}
                  title={`Remove ${m.title}`}
                  className="group relative block w-12 rounded transition-transform duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
                >
                  <MoviePoster title={m.title} posterPath={m.posterPath} className="ring-white/15 transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:ring-accent-red" />
                  <span
                    aria-hidden
                    className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-[10px] font-bold text-white opacity-60 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    ×
                  </span>
                </button>
              </li>
            ))}
            {!ready && (
              <li className="flex items-center px-2 text-xs text-muted">
                {candidates.length === 0
                  ? open
                    ? "Search below to pick your first movie."
                    : "Tap a poster up top — or search below — to build your list."
                  : "Add at least one more movie."}
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setConfirmClear(false);
            }}
            aria-expanded={open}
            aria-controls="tray-panel"
            aria-label={open ? "Collapse tray" : "Expand tray"}
            className="min-h-11 min-w-11 shrink-0 rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span
              aria-hidden
              className={`inline-block transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
            >
              ▲
            </span>
          </button>
        </div>
        {/* Cap notices: non-blocking, muted, one line each. */}
        {(atCap || showSizeHint) && (
          <p role="status" className="pb-1 text-xs text-muted">
            {atCap
              ? `List limit reached (${MAX_LIST_SIZE} movies).`
              : "Heads up: rankings this large take hours — consider splitting into multiple nights."}
          </p>
        )}
        {/* Two-zone control strip (density pass): zone 1 = naming (title
            capped at w-56 + condensed participant unit, stacked under lg,
            inline at lg+); zone 2 = Start ranking, prominent right. At 390px
            everything wraps within its column — no horizontal overflow. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1 pb-2">
          <div className="flex min-w-0 grow basis-56 flex-col gap-2 lg:flex-row lg:items-center">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="List title…"
              aria-label="List title"
              className="min-h-11 w-full max-w-56 shrink-0 rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addParticipants();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a name…"
                aria-label="Add participant"
                className="min-h-11 w-full max-w-44 min-w-0 rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
              />
              <button
                type="submit"
                className="min-h-11 shrink-0 rounded-full bg-surface-raised px-4 text-sm font-bold text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                + Add
              </button>
            </form>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            title={ready ? undefined : "Pick at least 2 movies to start ranking"}
            className="ml-auto min-h-11 shrink-0 rounded-full bg-accent px-6 text-sm font-bold text-bg transition-colors duration-200 ease-out hover:bg-text active:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted"
          >
            Start ranking ({candidates.length})
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2">
          <p className="text-xs text-muted">Just first names — no emails needed.</p>
            {participants.length > 0 && (
              <ul aria-label="Participants" className="flex flex-wrap gap-1.5">
                {participants.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => onParticipantsChange(participants.filter((x) => x !== p))}
                      aria-label={`Remove participant ${p}`}
                      className="flex min-h-9 items-center gap-1 rounded-full bg-bg px-3 py-1 text-xs text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:text-accent-red active:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {p} <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
}
