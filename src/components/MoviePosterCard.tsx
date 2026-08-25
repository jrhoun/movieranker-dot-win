"use client";

import type { TmdbMovieCredit } from "@/lib/tmdb";

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

export default function MoviePosterCard({
  movie,
  selected = false,
  onSelect,
}: {
  movie: TmdbMovieCredit;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${selected ? "Remove" : "Add"} ${movie.title} (${movie.releaseYear ?? "?"})`}
      aria-pressed={selected}
      title={selected ? "On your list — tap to remove" : `Add ${movie.title}`}
      className="group relative min-h-11 min-w-11 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
    >
      <div
        className={`aspect-[2/3] w-full overflow-hidden rounded bg-surface transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5 group-active:scale-[0.98] ${
          selected ? "ring-2 ring-gold" : "ring-1 ring-white/10"
        }`}
      >
        {movie.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${POSTER_BASE}${movie.posterPath}`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted">
            {movie.title}
          </div>
        )}
      </div>
      {selected && (
        <span
          aria-hidden
          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-bg shadow"
        >
          ✓
        </span>
      )}
      <p className={`mt-1.5 truncate text-sm ${selected ? "text-gold" : "text-text"}`}>{movie.title}</p>
      <p className="text-xs text-muted">{movie.releaseYear ?? "—"}</p>
    </button>
  );
}
