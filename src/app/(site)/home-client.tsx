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
  title: string;
  blurb: string;
  /** Theme slug (shortlist rotation id); null when the fetch came up empty. */
  themeSlug: string | null;
  movies: TmdbMovieCredit[];
  /** Proposer's public handle when this week's theme is a community proposal. */
  proposedBy: string | null;
  /** Done lists sharing >=3 movies with this week's theme (0 = show nothing). */
  settledCount: number;
  previews: { id: string; title: string }[];
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
      setTimeLeft(`${days}d ${hours}h ${mins}m`);
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-4 py-1.5 text-sm font-medium text-text ring-1 ring-white/15 shadow-sm">
      <span aria-hidden="true" className="text-base text-gold">⏳</span>
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
  const fanMovies = liveFan ? tonight.movies.slice(0, 8) : [];
  const fanItems: { m: TmdbMovieCredit; tilt: number; arcY: number }[] = liveFan
    ? fanMovies.map((m, i) => {
        const total = fanMovies.length;
        const normalized = total > 1 ? (i / (total - 1)) * 2 - 1 : 0; // -1 to 1
        return {
          m,
          tilt: Math.round(normalized * 9.5 * 10) / 10, // -9.5deg to +9.5deg playing card fan
          arcY: Math.round(Math.pow(Math.abs(normalized), 1.8) * 12), // natural arched curve
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
          tilt: p.tilt || Math.round(normalized * 9.5 * 10) / 10,
          arcY: Math.round(Math.pow(Math.abs(normalized), 1.8) * 12),
        };
      });
  const router = useRouter();
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
        <div className="relative mx-auto w-full max-w-7xl px-4 py-10 text-center sm:py-14 sm:px-6 lg:px-8">
          {/* Marquee wordmark: Bebas caps, warm gold sweep clipped to the
              glyphs (one-shot shimmer, reduced-motion-safe), ✦ bulbs flanking. */}
          <div className="mx-auto inline-block rounded-lg bg-bg/80 px-6 py-5 shadow-lg ring-1 ring-white/10 backdrop-blur-[2px] sm:px-8">
            {/* Wordmark is the visual anchor but not the document heading: the
                h1 below carries the descriptive phrase search engines index. */}
            <p
              role="presentation"
              /* The wordmark line overflowed the viewport below ~430px: at the
                 old clamp floor, fifteen Bebas caps plus 0.1em tracking and two
                 flanking stars measured wider than the screen, so the whole
                 page scrolled sideways. Tracking is the expensive part on a
                 narrow screen, so it only opens up once there is room. */
              className="font-display text-[clamp(2rem,9.5vw,6rem)] uppercase leading-none tracking-wide sm:tracking-widest"
            >
              <span aria-hidden="true" className="mr-2 align-middle text-gold text-[0.34em] sm:text-[0.5em]">✦</span>
              <span className="marquee-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]">movieranker.win</span>
              <span aria-hidden="true" className="ml-2 align-middle text-gold text-[0.34em] sm:text-[0.5em]">✦</span>
            </p>
            <h1 className="mt-3 text-xl font-medium text-text sm:text-2xl">
              Rank movies head-to-head. Solo or with friends.
            </h1>
          </div>
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
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {/* A div, not a p: MarqueeInfoModal renders a <dialog>, which is
                  flow content and cannot legally sit inside a paragraph. The
                  display styling stays on the label so the dialog does not
                  inherit uppercase, letter-spacing and a display face from it. */}
              <span className="font-display text-sm uppercase tracking-[0.28em] text-gold/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                This week&apos;s marquee · No {marqueeNumber()}
              </span>
              <MarqueeInfoModal />
            </div>
          )}
          <ul className="no-scrollbar mt-4 flex justify-start overflow-x-auto px-4 pt-6 pb-4 sm:justify-center">
            {fanItems.map(({ m, tilt, arcY }, i) => {
              const inTray = candidates.some((c) => c.tmdbId === m.tmdbId);
              return (
                <li
                  key={m.tmdbId}
                  style={{
                    "--tilt": `${tilt}deg`,
                    "--arc-y": `${arcY}px`,
                    zIndex: fanItems.length - Math.abs(i - (fanItems.length - 1) / 2),
                  } as React.CSSProperties}
                  className="group relative -mx-2.5 w-[7.2rem] shrink-0 origin-bottom translate-y-[var(--arc-y)] rotate-[var(--tilt)] transition-all duration-500 ease-out transform-gpu hover:z-40 hover:rotate-0 hover:-translate-y-3 hover:scale-[1.04] sm:-mx-3.5 sm:w-[8.4rem] md:-mx-4"
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
          {/* The question is the hook and the honest one: it is the same thing
              the puzzle asks at the end, and it only works because the theme is
              withheld above. Two display beats in this hero — the name and the
              question — and everything else stays quiet. */}
          {liveFan ? (
            <div className="mt-5 flex flex-col items-center gap-3">
              <p className="font-display text-3xl uppercase leading-none tracking-[0.06em] text-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] sm:text-4xl">
                Rank them. Find the connection.
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-text/85">
                Then see how your order compares to everyone else&apos;s.
              </p>
              {tonight.userThemeListId ? (
                <div className="flex flex-col items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/40">
                    <span aria-hidden="true" className="text-base font-bold">✓</span>
                    <span>You ranked it</span>
                  </span>
                  <Link
                    href={`/l/${tonight.userThemeListId}#community-consensus`}
                    className="inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-bold leading-[44px] uppercase tracking-wide text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    See how you compared
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => start(true)}
                  className="inline-block min-h-11 cursor-pointer rounded-full bg-gold px-6 text-sm font-bold leading-[44px] uppercase tracking-wide text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
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
              {tonight.settledCount > 0 && (
                <p className="text-xs text-muted" data-testid="settled-count">
                  {tonight.settledCount} ranking{tonight.settledCount === 1 ? "" : "s"} already
                  settled this week
                </p>
              )}
              {tonight.proposedBy && (
                <p className="text-xs text-muted">
                  Theme proposed by <span className="font-medium text-gold">@{tonight.proposedBy}</span>
                </p>
              )}
              <a
                href="#start"
                className="text-xs text-muted underline decoration-white/25 underline-offset-4 transition-colors hover:text-gold hover:decoration-gold focus-visible:outline-2 focus-visible:outline-gold"
              >
                or build your own list →
              </a>
            </div>
          ) : (
            <a
              href="#start"
              className="mt-6 inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-bold leading-[44px] uppercase tracking-wide text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Start ranking
            </a>
          )}
        </div>
      </header>
      {/* Body below the curtain hero: one focal composition (search card),
          no duplicated hero heading and no whitespace voids — the docked tray
          plus its helper line carry the empty state. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8">
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
              <h3 id="resume-title" className="font-display text-2xl uppercase tracking-wide text-text">
                Unfinished Ranking in Progress
              </h3>
            </div>
            <p id="resume-desc" className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
              Starting a new ranking will overwrite your active progress on “<strong className="text-text">{savedSession?.title === "Rain Soaked Cinema" ? "Heavy Rain, Poor Choices" : (savedSession?.title || "Movie ranking")}</strong>”. Would you like to resume your saved session or start fresh?
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/r/play")}
                className="min-h-11 rounded-full bg-surface-raised px-5 text-sm font-semibold text-text ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-gold cursor-pointer"
              >
                Resume Saved
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  setSavedSession(null);
                  setConfirmResume(false);
                  begin(pendingCuratedRef.current);
                }}
                className="min-h-11 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
              >
                Start Fresh →
              </button>
            </div>
          </div>
        </div>
      )}
      {savedSession && savedSession.movies.length >= 2 && !confirmResume && (
        <div
          role="status"
          className="mb-8 overflow-hidden rounded-xl border border-gold/40 bg-surface/95 p-5 shadow-2xl backdrop-blur"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-gold">✦</span>
                <p className="font-display text-xs uppercase tracking-[0.2em] text-gold">
                  Ranking in Progress
                </p>
                {savedSession.curated && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-gold">
                    Marquee Theme
                  </span>
                )}
              </div>
              <h3 className="mt-1 truncate font-display text-2xl uppercase tracking-wide text-text sm:text-3xl">
                {savedSession.title === "Rain Soaked Cinema" ? "Heavy Rain, Poor Choices" : (savedSession.title || "Untitled ranking")}
              </h3>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                {savedSession.movies.length} movies · {Math.floor(totalComparisons(savedSession) / 2)} votes completed
                {savedSession.participants?.length > 0 && ` · with ${savedSession.participants.join(", ")}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {confirmDiscard ? (
                <div className="flex items-center gap-2 rounded-full bg-surface-raised p-1 ring-1 ring-accent-red/50">
                  <span className="pl-3 text-xs font-medium text-accent-red">Discard ranking?</span>
                  <button
                    type="button"
                    onClick={discardRanking}
                    className="min-h-9 rounded-full bg-accent-red px-3 text-xs font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-accent-red"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(false)}
                    className="min-h-9 rounded-full bg-white/10 px-3 text-xs font-medium text-text transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(true)}
                  className="min-h-11 rounded-full bg-surface-raised px-4 text-xs font-medium text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:border-accent-red/50 hover:bg-accent-red/10 hover:text-accent-red focus-visible:outline-2 focus-visible:outline-accent-red"
                >
                  Discard ranking
                </button>
              )}
              <Link
                href="/r/play"
                className="flex min-h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
              >
                Resume ranking →
              </Link>
            </div>
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
        <p className="text-sm text-muted">
          Search any actor, director, studio — settle anything.
        </p>
        <div id="start" className="mt-4 scroll-mt-6">
          <SearchPanel
            onPick={toggleCandidate}
            onAddAll={(movies) => setCandidates((prev) => mergeCandidates(prev, movies))}
            onRemoveAll={(movies) => setCandidates((prev) => removeCandidates(prev, movies))}
            isSelected={(m) => candidates.some((c) => c.tmdbId === m.tmdbId)}
          />
        </div>
        <p className="mt-4 text-sm text-muted">…then share your ranked wall.</p>
      </section>
      </div>

      {/* Curator Roulette — "Roll the Reel" Instant Start */}
      <section aria-label="Curator Roulette" className="mt-14">
        <CuratorRoulette />
      </section>

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
          const qualified = trendingLists.filter((l) => (l.upvotesCount ?? 0) > 0);
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
                                Curated by{" "}
                                <Link
                                  href={`/u/${list.ownerHandle}`}
                                  className="font-semibold text-gold transition-colors hover:underline"
                                >
                                  @{list.ownerHandle}
                                </Link>
                              </>
                            ) : (
                              <span>Curated by Community Member</span>
                            )}
                            <span className="mx-1.5 text-muted/50">·</span>
                            <span>{list.movieCount} films</span>
                          </p>
                        </div>
                        <UpvoteButton
                          listId={list.id}
                          initialCount={list.upvotesCount}
                          variant="card"
                          showLabel={false}
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
                                className="rounded shadow-md ring-1 ring-white/10"
                              />
                              <span
                                aria-label={`Rank #${rankIdx + 1}`}
                                className={`absolute top-1 left-1 flex size-5 items-center justify-center rounded-full font-mono text-[10px] font-bold shadow ${
                                  rankIdx === 0
                                    ? "bg-gold text-bg ring-1 ring-gold"
                                    : rankIdx === 1
                                      ? "bg-slate-300 text-slate-900"
                                      : "bg-amber-700 text-amber-100"
                                }`}
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
                        className="text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-gold"
                      >
                        View Ranking →
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

          return (
            <div className="relative mt-8 min-h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-surface/40 p-6">
              {/* Blurred Silhouette Preview Grid */}
              <div
                aria-hidden="true"
                className="pointer-events-none select-none filter blur-md opacity-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {[1, 2, 3].map((placeholderIdx) => (
                  <div
                    key={placeholderIdx}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-surface/80 p-5"
                  >
                    <div>
                      <div className="h-6 w-3/4 rounded bg-white/20 mb-2" />
                      <div className="h-3 w-1/2 rounded bg-white/10 mb-4" />
                      <div className="flex justify-center gap-2 py-4">
                        <div className="aspect-[2/3] w-20 rounded bg-white/10" />
                        <div className="aspect-[2/3] w-20 rounded bg-white/15" />
                        <div className="aspect-[2/3] w-20 rounded bg-white/10" />
                      </div>
                    </div>
                    <div className="h-4 w-1/3 rounded bg-white/10" />
                  </div>
                ))}
              </div>

              {/* Centered Coming Soon Marquee Card */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="max-w-md rounded-2xl border border-gold/30 bg-surface/95 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md ring-1 ring-gold/20">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 font-display text-xs uppercase tracking-widest text-gold ring-1 ring-gold/40">
                    ✦ Coming Soon ✦
                  </span>
                  <h3 className="mt-3 font-display text-2xl uppercase tracking-wider text-text sm:text-3xl">
                    Community Spotlight
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                    Featured community rankings will appear here as lists are created and voted on.
                  </p>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-bg shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                    >
                      <span>Start a Ranking</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

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
