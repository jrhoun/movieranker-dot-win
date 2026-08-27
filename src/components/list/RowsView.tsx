import MoviePoster from "./MoviePoster";
import type { RankedRow } from "@/lib/list-view";
import { tmdbMovieUrl } from "@/lib/tmdb";

export default function RowsView({ movies }: { movies: RankedRow[] }) {
  const ranked = movies.filter((m) => m.rank !== null);
  const unranked = movies.filter((m) => m.rank === null);

  return (
    <div className="space-y-6">
      <ol className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-surface/50 p-2 shadow-2xl backdrop-blur-md ring-1 ring-white/5">
        {ranked.map((m) => {
          const isFirst = m.rank === 1;
          const isSecond = m.rank === 2;
          const isThird = m.rank === 3;
          return (
            <li
              key={m.tmdbId}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5 ${
                isFirst ? "bg-gold/5 ring-1 ring-gold/20" : ""
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full font-display text-base font-bold ${
                  isFirst
                    ? "bg-gold text-bg shadow-sm"
                    : isSecond
                      ? "bg-[#d0d4dc] text-bg shadow-xs"
                      : isThird
                        ? "bg-[#cd7f32] text-bg shadow-xs"
                        : "text-muted font-mono text-xs"
                }`}
              >
                {m.rank}
              </span>
              <a
                href={tmdbMovieUrl(m.tmdbId)}
                target="_blank"
                rel="noopener noreferrer"
                title={`View ${m.title} on TMDB (opens in new tab)`}
                className="block shrink-0 overflow-hidden rounded-md ring-1 ring-white/10 transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-gold"
              >
                <MoviePoster
                  title={m.title}
                  posterPath={m.posterPath}
                  className="w-12 sm:w-14 shrink-0"
                />
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  <a
                    href={tmdbMovieUrl(m.tmdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${m.title} on TMDB (opens in new tab)`}
                    className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                  >
                    {m.title}
                  </a>{" "}
                  <span className="font-normal font-mono text-xs text-muted">
                    {m.releaseYear ? `(${m.releaseYear})` : ""}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {m.comparisons} head-to-head vote{m.comparisons === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {unranked.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-surface/30 p-4 ring-1 ring-white/5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-sm uppercase tracking-wider text-muted">
              Haven&apos;t seen ({unranked.length})
            </h4>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-muted ring-1 ring-white/10">
              Unranked
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {unranked.map((m) => (
              <li
                key={m.tmdbId}
                className="flex items-center gap-3.5 px-3 py-2 text-muted transition-colors hover:text-text"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center font-mono text-xs text-muted/60"
                >
                  —
                </span>
                <a
                  href={tmdbMovieUrl(m.tmdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`View ${m.title} on TMDB (opens in new tab)`}
                  className="block shrink-0 overflow-hidden rounded-md ring-1 ring-white/10 grayscale-[25%]"
                >
                  <MoviePoster
                    title={m.title}
                    posterPath={m.posterPath}
                    className="w-10 shrink-0"
                  />
                </a>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text/80">
                    <a
                      href={tmdbMovieUrl(m.tmdbId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View ${m.title} on TMDB (opens in new tab)`}
                      className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                    >
                      {m.title}
                    </a>{" "}
                    <span className="font-normal font-mono text-xs text-muted">
                      {m.releaseYear ? `(${m.releaseYear})` : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted/80">Haven&apos;t seen</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
