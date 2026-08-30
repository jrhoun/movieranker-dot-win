import MoviePoster from "./MoviePoster";
import { podiumDisplayOrder, splitPodium, type RankedRow } from "@/lib/list-view";
import { tmdbMovieUrl } from "@/lib/tmdb";

function MedalBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        aria-hidden="true"
        className="absolute -top-3 -left-3 z-10 flex size-9 items-center justify-center rounded-full bg-gold font-display text-xl font-bold text-bg shadow-[0_4px_12px_rgba(245,197,24,0.4)] ring-2 ring-surface"
      >
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        aria-hidden="true"
        className="absolute -top-2.5 -left-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-[#d0d4dc] font-display text-sm font-bold text-bg shadow-md ring-2 ring-surface"
      >
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        aria-hidden="true"
        className="absolute -top-2.5 -left-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-[#cd7f32] font-display text-sm font-bold text-bg shadow-md ring-2 ring-surface"
      >
        3
      </div>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="absolute -left-1 -top-2 z-10 font-display text-lg text-gold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
    >
      {rank}
    </span>
  );
}

export default function StackedView({ movies }: { movies: RankedRow[] }) {
  const ranked = movies.filter((m): m is RankedRow & { rank: number } => m.rank !== null);
  const unranked = movies.filter((m) => m.rank === null);
  const { podium, rest } = splitPodium(ranked);
  const ordered = podiumDisplayOrder(podium);
  const winner = podium.find((m) => m.rank === 1);

  return (
    <div>
      {podium.length > 0 && (
        <div className="relative rounded-2xl border border-white/5 bg-surface/50 p-4 pt-8 pb-5 shadow-2xl backdrop-blur-md ring-1 ring-white/5">
          {/* Spotlight glow behind #1 winner */}
          <div
            className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 h-44 w-44 rounded-full bg-gold/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex items-end justify-center gap-3 sm:gap-6">
            {ordered.map((m) => {
              const isWinner = m.rank === 1;
              const isSecond = m.rank === 2;

              return (
                <div
                  key={m.tmdbId}
                  className={`flex flex-col items-center ${
                    isWinner
                      ? "z-10 w-36 -translate-y-2 sm:w-44 md:w-48"
                      : "w-26 sm:w-32 md:w-36"
                  }`}
                >
                  <div className="relative w-full">
                    <MedalBadge rank={m.rank} />
                    <a
                      href={tmdbMovieUrl(m.tmdbId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View ${m.title} on TMDB (opens in new tab)`}
                      className={`block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-gold ${
                        isWinner
                          ? "ring-2 ring-gold/80 shadow-[0_8px_30px_rgba(245,197,24,0.25)]"
                          : isSecond
                            ? "ring-1 ring-[#d0d4dc]/60 shadow-lg"
                            : "ring-1 ring-[#cd7f32]/60 shadow-lg"
                      }`}
                    >
                      <MoviePoster
                        title={m.title}
                        posterPath={m.posterPath}
                        tmdbId={m.tmdbId}
                      />
                    </a>
                  </div>

                  <p
                    className={`mt-2 w-full truncate text-center font-medium ${
                      isWinner
                        ? "text-xs font-bold text-gold sm:text-sm"
                        : "text-[11px] text-text sm:text-xs"
                    }`}
                  >
                    <a
                      href={tmdbMovieUrl(m.tmdbId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View ${m.title} on TMDB (opens in new tab)`}
                      className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                    >
                      {m.title}
                    </a>
                    <span className="sr-only"> — ranked #{m.rank}</span>
                  </p>
                  <p className="text-center font-mono text-[10px] text-muted">
                    {m.releaseYear ?? "—"}
                  </p>

                  {/* Podium Base Pedestal */}
                  <div
                    className={`mt-2 flex w-full items-center justify-center rounded-t-lg border-t font-display uppercase tracking-widest text-center ${
                      isWinner
                        ? "h-9 border-gold/60 bg-gradient-to-b from-gold/25 to-gold/5 text-xs font-bold text-gold shadow-inner"
                        : isSecond
                          ? "h-7 border-white/30 bg-gradient-to-b from-white/15 to-white/5 text-[10px] text-[#d0d4dc]"
                          : "h-5 border-amber-700/40 bg-gradient-to-b from-amber-900/25 to-amber-900/5 text-[9px] text-[#cd7f32]"
                    }`}
                  >
                    {isWinner ? "✦ 1st Place ✦" : isSecond ? "2nd" : "3rd"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {winner && <p className="sr-only">Winner: {winner.title}</p>}
      {rest.length > 0 && (
        <div className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="font-display text-xs uppercase tracking-[0.2em] text-muted">
              Honorable Mentions &amp; Rest of List
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <ol className="flex flex-wrap justify-center gap-x-3.5 gap-y-6 sm:gap-x-5 sm:gap-y-7">
            {rest.map((m) => (
              <li
                key={m.tmdbId}
                className="relative flex w-[105px] sm:w-[125px] md:w-[135px] flex-col items-center text-center"
              >
                <div className="relative w-full overflow-hidden rounded-lg shadow-md ring-1 ring-white/10">
                  <span
                    aria-hidden="true"
                    className="absolute top-1 left-1 z-10 flex size-5 items-center justify-center rounded-md bg-bg/85 font-mono text-[10px] font-bold text-gold ring-1 ring-white/15 backdrop-blur-xs"
                  >
                    #{m.rank}
                  </span>
                  <a
                    href={tmdbMovieUrl(m.tmdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${m.title} on TMDB (opens in new tab)`}
                    className="block focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <MoviePoster
                      title={m.title}
                      posterPath={m.posterPath}
                      tmdbId={m.tmdbId}
                    />
                  </a>
                </div>
                <p className="mt-1.5 line-clamp-2 w-full text-xs font-medium leading-tight text-text">
                  <a
                    href={tmdbMovieUrl(m.tmdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${m.title} on TMDB (opens in new tab)`}
                    className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                  >
                    {m.title}
                  </a>
                  <span className="sr-only"> — ranked #{m.rank}</span>
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">{m.releaseYear ?? "—"}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {unranked.length > 0 && (
        <div className="mt-12 rounded-2xl border border-white/5 bg-surface/30 p-5 ring-1 ring-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-display text-sm uppercase tracking-wider text-muted">
              Haven&apos;t seen ({unranked.length})
            </h4>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-muted ring-1 ring-white/10">
              Unranked
            </span>
          </div>
          <ol className="flex flex-wrap justify-center gap-x-3.5 gap-y-6 sm:gap-x-5 sm:gap-y-7 opacity-80">
            {unranked.map((m) => (
              <li
                key={m.tmdbId}
                className="relative flex w-[105px] sm:w-[125px] md:w-[135px] flex-col items-center text-center"
              >
                <div className="relative w-full overflow-hidden rounded-lg shadow-md ring-1 ring-white/10 grayscale-[25%]">
                  <a
                    href={tmdbMovieUrl(m.tmdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${m.title} on TMDB (opens in new tab)`}
                    className="block focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <MoviePoster
                      title={m.title}
                      posterPath={m.posterPath}
                      tmdbId={m.tmdbId}
                    />
                  </a>
                </div>
                <p className="mt-1.5 line-clamp-2 w-full text-xs font-medium leading-tight text-text/90">
                  <a
                    href={tmdbMovieUrl(m.tmdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${m.title} on TMDB (opens in new tab)`}
                    className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                  >
                    {m.title}
                  </a>
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">{m.releaseYear ?? "—"}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
