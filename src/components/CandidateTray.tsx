"use client";

import { useState } from "react";
import type { TmdbMovieCredit } from "@/lib/tmdb";

const POSTER_BASE = "https://image.tmdb.org/t/p/w92";

export default function CandidateTray({
  candidates,
  onRemove,
  participants,
  onParticipantsChange,
  title,
  onTitleChange,
  onStart,
}: {
  candidates: TmdbMovieCredit[];
  onRemove: (tmdbId: number) => void;
  participants: string[];
  onParticipantsChange: (p: string[]) => void;
  title: string;
  onTitleChange: (t: string) => void;
  onStart: () => void;
}) {
  const [draft, setDraft] = useState("");
  const ready = candidates.length >= 2;

  function addParticipant() {
    const name = draft.trim();
    if (!name || participants.includes(name)) return;
    onParticipantsChange([...participants, name]);
    setDraft("");
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* chosen posters */}
        <div aria-live="polite" className="sr-only">
          {candidates.length} movies selected
        </div>
        <ul className="flex gap-2 overflow-x-auto pb-2">
          {candidates.map((m) => (
            <li key={m.tmdbId} className="shrink-0">
              <button
                type="button"
                onClick={() => onRemove(m.tmdbId)}
                aria-label={`Remove ${m.title}`}
                title={`Remove ${m.title}`}
                className="group relative min-h-11 min-w-11 rounded transition-transform duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
              >
                <span className="block aspect-[2/3] w-14 overflow-hidden rounded ring-1 ring-white/15 transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:ring-accent-red">
                  {m.posterPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${POSTER_BASE}${m.posterPath}`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center p-1 text-center text-[9px] leading-tight text-muted">
                      {m.title}
                    </span>
                  )}
                </span>
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
                ? "Tap a poster up top — or search below — to build your list."
                : "Add at least one more movie."}
            </li>
          )}
        </ul>

        {/* editors */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Session title… e.g. Best Sci-Fi"
            aria-label="Session title"
            className="min-h-11 flex-1 basis-48 rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addParticipant();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add participant…"
              aria-label="Add participant"
              className="min-h-11 w-36 rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
            />
          </form>
          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            title={ready ? undefined : "Pick at least 2 movies to start ranking"}
            className="min-h-11 rounded-full bg-accent px-6 text-sm font-bold text-bg transition-colors duration-200 ease-out hover:bg-text active:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted"
          >
            Start ranking ({candidates.length})
          </button>
        </div>

        {/* participant chips */}
        {participants.length > 0 && (
          <ul aria-label="Participants" className="mt-2 flex flex-wrap gap-1.5">
            {participants.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => onParticipantsChange(participants.filter((x) => x !== p))}
                  aria-label={`Remove participant ${p}`}
                  className="flex min-h-11 items-center gap-1 rounded-full bg-bg px-3 py-1 text-xs text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:text-accent-red active:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {p} <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
