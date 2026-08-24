const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

/** Poster with the mandated true 2:3 frame; falls back to the title when no art exists. */
export default function MoviePoster({
  title,
  posterPath,
  className = "",
}: {
  title: string;
  posterPath: string | null;
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
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted">
          {title}
        </div>
      )}
    </div>
  );
}
