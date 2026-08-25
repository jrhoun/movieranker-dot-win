"use client";

import type { RankedMovie } from "@/lib/ranking";

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

function Side({
  movie,
  otherId,
  losing,
  winning,
  onVote,
  onPark,
}: {
  movie: RankedMovie;
  otherId: number;
  losing: boolean;
  winning: boolean;
  onVote: (winnerId: number, loserId: number) => void;
  onPark: (tmdbId: number) => void;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col justify-center gap-2 ${losing ? "loser-bop" : ""}`}
      aria-hidden={losing}
    >
      {/* Only the poster frame is the vote target — titles/meta stay outside so
          stray taps near the card edges don't cast a vote. */}
      <button
        type="button"
        onClick={() => onVote(movie.tmdbId, otherId)}
        aria-label={`Pick ${movie.title} as the winner`}
        style={{ touchAction: "manipulation" }}
        className="group mx-auto block w-fit select-none rounded transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        disabled={losing}
      >
        <div
          className={`aspect-[2/3] h-[min(62svh,64vw)] overflow-hidden rounded bg-surface ring-1 ring-white/10 transition-all duration-200 ease-out group-hover:ring-accent group-focus-visible:ring-accent group-active:ring-accent ${
            winning ? "winner-gold-pulse" : ""
          }`}>
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
            <div className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-muted">
              {movie.title}
            </div>
          )}
        </div>
      </button>
      <p className="truncate px-1 text-center text-xl font-semibold sm:text-3xl">{movie.title}</p>
      <p className="text-center text-sm text-muted sm:text-base">{movie.releaseYear ?? "—"}</p>
      <button
        type="button"
        onClick={() => onPark(movie.tmdbId)}
        className="min-h-11 rounded border border-white/10 px-2 text-xs text-muted transition-colors duration-200 ease-out hover:border-white/40 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-raised sm:text-sm"
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
      className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 select-none sm:gap-3"
    >
      <Side
        movie={a}
        otherId={b.tmdbId}
        losing={settlingLoserId === a.tmdbId}
        winning={settlingLoserId === b.tmdbId}
        onVote={onVote}
        onPark={onPark}
      />
      <div
        aria-hidden="true"
        className="flex flex-col items-center gap-1 px-0.5 sm:gap-2"
      >
        <span className="text-xs text-gold/70">✦</span>
        <p className="font-display text-2xl leading-none tracking-widest text-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] sm:text-3xl">
          VS
        </p>
        <span className="text-xs text-gold/70">✦</span>
      </div>
      <Side
        movie={b}
        otherId={a.tmdbId}
        losing={settlingLoserId === b.tmdbId}
        winning={settlingLoserId === a.tmdbId}
        onVote={onVote}
        onPark={onPark}
      />
    </section>
  );
}
