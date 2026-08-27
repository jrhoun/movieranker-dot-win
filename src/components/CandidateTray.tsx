"use client";

import { useState } from "react";
import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import type { TmdbMovieCredit } from "@/lib/tmdb";
import { tmdbMovieUrl } from "@/lib/tmdb";
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

  if (candidates.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-surface/95 backdrop-blur-md shadow-2xl">
      <div className="mx-auto max-w-7xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
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
            <section
              aria-label="List settings and selections"
              inert={!open}
              className="max-h-[60dvh] overflow-y-auto thin-scrollbar pr-1 pt-3 pb-3 space-y-4"
            >
              {/* Zone 1: List title & Participants */}
              <div className="rounded-xl border border-white/5 bg-surface/80 p-4 ring-1 ring-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 grow basis-56 flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => onTitleChange(e.target.value)}
                      placeholder="List title… (e.g. Marvel Ranking)"
                      aria-label="List title"
                      className="min-h-10 w-full max-w-xs shrink-0 rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
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
                        placeholder="Add friend's name…"
                        aria-label="Add participant"
                        className="min-h-10 w-full max-w-44 min-w-0 rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
                      />
                      <button
                        type="submit"
                        className="min-h-10 shrink-0 rounded-full bg-surface-raised px-4 text-xs font-bold text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        + Add
                      </button>
                    </form>
                  </div>
                  <p className="text-xs text-muted">First names only — no emails needed.</p>
                </div>
                {participants.length > 0 && (
                  <ul aria-label="Participants" className="flex flex-wrap gap-1.5 pt-1">
                    {participants.map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          onClick={() => onParticipantsChange(participants.filter((x) => x !== p))}
                          aria-label={`Remove participant ${p}`}
                          className="flex min-h-8 items-center gap-1 rounded-full bg-bg px-3 py-0.5 text-xs text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:text-accent-red active:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {p} <span aria-hidden>×</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Zone 2: Selections Grid with sticky action bar */}
              <div>
                <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/95 py-2.5 backdrop-blur border-b border-white/5">
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
                          ? "min-h-9 bg-accent-red text-white focus-visible:outline-accent-red"
                          : "min-h-9 min-w-9 text-muted hover:text-accent-red focus-visible:outline-accent-red"
                      }`}
                    >
                      {confirmClear ? "Sure? Tap again" : "Clear all"}
                    </button>
                  )}
                </div>
                <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 items-stretch">
                  {candidates.map((m) => (
                    <li
                      key={m.tmdbId}
                      className="group flex flex-col justify-between rounded-lg bg-surface/60 p-1.5 ring-1 ring-white/5 transition-colors hover:ring-white/15"
                    >
                      <div className="flex flex-col flex-1">
                        <a
                          href={tmdbMovieUrl(m.tmdbId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`View ${m.title} on TMDB (opens in new tab)`}
                          className="group block rounded focus-visible:outline-2 focus-visible:outline-gold"
                        >
                          <MoviePoster
                            title={m.title}
                            posterPath={m.posterPath}
                            className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                          />
                        </a>
                        <p className="mt-1.5 line-clamp-2 min-h-[2rem] flex-1 text-center text-xs font-medium leading-tight text-text">
                          <a
                            href={tmdbMovieUrl(m.tmdbId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`View ${m.title} on TMDB (opens in new tab)`}
                            className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                          >
                            {m.title}
                          </a>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onRemove(m.tmdbId);
                          setConfirmClear(false);
                        }}
                        aria-label={`Remove ${m.title}`}
                        className="mt-2 min-h-8 w-full shrink-0 rounded bg-white/5 py-1 text-xs text-muted uppercase tracking-wide transition-colors duration-200 ease-out hover:bg-accent-red/20 hover:text-accent-red focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-red"
                      >
                        × Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>

        {/* Collapsed Bar: ultra-slim single row dock */}
        <div aria-live="polite" className="sr-only">
          {candidates.length} movies selected
        </div>
        <div className="flex items-center justify-between gap-3 pt-2 pb-1">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <span className="font-display shrink-0 text-lg uppercase leading-none tracking-wide text-gold">
              {candidates.length} selected
            </span>
            <ul aria-label="Selected movies" className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {candidates.map((m) => (
                <li key={m.tmdbId} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onRemove(m.tmdbId)}
                    aria-label={`Remove ${m.title}`}
                    title={`Remove ${m.title}`}
                    className="group relative block w-10 rounded transition-transform duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
                  >
                    <MoviePoster
                      title={m.title}
                      posterPath={m.posterPath}
                      className="ring-white/15 transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:ring-accent-red"
                    />
                    <span
                      aria-hidden
                      className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-red text-[9px] font-bold text-white opacity-60 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      ×
                    </span>
                  </button>
                </li>
              ))}
              {!ready && (
                <li className="flex items-center px-1 text-xs text-muted shrink-0">
                  Add at least 1 more movie to rank
                </li>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpen((o) => !o);
                setConfirmClear(false);
              }}
              aria-expanded={open}
              aria-controls="tray-panel"
              aria-label={open ? "Collapse details" : "Expand details"}
              className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-raised px-3.5 text-xs font-semibold text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span>{open ? "Collapse" : "Details"}</span>
              <span
                aria-hidden
                className={`inline-block transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
              >
                ▲
              </span>
            </button>
            <button
              type="button"
              onClick={onStart}
              disabled={!ready}
              title={ready ? undefined : "Pick at least 2 movies to start ranking"}
              className="min-h-10 shrink-0 rounded-full bg-gold px-5 text-xs font-bold uppercase tracking-wider text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted disabled:transform-none shadow-md"
            >
              Start ranking ({candidates.length}) →
            </button>
          </div>
        </div>

        {/* Cap notices: non-blocking, muted, one line each. */}
        {(atCap || showSizeHint) && (
          <p role="status" className="pt-1 text-xs text-muted text-center sm:text-left">
            {atCap
              ? `List limit reached (${MAX_LIST_SIZE} movies).`
              : "Heads up: rankings this large take hours — consider splitting into multiple nights."}
          </p>
        )}
      </div>
    </div>
  );
}
