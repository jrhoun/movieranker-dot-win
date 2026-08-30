"use client";

import { tmdbMovieUrl, type TmdbMovieCredit } from "@/lib/tmdb";
import { posterPlaceholderClass } from "@/lib/poster-placeholder";

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
    <div className="group text-left">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${selected ? "Remove" : "Add"} ${movie.title} (${movie.releaseYear ?? "?"})`}
        aria-pressed={selected}
        title={selected ? "On your list — tap to remove" : `${movie.title} (${movie.releaseYear ?? "?"})`}
        className="block w-full min-h-11 min-w-11 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
      >
        {/* No overflow-hidden on the button: it clips this ring. Own overflow-hidden here
            rounds the img corners but never clips the element's own box-shadow ring. */}
        <div
          className={`aspect-[2/3] w-full overflow-hidden rounded bg-surface transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu group-hover:-translate-y-1.5 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)] group-active:scale-[0.98] ${
            selected ? "ring-[3px] ring-gold" : "ring-1 ring-white/25 group-hover:ring-white/50"
          }`}
        >
          {movie.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/${sizeVariant}${movie.posterPath}`}
              alt=""
              loading={eager ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            // No art on TMDB — a permanent state for many shorts and festival
            // films, not a load in progress. Tinted from the film's own id so
            // the colour survives reordering and matches every other view.
            <div
              className={`flex h-full w-full items-center justify-center p-3 text-center ${posterPlaceholderClass(movie.tmdbId ?? movie.title)}`}
            >
              <span className="line-clamp-4 font-display text-sm uppercase leading-tight tracking-wide text-text/90">
                {movie.title}
              </span>
            </div>
          )}
        </div>
      </button>
      <div className="mt-1.5 px-0.5 space-y-0.5">
        <div className="flex items-start justify-between gap-1.5">
          <p
            className={`line-clamp-2 text-xs sm:text-sm font-semibold leading-snug ${
              selected ? "text-gold" : "text-text"
            }`}
            title={movie.title}
          >
            {movie.title}
          </p>
          <a
            href={tmdbMovieUrl(movie.tmdbId)}
            target="_blank"
            rel="noopener noreferrer"
            title={`View ${movie.title} on TMDB (opens in new tab)`}
            aria-label={`View ${movie.title} on TMDB`}
            className="shrink-0 text-xs text-muted transition-colors hover:text-gold focus-visible:outline-1 focus-visible:outline-gold"
          >
            TMDB ↗
          </a>
        </div>
        {movie.releaseYear && (
          <p className="font-mono text-xs text-muted leading-none">
            {movie.releaseYear}
          </p>
        )}
      </div>
    </div>
  );
}
