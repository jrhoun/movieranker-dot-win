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
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 sm:gap-3 transform-gpu ${animClass}`}
      aria-hidden={isLosing}
    >
      {/* Festival laurel indicator for 3+ win streaks. The fixed-height wrapper
          (h-6 on phones, h-8 from sm) reserves the row whether or not a streak
          exists, so the poster below never jumps the moment one appears.

          WHY THIS REPLACED WHAT SHIPPED HERE, so it is not walked back: the old
          badge read "🔥 4-WIN UNDEFEATED STREAK 🔥" in black `font-black` on an
          amber gradient with `animate-pulse`. Three problems, all really the
          same problem. It was a notification pill — the SaaS-panel vocabulary
          DESIGN.md rules out — sitting directly above the two posters that are
          supposed to be the brightest thing on this screen. It reached for emoji
          where the design system already has a gold/✦ vocabulary and a real
          display face. And PROJECT.md describes this feature as an "understated
          gold laurel indicator", which is exactly what the LaurelBranchLeft /
          LaurelBranchRight SVGs at the top of this file were drawn for; they had
          never been wired to anything and eslint had been reporting both as
          unused. They flank the count now, the way a festival laurel does.

          ESCALATION WITHOUT A LOOP: `animate-pulse` is gone. globals.css does
          now kill Tailwind's pulse under prefers-reduced-motion, so this is not
          an accessibility patch — it is that a pulse running for as long as a
          streak lasts is not the "single beat" DESIGN.md allows a celebration,
          and an indicator that throbs indefinitely next to a poster is exactly
          the notification-tray reflex the theme is meant to resist. So the two
          tiers separate on WEIGHT instead, which reads the same for every user
          in either motion setting: at 3 it is bare letterspaced gold
          between small laurels; at 4+ the laurels grow, the type goes
          full-strength gold, and the whole thing gains a plaque — fill, ring and
          a gold bloom. The type and laurels do step up a size at 4, but
          `transition-colors` rather than `transition-all` means only the colour
          and ring animate — the size change lands at once instead of the badge
          growing in place, which is what made the old version feel restless.

          The long sentence stays in aria-label/title. That is where a screen
          reader wants the full phrasing, and it is the reason the visible copy
          can afford to be two words. */}
      <div className="h-6 sm:h-8 flex items-center justify-center">
        {streak >= 3 ? (
          <div
            className={`inline-flex items-center rounded-full font-display uppercase leading-none tracking-widest transition-colors duration-500 ease-out ${
              streak >= 4
                ? "gap-2 bg-gold/15 px-3 py-1 text-sm text-gold ring-1 ring-gold/45 shadow-[0_0_22px_rgba(245,197,24,0.3)]"
                : "gap-1.5 px-1.5 text-xs text-gold/75"
            }`}
            aria-label={`${movie.title} is on a ${streak}-win streak`}
            title={`${movie.title} has won ${streak} consecutive matchups`}
          >
            <LaurelBranchLeft className={streak >= 4 ? "h-4 w-4" : "h-3.5 w-3.5"} />
            <span>{streak >= 4 ? `Undefeated · ${streak}` : `${streak} Wins`}</span>
            <LaurelBranchRight className={streak >= 4 ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </div>
        ) : null}
      </div>

      {/* Only the poster frame is the vote target — titles/meta stay outside so
          stray taps near the card edges don't cast a vote.

          THE BUTTON IS NEVER DISABLED ANY MORE. It used to carry
          `disabled={isLosing || settlingLoserId !== null}`, which killed BOTH
          posters for the 380ms of the settle animation. On a phone that is
          indistinguishable from the app dropping taps: a player tapping at a
          natural pace lost roughly every second tap, exactly as the keyboard
          did. The room now queues a mid-flight tap as a SIDE and replays it
          against the pair that mounts next (see lib/keyboard.ts PendingIntent),
          so the button has to stay live for the queue to receive anything.

          Double-voting the SAME pair is not the risk it looks like: handleVote
          diverts to the queue while settling instead of applying a second vote,
          and the queue holds one intent, so a mashed poster produces one vote
          per settle no matter how many taps land.

          tabIndex -1 WHILE LOSING is the a11y half of that trade. The losing
          column is `aria-hidden` for its flight, and a focusable control inside
          an aria-hidden subtree is a defect — previously masked by `disabled`,
          though the "Haven't seen" button below has always had it. Removing it
          from the tab order for those 380ms keeps pointers working without
          letting keyboard focus walk into hidden content; keyboard players have
          the A/D/←/→ queue and never need to reach these by Tab. */}
      <button
        type="button"
        onClick={() => onVote(movie.tmdbId, otherId)}
        aria-label={`Pick ${movie.title} as the winner`}
        aria-keyshortcuts={keyShortcut}
        tabIndex={isLosing ? -1 : undefined}
        style={{ touchAction: "manipulation" }}
        className="group relative mx-auto block w-fit select-none rounded-xl sm:rounded-2xl transition-all duration-500 ease-out transform-gpu hover:scale-[1.02] focus:outline-none focus-visible:outline-none active:scale-[0.98] cursor-pointer"
      >
        <div
          className={`aspect-[2/3] h-[min(50svh,64vw)] sm:h-[min(58svh,36vw)] md:h-[min(65svh,34vw,650px)] lg:h-[min(70svh,32vw,750px)] portrait:sm:h-[min(54svh,58vw,680px)] overflow-hidden rounded-xl sm:rounded-2xl bg-surface transition-all duration-500 ease-out group-focus-visible:ring-2 group-focus-visible:ring-gold group-active:ring-gold ${
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
      <p className="w-full max-w-[15rem] sm:max-w-xs md:max-w-sm lg:max-w-md text-center text-sm sm:text-xl md:text-2xl font-bold leading-tight line-clamp-2">
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
        <p className="w-full max-w-[15rem] sm:max-w-xs md:max-w-sm lg:max-w-md text-center text-[11px] sm:text-xs italic text-muted/80 leading-snug line-clamp-1 sm:line-clamp-2 -mt-0.5">
          {movie.tagline}
        </p>
      ) : null}

      {/* Release Year & TMDB External Link */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm text-muted">
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
        tabIndex={isLosing ? -1 : undefined}
        className="mt-0.5 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-surface-raised/90 px-3 py-1 sm:px-4 text-xs font-semibold text-text/80 ring-1 ring-white/20 transition-all duration-150 ease-out hover:bg-surface-raised hover:text-gold hover:ring-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95 cursor-pointer"
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

  /*
   * PHONE LAYOUT (< sm) IS DELIBERATELY TIGHT, and every `sm:`-prefixed number
   * in this section exists to buy width for the posters.
   *
   * At 390px the old stage spent roughly 72px of its 374px content box on
   * `gap-3` either side of a `px-1` VS column rendering Bebas at text-2xl, and
   * the poster frames — `h-[min(52svh,40vw)]`, which after the 2:3 ratio is
   * only ~27vw WIDE — used barely half the screen. Two thumbnails with a canyon
   * between them, on the one screen where the posters ARE the game.
   *
   * `gap-1.5` plus a zero-padding VS column reclaims ~40px, and that goes
   * straight into the frame at `h-[min(50svh,64vw)]`: ~42.7vw of width each,
   * ~85vw for the pair, side by side with a tight VS exactly as asked.
   *
   * The numbers are measured, not guessed — the VS column at its phone type
   * (Bebas at text-lg) renders 14.5px wide, so the budget is
   * `vw - 14.5 - 2×gap - 2×padding` split in two. That leaves 18.7px of slack
   * at 390px, 14.3px at 360px and 8.5px even at 320px, so nothing overflows
   * anywhere in the phone range and the VS is never squeezed. Going much past
   * 64vw runs the 320px case negative.
   *
   * The 50svh term only binds on unusually short viewports, which is the point
   * of keeping it: it is the guard against a phone held in landscape, where
   * 64vw of a 800px-wide screen would be taller than the screen itself.
   *
   * The metadata under each poster condenses to match (text-sm title, one-line
   * tagline, 11px year row, narrower "Haven't seen"), which keeps the column
   * around 390px tall on an 844px phone — the two posters and their vote
   * targets clear the fold with the progress board above them, and only the
   * YOUR MOVIES tray sits below it.
   *
   * Everything from sm: up is untouched. This is a phone fix, not a resize of
   * the desktop stage.
   */
  return (
    <section
      aria-label="Which movie is better?"
      className="matchup-stage-container mx-auto flex w-full max-w-6xl xl:max-w-7xl flex-1 items-center justify-center gap-1.5 sm:gap-10 md:gap-14 lg:gap-20 portrait:sm:gap-6 portrait:md:gap-8 portrait:lg:gap-10 px-1.5 sm:px-2 py-2 select-none"
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
        className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-2 px-0 sm:px-3"
      >
        <span className="text-[10px] sm:text-sm text-gold/70">✦</span>
        <p className="font-display text-lg leading-none tracking-wide text-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-4xl sm:tracking-widest lg:text-5xl">
          VS
        </p>
        <span className="text-[10px] sm:text-sm text-gold/70">✦</span>
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
