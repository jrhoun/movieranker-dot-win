"use client";

import type { RankedMovie } from "@/lib/ranking";

const POSTER_BASE = "https://image.tmdb.org/t/p/w92";

export default function ParkedStrip({
  movies,
  onReinstate,
}: {
  movies: RankedMovie[];
  onReinstate: (tmdbId: number) => void;
}) {
  if (movies.length === 0) return null;
  return (
    <section aria-label="Parked movies" className="px-3 pb-2 sm:px-6">
      <p className="text-xs text-muted">Haven&apos;t seen — tap to bring back</p>
      <ul className="flex gap-2 overflow-x-auto py-1.5">
        {movies.map((m) => (
          <li key={m.tmdbId}>
            <button
              type="button"
              onClick={() => onReinstate(m.tmdbId)}
              aria-label={`Bring back ${m.title}`}
              className="w-16 shrink-0 rounded transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
            >
              <div className="aspect-[2/3] w-full overflow-hidden rounded bg-surface opacity-50 ring-1 ring-white/10 hover:opacity-80">
                {m.posterPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${POSTER_BASE}${m.posterPath}`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-muted">
                    {m.title}
                  </div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
