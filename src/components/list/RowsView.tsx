import MoviePoster from "./MoviePoster";
import type { RankedRow } from "@/lib/list-view";
import { tmdbMovieUrl } from "@/lib/tmdb";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        aria-hidden="true"
        className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-full bg-gold font-display text-xl sm:text-2xl font-bold text-bg shadow-[0_2px_12px_rgba(245,197,24,0.4)] ring-2 ring-gold/40"
      >
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        aria-hidden="true"
        className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-full bg-[#d0d4dc] font-display text-lg sm:text-xl font-bold text-bg shadow-md ring-2 ring-[#d0d4dc]/40"
      >
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        aria-hidden="true"
        className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-full bg-[#cd7f32] font-display text-lg sm:text-xl font-bold text-bg shadow-md ring-2 ring-[#cd7f32]/40"
      >
        3
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-full bg-white/5 font-display text-base sm:text-xl font-bold text-muted ring-1 ring-white/10"
    >
      {rank}
    </div>
  );
}

export default function RowsView({ movies }: { movies: RankedRow[] }) {
  const ranked = movies.filter((m) => m.rank !== null);
  const unranked = movies.filter((m) => m.rank === null);

  return (
    <div className="space-y-8">
      <ol className="space-y-3 sm:space-y-4">
        {ranked.map((m) => {
          const isFirst = m.rank === 1;
          const isSecond = m.rank === 2;
          const isThird = m.rank === 3;

          return (
            <li
              key={m.tmdbId}
              className={`group flex items-center gap-3.5 sm:gap-5 p-3 sm:p-4 rounded-2xl border transition-all duration-200 ${
                isFirst
                  ? "border-gold/40 bg-gradient-to-r from-gold/15 via-surface/90 to-surface/70 shadow-[0_4px_24px_rgba(245,197,24,0.12)] ring-1 ring-gold/30"
                  : isSecond
                    ? "border-[#d0d4dc]/30 bg-surface/80 ring-1 ring-[#d0d4dc]/20 shadow-md"
                    : isThird
                      ? "border-[#cd7f32]/30 bg-surface/80 ring-1 ring-[#cd7f32]/20 shadow-md"
                      : "border-white/5 bg-surface/60 hover:bg-surface-raised hover:border-white/15 ring-1 ring-white/5 shadow-sm"
              }`}
            >
              {/* Rank Column */}
              <div className="shrink-0 flex items-center justify-center">
                <RankBadge rank={m.rank ?? 0} />
              </div>

              {/* Large, Tactile Movie Poster */}
              <a
                href={tmdbMovieUrl(m.tmdbId)}
                target="_blank"
                rel="noopener noreferrer"
                title={`View ${m.title} on TMDB (opens in new tab)`}
                className="group/poster relative block shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-gold"
              >
                <MoviePoster
                  title={m.title}
                  posterPath={m.posterPath}
                  className="w-16 min-w-16 sm:w-22 sm:min-w-22 md:w-26 md:min-w-26 lg:w-28 lg:min-w-28 shadow-lg shrink-0"
                />
              </a>

              {/* Title & Rich Metadata Details */}
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-1 sm:gap-1.5 py-0.5">
                {isFirst && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gold">
                    <span aria-hidden="true">✦</span> #1 Champion
                  </span>
                )}
                {isSecond && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#d0d4dc]">
                    2nd Place
                  </span>
                )}
                {isThird && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#cd7f32]">
                    3rd Place
                  </span>
                )}

                <h3 className="font-bold text-base sm:text-lg md:text-xl text-text leading-snug break-words">
                  <a
                    href={tmdbMovieUrl(m.tmdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${m.title} on TMDB (opens in new tab)`}
                    className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                  >
                    {m.title}
                  </a>{" "}
                  {m.releaseYear && (
                    <span className="font-mono text-xs sm:text-sm font-normal text-muted whitespace-nowrap">
                      ({m.releaseYear})
                    </span>
                  )}
                </h3>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-0.5 text-xs text-muted">
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 sm:px-2.5 py-0.5 font-mono text-[11px] sm:text-xs text-muted/90 ring-1 ring-white/10">
                    <span>{m.comparisons}</span>
                    <span>head-to-head vote{m.comparisons === 1 ? "" : "s"}</span>
                  </span>

                  <a
                    href={tmdbMovieUrl(m.tmdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${m.title} on TMDB (opens in new tab)`}
                    className="hidden sm:inline-flex items-center gap-1 text-xs text-muted/70 hover:text-gold transition-colors focus-visible:outline-1 focus-visible:outline-gold"
                  >
                    <span>TMDB</span>
                    <span aria-hidden="true" className="text-[10px]">↗</span>
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {unranked.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-surface/40 p-4 sm:p-5 ring-1 ring-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-display text-sm uppercase tracking-wider text-muted">
              Haven&apos;t seen ({unranked.length})
            </h4>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-muted ring-1 ring-white/10">
              Unranked
            </span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {unranked.map((m) => (
              <li
                key={m.tmdbId}
                className="flex items-center gap-3.5 p-2.5 rounded-xl border border-white/5 bg-surface/50 text-muted transition-colors hover:text-text hover:bg-surface-raised"
              >
                <a
                  href={tmdbMovieUrl(m.tmdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`View ${m.title} on TMDB (opens in new tab)`}
                  className="block shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 grayscale-[35%]"
                >
                  <MoviePoster
                    title={m.title}
                    posterPath={m.posterPath}
                    className="w-12 min-w-12 sm:w-14 sm:min-w-14 shrink-0"
                  />
                </a>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-text/90 leading-snug">
                    <a
                      href={tmdbMovieUrl(m.tmdbId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View ${m.title} on TMDB (opens in new tab)`}
                      className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                    >
                      {m.title}
                    </a>{" "}
                    {m.releaseYear && (
                      <span className="font-mono text-xs font-normal text-muted">
                        ({m.releaseYear})
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">Haven&apos;t seen</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
