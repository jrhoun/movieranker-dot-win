"use client";

import type { RankedMovie } from "@/lib/ranking";
import { tmdbMovieUrl } from "@/lib/tmdb";
import { posterPlaceholderClass } from "@/lib/poster-placeholder";

const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

function Side({
  movie,
  otherId,
  position,
  settlingLoserId,
  onVote,
  onPark,
}: {
  movie: RankedMovie;
  otherId: number;
  position: "left" | "right";
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

  /*
   * NO `transition-transform` ON THIS WRAPPER, and that is the fix.
   *
   * It carried `transition-transform duration-200 ease-out`, and the only
   * thing that ever transforms this element is the keyframe animation above —
   * the hover lift lives on the button inside, with its own transition. So the
   * transition had exactly one effect: when the animation class came off at the
   * end of a vote, the transform eased from the animation's `forwards` end
   * state back to identity over 200ms, WHILE the next pair was already on
   * screen. Every incoming poster drifted into place instead of arriving
   * settled.
   *
   * Measured, not guessed. Reading `getAnimations({subtree:true})` on the stage
   * in the live page at the moment of a click returned four CSSTransitions of
   * 200ms on `translate` and `box-shadow` — the tail of the PREVIOUS vote still
   * running as the new one began. 120ms later the real CSSAnimations
   * (hit-right, recoil-right, winner-poster-glow, all duration 380) were in
   * flight, confirming the animation itself works.
   */
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-2 sm:gap-3 ${animClass}`}
      aria-hidden={isLosing}
    >
      {/* Only the poster frame is the vote target — titles/meta stay outside so
          stray taps near the card edges don't cast a vote. */}
      <button
        type="button"
        onClick={() => onVote(movie.tmdbId, otherId)}
        aria-label={`Pick ${movie.title} as the winner`}
        style={{ touchAction: "manipulation" }}
        className="group mx-auto block w-fit select-none rounded-xl sm:rounded-2xl transition-transform duration-200 ease-out hover:-translate-y-2 focus:outline-none focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        disabled={isLosing || settlingLoserId !== null}
      >
        <div
          className={`aspect-[2/3] h-[min(52svh,40vw)] sm:h-[min(58svh,36vw)] md:h-[min(65svh,34vw,650px)] lg:h-[min(70svh,32vw,750px)] overflow-hidden rounded-xl sm:rounded-2xl bg-surface ring-1 ring-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(245,197,24,0.12)] transition-all duration-200 ease-out group-hover:ring-2 group-hover:ring-gold group-focus-visible:ring-2 group-focus-visible:ring-gold group-active:ring-gold ${
            isWinning ? "animate-poster-winner ring-2 ring-gold" : ""
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
      </button>
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
      <button
        type="button"
        onClick={() => onPark(movie.tmdbId)}
        className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-full bg-surface-raised/90 px-4 py-1 text-xs font-semibold text-text/80 ring-1 ring-white/20 transition-all duration-150 ease-out hover:bg-surface-raised hover:text-gold hover:ring-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95"
      >
        Haven&apos;t seen
      </button>
    </div>
  );
}

export default function MatchupStage({
  pair,
  settlingLoserId,
  onVote,
  onPark,
}: {
  pair: [RankedMovie, RankedMovie];
  settlingLoserId: number | null;
  onVote: (winnerId: number, loserId: number) => void;
  onPark: (tmdbId: number) => void;
}) {
  const [a, b] = pair;
  return (
    <section
      aria-label="Which movie is better?"
      className="mx-auto flex w-full max-w-6xl xl:max-w-7xl flex-1 items-center justify-center gap-3 sm:gap-10 md:gap-14 lg:gap-20 px-2 py-2 select-none"
    >
      <Side
        movie={a}
        otherId={b.tmdbId}
        position="left"
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
        movie={b}
        otherId={a.tmdbId}
        position="right"
        settlingLoserId={settlingLoserId}
        onVote={onVote}
        onPark={onPark}
      />
    </section>
  );
}
