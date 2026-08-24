"use client";

import type { RankedMovie } from "@/lib/ranking";

const POSTER_BASE = "https://image.tmdb.org/t/p/w92";

/** "Your movies" strip: every movie in the session. Tap toggles the parked flag
 * (parked = haven't seen, excluded from ranking). Collapsible everywhere. */
export default function ParkedStrip({
  movies,
  onToggle,
}: {
  movies: RankedMovie[];
  onToggle: (tmdbId: number, toParked: boolean) => void;
}) {
  if (movies.length === 0) return null;
  const parkedCount = movies.filter((m) => m.parked).length;
  return (
    <details open className="px-3 pb-2 sm:px-6">
      <summary className="cursor-pointer list-none text-xs text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        Your movies ({movies.length})
        {parkedCount > 0 && ` · ${parkedCount} haven't seen`}
        <span aria-hidden="true" className="ml-2 opacity-60">
          ✕ = haven&apos;t seen
        </span>
      </summary>
      <ul className="flex gap-2 overflow-x-auto py-1.5">
        {movies.map((m) => (
          <li key={m.tmdbId}>
            <button
              type="button"
              onClick={() => onToggle(m.tmdbId, !m.parked)}
              aria-pressed={m.parked}
              aria-label={
                m.parked
                  ? `Include ${m.title} in ranking`
                  : `Mark ${m.title} as haven't seen`
              }
              title={m.title}
              style={{ touchAction: "manipulation" }}
              className="w-14 shrink-0 rounded transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
            >
              <div
                className={`relative aspect-[2/3] w-full overflow-hidden rounded bg-surface ring-1 ring-white/10 hover:ring-accent ${
                  m.parked ? "opacity-40" : ""
                }`}
              >
                {m.posterPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${POSTER_BASE}${m.posterPath}`}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-muted">
                    {m.title}
                  </div>
                )}
                {m.parked && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded-full bg-black/80 text-[9px] leading-none font-bold text-text ring-1 ring-white/20"
                  >
                    ✕
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
