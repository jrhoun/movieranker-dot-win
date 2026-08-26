"use client";

import type { TmdbMovieCredit } from "@/lib/tmdb";

export default function MoviePosterCard({
  movie,
  selected = false,
  onSelect,
  eager = false,
  sizeVariant = "w342",
}: {
  movie: TmdbMovieCredit;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Modal grids load immediately; inline grid keeps native lazy loading. */
  eager?: boolean;
  /** TMDB poster width path segment; smaller variant for dense modal grids. */
  sizeVariant?: "w342" | "w185";
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${selected ? "Remove" : "Add"} ${movie.title} (${movie.releaseYear ?? "?"})`}
      aria-pressed={selected}
      title={selected ? "On your list — tap to remove" : `${movie.title} (${movie.releaseYear ?? "?"})`}
      className="group min-h-11 min-w-11 overflow-hidden rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
    >
      <div
        className={`aspect-[2/3] w-full overflow-hidden rounded bg-surface transition-shadow duration-200 ease-out group-active:scale-[0.98] ${
          selected ? "ring-[3px] ring-gold" : "ring-1 ring-white/25"
        }`}
      >
        {movie.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/${sizeVariant}${movie.posterPath}`}
            alt=""
            loading={eager ? "eager" : "lazy"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted">
            {movie.title}
          </div>
        )}
      </div>
      {/* Selection = gold poster ring + gold title, no badge/year lines (year lives in aria-label/title). */}
      <p className={`mt-1 truncate text-xs leading-snug ${selected ? "text-gold" : "text-text"}`}>{movie.title}</p>
    </button>
  );
}
