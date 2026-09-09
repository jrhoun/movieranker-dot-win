"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CandidateTray from "@/components/CandidateTray";
import MarqueeHeading from "@/components/MarqueeHeading";
import MarqueeInfoModal from "@/components/MarqueeInfoModal";
import MoviePoster from "@/components/list/MoviePoster";
import SearchPanel from "@/components/SearchPanel";
import CuratorRoulette from "@/components/roulette/CuratorRoulette";
import UpvoteButton from "@/components/community/UpvoteButton";
import ForkButton from "@/components/community/ForkButton";
import { FAN_POSTERS } from "@/lib/hero-posters";
import type { RankedMovie } from "@/lib/ranking";
import { clearSession, loadSession, saveSession, totalComparisons, type PlaySession } from "@/lib/session";
import { marqueeDisplayTitle } from "@/lib/marquee-title";
import { getNextWeeklyMarqueeRotation, marqueeNumber } from "@/lib/shortlist";
import type { TrendingListSummary } from "@/lib/trending";
import {
  clearStagedDraft,
  loadStagedDraft,
  mergeCandidates,
  removeCandidates,
  saveStagedDraft,
} from "@/lib/tray";
import type { TmdbMovieCredit } from "@/lib/tmdb";

export interface TonightStrip {
  /** The real theme title. Never rendered here (spoiler rule); used only to
      name the saved session when a Marquee run starts. */
  title: string;
  /** Theme slug (shortlist rotation id); null when the fetch came up empty. */
  themeSlug: string | null;
  movies: TmdbMovieCredit[];
  /** Proposer's public handle when this week's theme is a community proposal. */
  proposedBy: string | null;
  /** Done lists sharing >=3 movies with this week's theme (0 = show nothing). */
  settledCount: number;
  /** The logged in user's finished list ID for this theme, if already ranked. */
  userThemeListId?: string | null;
}

function MarqueeCountdown() {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    function update() {
      const nextRotation = getNextWeeklyMarqueeRotation();
      const diff = nextRotation.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Rotating soon");
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      // Leading zero units are noise: "0d 22h 41m" reads as a countdown that
      // has not started. Show only the units that carry information.
      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (days > 0 || hours > 0) parts.push(`${hours}h`);
      parts.push(`${mins}m`);
      setTimeLeft(parts.join(" "));
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-4 py-1.5 text-sm font-medium text-text ring-1 ring-white/15 shadow-sm">
      {/* The site's one glyph, not an hourglass emoji — the only emoji in the
          hero, and emoji render differently on every platform. */}
      <span aria-hidden="true" className="text-xs text-gold">✦</span>
      <span>New set Monday · <strong className="font-mono font-bold text-gold">{timeLeft}</strong></span>
    </div>
  );
}

export default function HomeClient({
  tonight,
  trendingLists = [],
}: {
  tonight: TonightStrip;
  trendingLists?: TrendingListSummary[];
}) {
  // Hero fan mirrors this week's themed marquee so it previews the weekly
  // rotation; falls back to the curated set when the shortlist fetch came up
  // empty so the marquee never goes dark.
  const liveFan = tonight.movies.length > 0;
  /* WHERE THE REEL LIVES. The Curator Roulette used to be a third hero-weight
     card on every visit, under "Start ranking" and "Build your own list" — a
     third door on a page that should have one, doing the Marquee's job (a
     curated set, instant start) without the Marquee's two hooks (the weekly
     appointment and the puzzle), and painting itself in each pack's accent
     colour on a gold-on-velvet page. It earns its place in exactly two
     moments: when a returning player has already ranked this week and has
     nothing else to do here, and when the Community Spotlight has nothing to
     show and needs an action instead of a "Coming Soon" card. Anywhere else it
     is competition for the marquee. */
  const alreadyRankedThisWeek = !!tonight.userThemeListId;
  const fanMovies = liveFan ? tonight.movies.slice(0, 8) : [];
  const fanItems: { m: TmdbMovieCredit; tilt: number; arcY: number }[] = liveFan
    ? fanMovies.map((m, i) => {
        const total = fanMovies.length;
        const normalized = total > 1 ? (i / (total - 1)) * 2 - 1 : 0; // -1 to 1
        return {
          m,
          // ±7°: at ±11° a 300px card's top corner swung ~57px over its
          // neighbour and hid nearly a third of every face. The fan still
          // reads as a hand; the films read as films.
          tilt: Math.round(normalized * 7 * 10) / 10,
          arcY: Math.round(Math.pow(Math.abs(normalized), 1.8) * 14), // natural arched curve
        };
      })
    : FAN_POSTERS.map((p, i) => {
        const total = FAN_POSTERS.length;
        const normalized = total > 1 ? (i / (total - 1)) * 2 - 1 : 0;
        return {
          m: {
            tmdbId: p.tmdbId,
            title: p.title,
            posterPath: p.posterPath,
            releaseYear: p.releaseYear,
          },
          tilt: p.tilt || Math.round(normalized * 7 * 10) / 10,
          arcY: Math.round(Math.pow(Math.abs(normalized), 1.8) * 14),
        };
      });
  const router = useRouter();
  /* THE SPOILER RULE applies to the resume card and the resume dialog too. The
     saved session's title IS the theme title for a Marquee run, and both of
     those surfaces printed it in Bebas caps directly under a hero that goes to
     lengths to withhold it. Same helper the play room's header uses. */
  const savedDisplayTitle = (s: PlaySession | null) =>
    s ? marqueeDisplayTitle(s.title || "Untitled ranking", s.themeSlug, marqueeNumber()) : "";
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<TmdbMovieCredit[]>([]);
  const [confirmResume, setConfirmResume] = useState(false);
  const [savedSession, setSavedSession] = useState<PlaySession | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const hydratedRef = useRef(false);
  // which entry point opened the resume confirm: tray "Start" vs "Rank this list"
  const pendingCuratedRef = useRef(false);

  useEffect(() => {
    // async hop so pre-hydration markup matches first client render (same as play room)
    const t = setTimeout(() => {
      const s = loadSession();
      setSavedSession(s && s.movies?.length >= 2 ? s : null);

      const draft = loadStagedDraft();
      if (draft) {
        if (draft.title) setTitle(draft.title);
        if (draft.participants?.length > 0) setParticipants(draft.participants);
        if (draft.candidates?.length > 0) setCandidates(draft.candidates);
      }
      hydratedRef.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Persist staged candidates/title/participants to localStorage when updated
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveStagedDraft({ title, participants, candidates });
  }, [title, participants, candidates]);

  function discardRanking() {
    clearSession();
    setSavedSession(null);
    setConfirmDiscard(false);
    setConfirmResume(false);
  }

  function addCandidate(m: TmdbMovieCredit) {
    setCandidates((prev) => mergeCandidates(prev, [m]));
  }

  // hero posters toggle: tap to add, tap again to remove (same tray state as search picks)
  function toggleCandidate(m: TmdbMovieCredit) {
    if (candidates.some((c) => c.tmdbId === m.tmdbId)) {
      setCandidates((prev) => prev.filter((c) => c.tmdbId !== m.tmdbId));
    } else {
      addCandidate(m);
    }
  }

  function start(curated = false) {
    // read localStorage at interaction time to avoid SSR/hydration concerns
    const existing = loadSession();
    if (existing && (existing.movies?.length ?? 0) >= 2) {
      pendingCuratedRef.current = curated;
      setConfirmResume(true);
      return;
    }
    begin(curated);
  }

  function begin(curated = false) {
    if (!curated) {
      clearStagedDraft();
    }
    const source = curated ? tonight.movies : candidates;
    const movies: RankedMovie[] = source.map((m) => ({
      tmdbId: m.tmdbId,
      title: m.title,
      posterPath: m.posterPath,
      releaseYear: m.releaseYear,
      tagline: m.tagline ?? null,
      elo: 1000,
      comparisons: 0,
      parked: false,
    }));
    saveSession({
      // curated sessions are seeded with exactly the theme movies, titled by the theme
      title: curated ? tonight.title : title.trim() || "Movie ranking",
      participants,
      movies,
      votesSinceOrderChange: 0,
      nudgeShown: false,
      ...(curated && tonight.themeSlug
        ? { themeSlug: tonight.themeSlug, curated: true }
        : {}),
    });
    router.push("/r/play");
  }

  return (
    <>
      {/* Curtain stage band (DESIGN.md "Premiere Night"): marquee title, gold CTA,
          and a fanned row of real posters under a spotlight glow. Text sits on a
          surface scrim so it never lands on fold crests. */}
      <header className="relative overflow-hidden bg-curtain">
        <div aria-hidden="true" className="spotlight-glow pointer-events-none absolute inset-0" />
        {/* Premiere-night searchlights: two slow-drifting gold shafts from the
            bottom corners, crossing behind the marquee. Purely decorative CSS;
            reduced-motion renders them static at base angle. */}
        <div aria-hidden="true" className="searchlights pointer-events-none absolute inset-0 overflow-hidden" />
        {/* Soft scrim behind the headline. Replaces the boxed placard; see the
            note on the h1 below. */}
        <div aria-hidden="true" className="hero-scrim pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-page px-4 pt-8 text-center sm:pt-12 sm:px-6 lg:px-8">
          {/* ONE display beat. This used to be a dark placard — a rounded
              bg-bg/80 box with a ring — holding the wordmark at up to 96px and
              the hook at 44px, both in gold caps, both shouting. Two problems:
              a hard rectangle floating on velvet reads as a sign bolted onto a
              set rather than as type on a stage, and the site's NAME was the
              biggest thing on a page whose header already says the name.

              Now the wordmark is an eyebrow and the hook is the headline. The
              legibility the box provided comes from `.hero-scrim` (a soft
              radial darkening behind the text, painted on the header) plus a
              text shadow, so the words still never sit on a bare fold crest —
              DESIGN.md's rule — without a box edge anywhere. The gold shimmer
              moves onto the phrase that matters. */}
          <p
            role="presentation"
            style={{ "--rise-delay": "0ms" } as React.CSSProperties}
            className="rise font-display text-sm uppercase tracking-[0.32em] text-gold/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] sm:text-base"
          >
            <span aria-hidden="true" className="mr-2 text-[0.75em]">✦</span>
            movieranker.win
            <span aria-hidden="true" className="ml-2 text-[0.75em]">✦</span>
          </p>
          {/* The document heading and the hook are the same line, so the promise
              is the first thing read and the head-to-head phrasing the title and
              meta description are indexed on stays in the h1. Bebas needs almost
              no tracking at this size; the clamp keeps it to two lines from 360px
              up without ever breaking inside a phrase. */}
          <h1 className="mx-auto mt-3 max-w-4xl font-display text-[clamp(2.2rem,7vw,5rem)] uppercase leading-[0.95] tracking-[0.03em] text-text drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            <span className="rise block" style={{ "--rise-delay": "120ms" } as React.CSSProperties}>
              Rank them head-to-head.
            </span>
            {/* Wrapped, not combined: .marquee-gold carries its own animation
                (the shimmer) and a second `animation` declaration on the same
                element would replace it. */}
            <span className="rise block" style={{ "--rise-delay": "260ms" } as React.CSSProperties}>
              <span className="marquee-gold">Find the connection.</span>
            </span>
          </h1>
          {/* Fanned marquee of real posters: overlapping, tilted -8°..8°,
              straighten+lift on hover (200ms ease-out; killed by reduced-motion).
              Slightly dimmed at rest so the Bebas headline above stays dominant. */}
          {/* justify-start on mobile so overflow scrolls forward (centered
              overflow would clip the leading posters out of reach); centered
              once the row fits (~sm+). Negative mx gives gentle edge overlap
              while keeping >=82% of each poster face visible. */}
          {/* THE SPOILER RULE, on the front door. This used to print the theme
              title and blurb in 48px gold — and the theme title IS the answer to
              the connection puzzle waiting at the end of the ranking. Anyone who
              arrived through the homepage had the quiz spoiled before they
              started. The week is named by its number; the films do the
              inviting. */}
          {liveFan && (
            <div
              className="rise mt-7 flex flex-wrap items-center justify-center gap-2.5"
              style={{ "--rise-delay": "400ms" } as React.CSSProperties}
            >
              {/* A div, not a p: MarqueeInfoModal renders a <dialog>, which is
                  flow content and cannot legally sit inside a paragraph. The
                  display styling stays on the label so the dialog does not
                  inherit uppercase, letter-spacing and a display face from it. */}
              <span className="text-sm text-gold/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                This week&apos;s marquee, no. {marqueeNumber()}
              </span>
              <MarqueeInfoModal />
            </div>
          )}
          {/* THE FAN. Poster width scales with the viewport (13vw, floored for
              phones and capped for very wide screens) so the cards are the
              largest thing under the headline on any desktop, instead of a
              fixed 8.4rem that read as thumbnails on a 1440px stage. Overlap
              is held to ≤18% of a face — DESIGN.md's ">=82% visible" rule,
              which the old -mx-4 on a 134px card broke at 24%.

              Centering: `justify-content: safe center`. Plain `justify-center`
              on an overflowing flex row clips BOTH ends and cannot be scrolled
              back — a latent "the posters are cut off" wherever the fan outgrew
              the column. The `safe` keyword centres while the row fits and
              falls back to start-aligned scrolling when it does not. (A `w-max`
              list with `mx-auto` was tried first and sat ~70px right of centre
              with the last card clipped: max-content width does not net out the
              cards' negative margins, so the centred box was wider than the
              drawn fan.) */}
        </div>
        {/* The fan sits OUTSIDE the max-w-page text column, at the full width of
            the stage: seven viewport-scaled cards are wider than a 72rem column
            from ~1300px up, and inside it they overflowed and start-aligned —
            "the posters are cut off", the desktop edition. The hero band is
            full-bleed anyway; only the words need the column. */}
        <div className="relative mt-4 text-center">
            <div aria-hidden="true" className="stage-pool pointer-events-none absolute inset-x-0 bottom-0 h-2/3" />
            <ul className="no-scrollbar fan-scroll relative flex overflow-x-auto px-6 pt-8 pb-14 sm:px-6">
            {fanItems.map(({ m, tilt, arcY }, i) => {
              const inTray = candidates.some((c) => c.tmdbId === m.tmdbId);
              return (
                <li
                  key={m.tmdbId}
                  style={{
                    "--tilt": `${tilt}deg`,
                    "--arc-y": `${arcY}px`,
                    /* Deal order, left to right, 65ms apart: the whole hand is
                       down inside a second. See `.poster-deal` in globals.css. */
                    "--deal-delay": `${520 + i * 65}ms`,
                    zIndex: fanItems.length - Math.abs(i - (fanItems.length - 1) / 2),
                  } as React.CSSProperties}
                  className="poster-deal group relative -mx-1 w-[clamp(7rem,13vw,12.5rem)] shrink-0 origin-bottom translate-y-[var(--arc-y)] rotate-[var(--tilt)] transition-all duration-500 ease-out transform-gpu hover:z-40 hover:rotate-0 hover:-translate-y-4 hover:scale-[1.05] md:-mx-2"
                >
                  <button
                    type="button"
                    onClick={() => toggleCandidate(m)}
                    aria-label={`Add ${m.title} to your ranking`}
                    aria-pressed={inTray}
                    title={inTray ? "Already on your list — tap to remove" : `Add ${m.title}`}
                    className="block w-full cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <MoviePoster
                      title={m.title}
                      posterPath={m.posterPath}
                      className="shadow-xl transition-all duration-500 ease-out group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(245,197,24,0.25)] group-hover:ring-2 group-hover:ring-gold/70"
                    />
                    {inTray && (
                      <span
                        aria-hidden
                        className="absolute right-1 bottom-1 z-10 rounded-full bg-gold px-1.5 py-0.5 text-xs font-bold text-bg shadow"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            </ul>
        </div>
        <div className="relative mx-auto w-full max-w-page px-4 pb-10 text-center sm:pb-14 sm:px-6 lg:px-8">
          {/* The question is the hook and the honest one: it is the same thing
              the puzzle asks at the end, and it only works because the theme is
              withheld above. Two display beats in this hero — the name and the
              question — and everything else stays quiet. */}
          {/* The hook and the document heading both moved up into the wordmark
              block, so what is left below the posters is one action and one
              status line. This used to carry six stacked text blocks (a gold
              display line, a sub-line, the countdown pill, a settled count, a
              proposer credit and a "build your own" link), which is what made
              the hero read as a wall of copy. */}
          {liveFan ? (
            <div
              className="rise mt-6 flex flex-col items-center gap-3"
              style={{ "--rise-delay": "1000ms" } as React.CSSProperties}
            >
              {tonight.userThemeListId ? (
                <div className="flex flex-col items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/40">
                    <span aria-hidden="true" className="text-base font-bold">✓</span>
                    <span>You ranked it</span>
                  </span>
                  <Link
                    href={`/l/${tonight.userThemeListId}#community-consensus`}
                    className="inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-semibold leading-[44px] text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    See how you compared
                  </Link>
                  {/* The one visitor for whom a random pack is the right offer:
                      this week is done and Monday is hours away. */}
                  <a
                    href="#reel"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("reel")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-xs text-muted underline decoration-white/25 underline-offset-4 transition-colors hover:text-gold hover:decoration-gold focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    or spin a reel while you wait
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => start(true)}
                  className="inline-block min-h-11 cursor-pointer rounded-full bg-gold px-6 text-sm font-semibold leading-[44px] text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
                >
                  Start ranking
                </button>
              )}
              {/* The clock is the appointment mechanic; it was buried in the
                  second of two columns, which is the one place a weekly deadline
                  cannot do its job. */}
              <MarqueeCountdown />
              {/* Social proof belongs where the decision is made. This sat in a
                  panel a thousand pixels further down, which is nowhere. */}
              {/* Social proof and provenance, on ONE line. These were two
                  separate stacked paragraphs; both are secondary and neither
                  earns its own row under the fold. The "or build your own list"
                  link that used to close the stack is gone as redundant — the
                  full "Build your own list" section is the very next thing on
                  the page, with its own marquee heading. */}
              {(tonight.settledCount >= 25 || tonight.proposedBy) && (
                <p className="text-xs text-muted" data-testid="settled-count">
                  {tonight.settledCount >= 25 && tonight.proposedBy ? (
                    <>
                      {tonight.settledCount} rankings settled this week, theme by{" "}
                      <span className="font-medium text-gold">@{tonight.proposedBy}</span>.
                    </>
                  ) : tonight.settledCount >= 25 ? (
                    <>
                      {tonight.settledCount} rankings settled this week.
                    </>
                  ) : (
                    <>
                      Theme proposed by{" "}
                      <span className="font-medium text-gold">@{tonight.proposedBy}</span>.
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            <a
              href="#start"
              className="mt-6 inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-semibold leading-[44px] text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Start ranking
            </a>
          )}
        </div>
      </header>
      {/* Body below the curtain hero: one focal composition (search card),
          no duplicated hero heading and no whitespace voids — the docked tray
          plus its helper line carry the empty state. */}
      <main className="mx-auto w-full max-w-page flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8">
      {confirmResume && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-title"
          aria-describedby="resume-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-sheet-up"
          onClick={() => setConfirmResume(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl ring-1 ring-gold/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-gold">
              <span aria-hidden="true" className="text-xl">✦</span>
              <h3 id="resume-title" className="text-lg font-semibold text-text">
                Unfinished ranking in progress
              </h3>
            </div>
            <p id="resume-desc" className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
              Starting a new ranking will overwrite your active progress on “<strong className="text-text">{savedDisplayTitle(savedSession) || "Movie ranking"}</strong>”. Would you like to resume your saved session or start fresh?
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/r/play")}
                className="min-h-11 rounded-full bg-surface-raised px-5 text-sm font-semibold text-text ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-gold cursor-pointer"
              >
                Resume saved
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  setSavedSession(null);
                  setConfirmResume(false);
                  begin(pendingCuratedRef.current);
                }}
                className="min-h-11 rounded-full bg-gold px-6 text-sm font-semibold text-bg shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}
      {savedSession && savedSession.movies.length >= 2 && !confirmResume && (
        <div
          role="status"
          className="mb-8 flex flex-col gap-4 rounded-xl bg-surface/60 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 flex-1 text-sm text-text sm:text-base">
            You&apos;re partway through{" "}
            <span className="font-medium">{savedDisplayTitle(savedSession)}</span>
            {" — "}
            {savedSession.movies.length} film{savedSession.movies.length === 1 ? "" : "s"},{" "}
            {Math.floor(totalComparisons(savedSession) / 2)} vote
            {Math.floor(totalComparisons(savedSession) / 2) === 1 ? "" : "s"} in
            {savedSession.participants?.length > 0 && `, with ${savedSession.participants.join(", ")}`}.
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
            {confirmDiscard ? (
              <span className="flex items-center gap-3 text-xs sm:text-sm">
                <span className="text-muted">Discard this ranking?</span>
                <button
                  type="button"
                  onClick={discardRanking}
                  className="font-semibold text-accent-red underline decoration-accent-red/40 underline-offset-4 transition-colors hover:decoration-accent-red cursor-pointer"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="text-muted underline decoration-white/25 underline-offset-4 transition-colors hover:text-text cursor-pointer"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                className="text-xs text-muted underline decoration-white/25 underline-offset-4 transition-colors hover:text-accent-red hover:decoration-accent-red cursor-pointer sm:text-sm"
              >
                Discard
              </button>
            )}
            <Link
              href="/r/play"
              className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
            >
              Resume ranking
            </Link>
          </div>
        </div>
      )}
      {/* CHOOSE YOUR PREMIERE: the site's two entry paths, stacked full width.
          The marquee already leads in the hero, so the builder comes first here
          — that way a scroll reveals the second option immediately instead of
          after a full-height marquee panel. They were equal-width columns until
          the marquee became the hero, which left the builder padded out with
          dead space to match a taller neighbour. */}
      <MarqueeHeading as="h2">Build your own list</MarqueeHeading>
      <div className="mt-8 flex flex-col">
      {/* Path B: BUILD YOUR OWN LIST — the search panel lives inside this card. */}
      <section
        aria-label="Build your own list"
        className="rounded-lg bg-surface p-5 ring-1 ring-white/10 sm:p-6"
      >
        {/* No helper sentence above the panel and none below it. There were
            three around one input ("Search any actor, director, studio — settle
            anything." / the panel's own line / "…then share your ranked wall.");
            the tabs and the placeholder already say what this is. */}
        <div id="start" className="scroll-mt-6">
          <SearchPanel
            onPick={toggleCandidate}
            onAddAll={(movies) => setCandidates((prev) => mergeCandidates(prev, movies))}
            onRemoveAll={(movies) => setCandidates((prev) => removeCandidates(prev, movies))}
            isSelected={(m) => candidates.some((c) => c.tmdbId === m.tmdbId)}
          />
        </div>
      </section>
      </div>

      {/* Trending & Popular Showcases */}
      <section
        id="community-spotlight"
        aria-label="Community Spotlight"
        className="mt-14 scroll-mt-6"
      >
        <div className="text-center">
          <MarqueeHeading as="h2">Community Spotlight</MarqueeHeading>
          <p className="mt-2 text-xs text-muted sm:text-sm">
            Trending rankings and head-to-head verdicts from fellow film lovers.
          </p>
        </div>

        {(() => {
          /* The gate used to be `upvotesCount > 0`, which meant real public
             rankings stayed invisible until somebody had upvoted three of them
             — so on a young site the "Coming Soon" placeholder below was the
             DEFAULT state of a section that already had content to show.
             Ordering (hot score, upvotes, recency) is decided upstream in
             getTrendingLists; this only decides whether there is enough to
             fill a row. */
          const qualified = trendingLists;
          if (qualified.length >= 3) {
            return (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {qualified.map((list) => (
                  <article
                    key={list.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-surface/75 p-5 shadow-xl backdrop-blur-sm ring-1 ring-white/5 transition-all duration-300 hover:border-gold/40 hover:bg-surface hover:shadow-2xl hover:ring-gold/20"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/l/${list.id}`}
                            className="font-display text-xl uppercase leading-tight tracking-wide text-text transition-colors hover:text-gold sm:text-2xl"
                          >
                            {list.title}
                          </Link>
                          <p className="mt-1 text-xs text-muted">
                            {list.ownerHandle ? (
                              <>
                                By{" "}
                                <Link
                                  href={`/u/${list.ownerHandle}`}
                                  className="font-semibold text-gold transition-colors hover:underline"
                                >
                                  @{list.ownerHandle}
                                </Link>
                                , {list.movieCount} films
                              </>
                            ) : (
                              <span>By a community member, {list.movieCount} films</span>
                            )}
                          </p>
                        </div>
                        <UpvoteButton
                          listId={list.id}
                          initialCount={list.upvotesCount}
                          variant="card"
                          showLabel
                        />
                      </div>

                      {list.description && (
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                          {list.description}
                        </p>
                      )}

                      {/* Top 3 Triptych Posters */}
                      {list.topPosters.length > 0 && (
                        <div className="mt-4 flex items-center justify-center gap-2 py-2">
                          {list.topPosters.map((poster, rankIdx) => (
                            <div
                              key={poster.tmdbId}
                              className="relative w-20 shrink-0 transform-gpu transition-transform duration-200 group-hover:scale-[1.02] sm:w-24"
                            >
                              <MoviePoster
                                title={poster.title}
                                posterPath={poster.posterPath}
                                className={`rounded shadow-md ${rankIdx === 0 ? "ring-2 ring-gold" : "ring-1 ring-white/10"}`}
                              />
                              <span
                                aria-label={`Rank #${rankIdx + 1}`}
                                className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-bg/80 font-mono text-[10px] font-bold text-text shadow"
                              >
                                #{rankIdx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3.5">
                      <Link
                        href={`/l/${list.id}`}
                        className="text-xs font-medium text-gold transition-colors hover:underline"
                      >
                        See ranking
                      </Link>
                      <ForkButton
                        list={{
                          id: list.id,
                          title: list.title,
                          movies: list.movies,
                          themeSlug: list.themeSlug,
                        }}
                        ownerHandle={list.ownerHandle}
                        variant="card"
                      />
                    </div>
                  </article>
                ))}
              </div>
            );
          }

          /* Empty Spotlight. This was a blurred placeholder grid under a gold
             "Coming Soon" card — a decorated absence. An empty section should
             offer the thing that fills it: a ready-made reel to rank right now,
             which is the one context where the roulette is the right door. */
          return (
            <div id="reel" className="mt-8 scroll-mt-6">
              <p className="mb-4 text-center text-xs text-muted sm:text-sm">
                Nothing settled here yet. Rank a reel and be the first on the board.
              </p>
              <CuratorRoulette />
            </div>
          );
        })()}
      </section>

      {/* Returning player, populated Spotlight: the reel is the only thing
          left to offer, so it gets the last slot rather than a hero slot. When
          the Spotlight is empty it has already rendered the reel itself. */}
      {alreadyRankedThisWeek && trendingLists.length >= 3 && (
        <section id="reel" aria-label="Spin a reel" className="mt-14 scroll-mt-6">
          <CuratorRoulette />
        </section>
      )}

      <CandidateTray
        candidates={candidates}
        onRemove={(id) =>
          setCandidates((prev) => prev.filter((c) => c.tmdbId !== id))
        }
        onClearAll={() => setCandidates([])}
        participants={participants}
        onParticipantsChange={setParticipants}
        title={title}
        onTitleChange={setTitle}
        onStart={() => start()}
      />
      </main>
    </>
  );
}
