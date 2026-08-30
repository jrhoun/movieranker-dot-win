"use client";

import type { RankedMovie } from "@/lib/ranking";
import { posterPlaceholderClass } from "@/lib/poster-placeholder";

const POSTER_BASE = "https://image.tmdb.org/t/p/w185";

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
    <details
      open
      className="border-t border-white/10 bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6"
    >
      <summary className="cursor-pointer list-none py-2.5 sm:py-3 block text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
        Your movies ({movies.length})
        {parkedCount > 0 && ` · ${parkedCount} haven't seen`}
        <span aria-hidden="true" className="ml-2 font-normal text-muted/70 lowercase tracking-normal">
          (✕ = haven&apos;t seen)
        </span>
      </summary>
      <ul className="thin-scrollbar flex gap-3 overflow-x-auto py-2 snap-x snap-mandatory scroll-px-3">
        {movies.map((m) => (
          <li key={m.tmdbId} className="snap-start shrink-0">
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
              className="w-16 sm:w-20 md:w-24 rounded transition-transform duration-200 ease-out hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95"
            >
              <div
                className={`relative aspect-[2/3] w-full overflow-hidden rounded bg-surface ring-1 ring-white/10 hover:ring-gold ${
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
                  <div
                    className={`flex h-full w-full items-center justify-center p-1.5 text-center ${posterPlaceholderClass(m.tmdbId)}`}
                  >
                    <span className="line-clamp-3 text-[10px] font-semibold uppercase leading-tight tracking-wide text-text/90">
                      {m.title}
                    </span>
                  </div>
                )}
                {m.parked && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 bottom-1 flex size-5 sm:size-6 items-center justify-center rounded-full bg-black/85 text-xs font-bold text-white ring-1 ring-white/20 shadow"
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
