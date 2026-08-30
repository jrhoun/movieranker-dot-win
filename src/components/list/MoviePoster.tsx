import { posterPlaceholderClass } from "@/lib/poster-placeholder";

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

/** Poster with the mandated true 2:3 frame; falls back to the title when no art exists. */
export default function MoviePoster({
  title,
  posterPath,
  tmdbId,
  className = "",
}: {
  title: string;
  posterPath: string | null;
  /** Keys the placeholder gradient so a film keeps its colour across views. */
  tmdbId?: number | null;
  className?: string;
}) {
  return (
    <div
      className={`aspect-[2/3] w-full overflow-hidden rounded bg-surface ring-1 ring-white/10 ${className}`}
    >
      {posterPath ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote TMDB CDN, no next/image optimizer needed
        <img
          src={`${POSTER_BASE}${posterPath}`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        // TMDB has no art for this film, and never will for plenty of shorts
        // and festival titles. A tinted card sets the title deliberately
        // rather than leaving it floating on the bare surface, which reads as
        // an image that failed to load.
        <div
          className={`flex h-full w-full items-center justify-center p-3 text-center ${posterPlaceholderClass(tmdbId ?? title)}`}
        >
          <span className="line-clamp-4 font-display text-sm uppercase leading-tight tracking-wide text-text/90">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
