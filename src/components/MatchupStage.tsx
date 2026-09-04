"use client";

import type { RankedMovie } from "@/lib/ranking";
import { getMovieWinStreak } from "@/lib/streak";
import { tmdbMovieUrl } from "@/lib/tmdb";
import { posterPlaceholderClass } from "@/lib/poster-placeholder";

const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

function LaurelBranchLeft({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M7.8 1.2c-.3 1.6-1.3 3.2-2.8 4-1.2.6-2.6.7-3.8.3.4 1.4 1.3 2.5 2.6 3 .3.1.6.2.9.2-1.6.8-2.6 2.3-2.8 4 1.4-.2 2.6-.9 3.4-2 .2-.3.4-.6.5-1-.2 1.5.3 3.1 1.4 4.1.3-.8.4-1.7.3-2.6 0-.8-.3-1.6-.7-2.3 1.1-.9 1.8-2.3 1.9-3.7-.6.4-1.3.6-2 .6-.6 0-1.2-.2-1.7-.6 1.4-.9 2.2-2.4 2.1-4z" />
    </svg>
  );
}

function LaurelBranchRight({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8.2 1.2c.3 1.6 1.3 3.2 2.8 4 1.2.6 2.6.7 3.8.3-.4 1.4-1.3 2.5-2.6 3-.3.1-.6.2-.9.2 1.6.8 2.6 2.3 2.8 4-1.4-.2-2.6-.9-3.4-2-.2-.3-.4-.6-.5-1 .2 1.5-.3 3.1-1.4 4.1-.3-.8-.4-1.7-.3-2.6 0-.8.3-1.6.7-2.3-1.1-.9-1.8-2.3-1.9-3.7.6.4 1.3.6 2 .6.6 0 1.2-.2 1.7-.6-1.4-.9-2.2-2.4-2.1-4z" />
    </svg>
  );
}

function Side({
  movie,
  otherId,
  position,
  streak,
  settlingLoserId,
  onVote,
  onPark,
}: {
  movie: RankedMovie;
  otherId: number;
  position: "left" | "right";
  streak: number;
  settlingLoserId: number | null;
  onVote: (winnerId: number, loserId: number) => void;
  onPark: (tmdbId: number) => void;
}) {
  const isLosing = settlingLoserId === movie.tmdbId;
  const isWinning = settlingLoserId !== null && settlingLoserId === otherId;

  let animClass = "";
  if (isWinning) {
    animClass = position === "left" ? "animate-hit-right" : "animate-hit-left";
  } else if (isLosing) {
    animClass = position === "left" ? "animate-recoil-left" : "animate-recoil-right";
  }

  const keyHint = position === "left" ? "A / ←" : "D / →";
  const keyShortcut = position === "left" ? "ArrowLeft A" : "ArrowRight D";

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-2 sm:gap-3 transform-gpu ${animClass}`}
      aria-hidden={isLosing}
    >
      {/* Laurel Badge indicator for 3+ win streaks */}
      <div className="h-8 flex items-center justify-center">
        {streak >= 3 ? (
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black tracking-wider uppercase transition-all ${
              streak >= 4
                ? "bg-gradient-to-r from-amber-500 via-gold to-amber-500 text-bg ring-2 ring-gold shadow-[0_0_24px_rgba(245,197,24,0.7)] animate-pulse"
                : "bg-gold/20 text-gold ring-1.5 ring-gold/60 shadow-[0_0_15px_rgba(245,197,24,0.3)]"
            }`}
            aria-label={`${movie.title} is on a ${streak}-win streak`}
            title={`${movie.title} has won ${streak} consecutive matchups`}
          >
            <span aria-hidden="true">{streak >= 4 ? "🔥" : "✦"}</span>
            <span>{streak}-WIN UNDEFEATED STREAK</span>
            <span aria-hidden="true">{streak >= 4 ? "🔥" : "✦"}</span>
          </div>
        ) : null}
      </div>

      {/* Only the poster frame is the vote target — titles/meta stay outside so
          stray taps near the card edges don't cast a vote. */}
      <button
        type="button"
        onClick={() => onVote(movie.tmdbId, otherId)}
        aria-label={`Pick ${movie.title} as the winner`}
        aria-keyshortcuts={keyShortcut}
        style={{ touchAction: "manipulation" }}
        className="group relative mx-auto block w-fit select-none rounded-xl sm:rounded-2xl transition-all duration-500 ease-out transform-gpu hover:scale-[1.02] focus:outline-none focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none cursor-pointer"
        disabled={isLosing || settlingLoserId !== null}
      >
        <div
          className={`aspect-[2/3] h-[min(52svh,40vw)] sm:h-[min(58svh,36vw)] md:h-[min(65svh,34vw,650px)] lg:h-[min(70svh,32vw,750px)] overflow-hidden rounded-xl sm:rounded-2xl bg-surface transition-all duration-500 ease-out group-focus-visible:ring-2 group-focus-visible:ring-gold group-active:ring-gold ${
            isWinning
              ? "animate-poster-winner ring-2 ring-gold"
              : streak >= 4
                ? "ring-4 ring-gold/90 shadow-[0_0_50px_rgba(245,197,24,0.5),0_25px_60px_rgba(0,0,0,0.85)] group-hover:shadow-[0_0_65px_rgba(245,197,24,0.7),0_30px_70px_rgba(0,0,0,0.9)]"
                : streak >= 3
                  ? "ring-2 ring-gold/60 shadow-[0_0_30px_rgba(245,197,24,0.3),0_20px_50px_rgba(0,0,0,0.7)] group-hover:shadow-[0_0_45px_rgba(245,197,24,0.45)]"
                  : "ring-1 ring-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(245,197,24,0.12)] group-hover:ring-2 group-hover:ring-gold group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_45px_rgba(245,197,24,0.35)]"
          }`}
        >
          {movie.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${POSTER_BASE}${movie.posterPath}`}
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center p-6 text-center ${posterPlaceholderClass(movie.tmdbId)}`}
            >
              <span className="font-display text-xl uppercase leading-tight tracking-wide text-text/90 sm:text-2xl">
                {movie.title}
              </span>
            </div>
          )}
        </div>

        {/* Keyboard shortcut hint badge on desktop */}
        <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-1 rounded bg-black/85 px-2.5 py-1 font-mono text-xs font-bold text-gold border border-gold/40 shadow-lg backdrop-blur-md pointer-events-none transition-transform group-hover:scale-105">
          <span>{keyHint}</span>
        </div>
      </button>

      {/* Movie Title */}
      <p className="w-full max-w-[15rem] sm:max-w-xs md:max-w-sm lg:max-w-md text-center text-base sm:text-xl md:text-2xl font-bold leading-tight line-clamp-2">
        <a
          href={tmdbMovieUrl(movie.tmdbId)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${movie.title} on TMDB (opens in new tab)`}
          className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
        >
          {movie.title}
        </a>
      </p>

      {/* Movie Tagline (when available from TMDB) */}
      {movie.tagline ? (
        <p className="w-full max-w-[15rem] sm:max-w-xs md:max-w-sm lg:max-w-md text-center text-xs italic text-muted/80 leading-snug line-clamp-2 -mt-0.5">
          {movie.tagline}
        </p>
      ) : null}

      {/* Release Year & TMDB External Link */}
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted">
        <span>{movie.releaseYear ?? "—"}</span>
        <span aria-hidden="true" className="text-white/20">·</span>
        <a
          href={tmdbMovieUrl(movie.tmdbId)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${movie.title} on TMDB (opens in new tab)`}
          className="text-xs text-muted underline decoration-gold/50 underline-offset-2 transition-colors hover:text-gold focus-visible:outline-1 focus-visible:outline-gold"
        >
          TMDB ↗
        </a>
      </div>

      {/* Haven't seen button */}
      <button
        type="button"
        onClick={() => onPark(movie.tmdbId)}
        className="mt-0.5 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-surface-raised/90 px-4 py-1 text-xs font-semibold text-text/80 ring-1 ring-white/20 transition-all duration-150 ease-out hover:bg-surface-raised hover:text-gold hover:ring-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95 cursor-pointer"
      >
        <span>Haven&apos;t seen</span>
      </button>
    </div>
  );
}

export default function MatchupStage({
  pair,
  history,
  settlingLoserId,
  onVote,
  onPark,
}: {
  pair: [RankedMovie, RankedMovie];
  history?: ReadonlyArray<readonly [number, number]> | null;
  settlingLoserId: number | null;
  onVote: (winnerId: number, loserId: number) => void;
  onPark: (tmdbId: number) => void;
}) {
  const [a, b] = pair;
  const streakA = getMovieWinStreak(history, a.tmdbId);
  const streakB = getMovieWinStreak(history, b.tmdbId);

  return (
    <section
      aria-label="Which movie is better?"
      className="matchup-stage-container mx-auto flex w-full max-w-6xl xl:max-w-7xl flex-1 items-center justify-center gap-3 sm:gap-10 md:gap-14 lg:gap-20 px-2 py-2 select-none"
    >
      <Side
        key={a.tmdbId}
        movie={a}
        otherId={b.tmdbId}
        position="left"
        streak={streakA}
        settlingLoserId={settlingLoserId}
        onVote={onVote}
        onPark={onPark}
      />
      <div
        aria-hidden="true"
        className="flex shrink-0 flex-col items-center gap-1 sm:gap-2 px-1 sm:px-3"
      >
        <span className="text-xs sm:text-sm text-gold/70">✦</span>
        <p className="font-display text-2xl leading-none tracking-widest text-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-4xl lg:text-5xl">
          VS
        </p>
        <span className="text-xs sm:text-sm text-gold/70">✦</span>
      </div>
      <Side
        key={b.tmdbId}
        movie={b}
        otherId={a.tmdbId}
        position="right"
        streak={streakB}
        settlingLoserId={settlingLoserId}
        onVote={onVote}
        onPark={onPark}
      />
    </section>
  );
}
