"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CandidateTray from "@/components/CandidateTray";
import MarqueeHeading from "@/components/MarqueeHeading";
import MarqueeInfoModal from "@/components/MarqueeInfoModal";
import MoviePoster from "@/components/list/MoviePoster";
import SearchPanel from "@/components/SearchPanel";
import { FAN_POSTERS } from "@/lib/hero-posters";
import type { RankedMovie } from "@/lib/ranking";
import { clearSession, loadSession, saveSession, totalComparisons, type PlaySession } from "@/lib/session";
import { getNextWeeklyMarqueeRotation } from "@/lib/shortlist";
import {
  clearStagedDraft,
  loadStagedDraft,
  mergeCandidates,
  removeCandidates,
  saveStagedDraft,
} from "@/lib/tray";
import { tmdbMovieUrl, type TmdbMovieCredit } from "@/lib/tmdb";

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
      <span>Next theme in <strong className="font-mono font-bold text-gold">{timeLeft}</strong></span>
    </div>
  );
}

export default function HomeClient({ tonight }: { tonight: TonightStrip }) {
  // Hero fan mirrors this week's themed marquee so it previews the weekly
  // rotation; falls back to the curated set when the shortlist fetch came up
  // empty so the marquee never goes dark.
  const liveFan = tonight.movies.length > 0;
  const fanMovies = liveFan ? tonight.movies.slice(0, 8) : [];
  const fanItems: { m: TmdbMovieCredit; tilt: number }[] = liveFan
    ? fanMovies.map((m, i) => ({
        m,
        // ponytail: linear tilt spread across the row; hand-tuned only if a wide fan looks off
        tilt: fanMovies.length > 1 ? -6 + (12 * i) / (fanMovies.length - 1) : 0,
      }))
    : FAN_POSTERS.map((p) => ({
        m: {
          tmdbId: p.tmdbId,
          title: p.title,
          posterPath: p.posterPath,
          releaseYear: p.releaseYear,
        },
        tilt: p.tilt,
      }));
  // fan caps at 8 posters; surface the rest so visitors know the theme is bigger
  const overflowCount = liveFan ? tonight.movies.length - fanMovies.length : 0;
  const scrollToMarquee = () =>
    document.getElementById("week-marquee")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<TmdbMovieCredit[]>([]);
  const [confirmResume, setConfirmResume] = useState(false);
  const [savedSession, setSavedSession] = useState<PlaySession | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const marqueeScrollRef = useRef<HTMLUListElement>(null);
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

  function scrollMarquee(offset: number) {
    if (!marqueeScrollRef.current) return;
    marqueeScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  }

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
              className="font-display text-[clamp(2.5rem,11vw,6rem)] uppercase leading-none tracking-widest"
            >
              <span aria-hidden="true" className="mr-2 align-middle text-gold text-[0.5em]">✦</span>
              <span className="marquee-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]">movieranker.win</span>
              <span aria-hidden="true" className="ml-2 align-middle text-gold text-[0.5em]">✦</span>
            </p>
            <h1 className="mt-3 text-xl font-medium text-text sm:text-2xl">
              Settling the best movies of all time.
            </h1>
            <p className="mt-1.5 text-lg text-muted sm:text-xl">
              <span className="underline decoration-gold decoration-2 underline-offset-4">
                One list at a time.
              </span>
            </p>
            <a
              href="#start"
              className="mt-4 inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-bold leading-[44px] uppercase tracking-wide text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Start ranking
            </a>
          </div>
          {/* Fanned marquee of real posters: overlapping, tilted -8°..8°,
              straighten+lift on hover (200ms ease-out; killed by reduced-motion).
              Slightly dimmed at rest so the Bebas headline above stays dominant. */}
          {/* justify-start on mobile so overflow scrolls forward (centered
              overflow would clip the leading posters out of reach); centered
              once the row fits (~sm+). Negative mx gives gentle edge overlap
              while keeping >=82% of each poster face visible. */}
          <ul className="mt-6 flex justify-start overflow-x-auto px-4 pt-6 pb-4 sm:justify-center">
            {fanItems.map(({ m, tilt }, i) => {
              const inTray = candidates.some((c) => c.tmdbId === m.tmdbId);
              return (
                <li
                  key={m.tmdbId}
                  style={{ "--tilt": `${tilt}deg`, zIndex: fanItems.length - Math.abs(i - (fanItems.length - 1) / 2) } as React.CSSProperties}
                  className="group relative -mx-2 w-[7.2rem] shrink-0 origin-bottom rotate-(--tilt) transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu hover:z-30 hover:rotate-0 hover:-translate-y-3 hover:scale-105 sm:-mx-3 sm:w-[8.4rem]"
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
                      className="shadow-xl transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.7)] group-hover:ring-2 group-hover:ring-gold/60"
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
          {overflowCount > 0 && (
            <button
              type="button"
              onClick={scrollToMarquee}
              className="mt-2 inline-block rounded bg-bg/80 px-3 py-2 text-xs font-medium text-text underline decoration-gold/60 decoration-2 underline-offset-4 transition-colors duration-200 ease-out hover:bg-bg hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              +{overflowCount} more in this week&apos;s marquee ↓
            </button>
          )}
          {liveFan && (
            <p className="mt-5 font-display text-sm uppercase tracking-[0.2em] text-gold drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
              This week&apos;s marquee · {tonight.title}
            </p>
          )}
        </div>
      </header>
      {/* Body below the curtain hero: one focal composition (search card),
          no duplicated hero heading and no whitespace voids — the docked tray
          plus its helper line carry the empty state. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8">
      {confirmResume && (
        <div
          role="group"
          aria-labelledby="resume-title"
          aria-describedby="resume-desc"
          className="mb-8 rounded-xl border border-accent bg-surface/95 p-5 shadow-2xl ring-1 ring-accent/30"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-accent">✦</span>
                <p id="resume-title" className="font-display text-xl uppercase tracking-wide text-text sm:text-2xl">
                  You have an unfinished ranking
                </p>
              </div>
              <p id="resume-desc" className="mt-1 text-sm text-muted">
                Starting a new ranking will overwrite your active progress on “{savedSession?.title === "Rain Soaked Cinema" ? "Heavy Rain, Poor Choices" : (savedSession?.title || "Movie ranking")}”.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={() => router.push("/r/play")}
                className="min-h-11 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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
                className="min-h-11 rounded-full bg-surface-raised px-5 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-accent-red/20 hover:text-accent-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
      {/* CHOOSE YOUR PREMIERE (user-directed): the site's two entry paths
          become the page's organizing structure. Path A — this week's themed
          marquee (rotates weekly); Path B — build your own list. Equal-width
          columns side by side on desktop (custom list LEFT, marquee RIGHT,
          ✦ vertical rule between); stacks at 390px marquee-first (DOM order). */}
      <MarqueeHeading as="h2">Choose your premiere</MarqueeHeading>
      <div className="mt-8 flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
      {/* Path A: THIS WEEK'S MARQUEE — server-resolved theme + movie details.
          Posters stay tap-to-add candidates, same tray toggle as the hero fan. */}
      {tonight.movies.length > 0 && (
      <section
        id="week-marquee"
        aria-label="This week's marquee"
        className="scroll-mt-6 rounded-lg bg-surface p-5 ring-1 ring-gold/40 sm:p-6 md:col-start-3 md:row-start-1"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-muted">
              This week&apos;s marquee
            </p>
            <MarqueeInfoModal />
          </div>
          <MarqueeCountdown />
        </div>

        {tonight.userThemeListId && (
          <div className="mx-auto my-3 flex w-fit items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <span aria-hidden="true" className="text-base font-bold">✓</span>
            <span>You ranked this week&apos;s marquee</span>
          </div>
        )}

        <h3 className="mt-2 text-center font-display text-4xl uppercase leading-none tracking-[0.12em] text-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] sm:text-5xl">
          {tonight.title}
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">{tonight.blurb}</p>
        {/* Proposal credit + real community activity (no fake social proof:
            both lines render only when the data actually exists). */}
        {tonight.proposedBy && (
          <p className="mt-1 text-center text-xs text-muted">
            Proposed by <span className="font-medium text-gold">@{tonight.proposedBy}</span>
          </p>
        )}
        {tonight.settledCount > 0 && (
          <p className="mt-1 text-center text-xs text-muted" data-testid="settled-count">
            {tonight.settledCount} ranking{tonight.settledCount === 1 ? "" : "s"} already
            settled this week
          </p>
        )}
        {tonight.themeSlug && (
          <div id="rank-tonight" className="mt-5 scroll-mt-6 text-center">
            {tonight.userThemeListId ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={`/l/${tonight.userThemeListId}#community-consensus`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
                >
                  <span>Show community stats</span>
                  <span aria-hidden="true" className="text-base">✦</span>
                </Link>
                <Link
                  href={`/l/${tonight.userThemeListId}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-raised px-5 text-sm font-semibold text-text ring-1 ring-white/15 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <span>View your ranking</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => start(true)}
                className="inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
              >
                Rank this list 🔒
              </button>
            )}
          </div>
        )}
        {/* Horizontal filmstrip: scroll affordances (snap points, navigation arrows,
            edge padding) signal more posters off-screen. */}
        <div className="relative mt-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Line-up ({tonight.movies.length} films)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollMarquee(-260)}
                aria-label="Scroll left"
                className="flex size-8 items-center justify-center rounded-full bg-surface-raised text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scrollMarquee(260)}
                aria-label="Scroll right"
                className="flex size-8 items-center justify-center rounded-full bg-surface-raised text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
              >
                ›
              </button>
            </div>
          </div>
          <ul
            ref={marqueeScrollRef}
            className="thin-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-4 scroll-smooth"
          >
            {tonight.movies.map((m) => {
              const inTray = candidates.some((c) => c.tmdbId === m.tmdbId);
              return (
                <li key={m.tmdbId} className="w-24 shrink-0 snap-start sm:w-32">
                  <button
                    type="button"
                    onClick={() => toggleCandidate(m)}
                    aria-label={`Add ${m.title}${m.releaseYear ? ` (${m.releaseYear})` : ""} to your ranking`}
                    aria-pressed={inTray}
                    title={inTray ? "Already on your list — tap to remove" : `Add ${m.title}`}
                    className="group relative block w-full rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <MoviePoster
                      title={m.title}
                      posterPath={m.posterPath}
                      className="shadow-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:scale-[1.03] group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.65)] group-hover:ring-1 group-hover:ring-gold/60"
                    />
                    {inTray && (
                      <span
                        aria-hidden
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-bg shadow"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <p className={`truncate text-xs ${inTray ? "text-gold" : "text-muted"}`}>
                      {m.releaseYear}
                    </p>
                    <a
                      href={tmdbMovieUrl(m.tmdbId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View ${m.title} on TMDB (opens in new tab)`}
                      aria-label={`View ${m.title} on TMDB`}
                      className="text-[10px] text-muted/80 transition-colors hover:text-gold focus-visible:outline-1 focus-visible:outline-gold"
                    >
                      TMDB ↗
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      )}
      {/* Gold rule with ✦ center between the two premiere paths:
          horizontal on mobile, vertical rule between columns on desktop.
          Rendered only when there is a shortlist to separate. */}
      {tonight.movies.length > 0 && (
        <div
          className="my-8 flex items-center gap-3 md:mx-3 md:my-0 md:flex-col"
          role="presentation"
        >
          {/* Spans stay flex-1 on desktop too: in the md:flex-col container
              they split the column height around ✦ (flex-basis 0), so total
              content never exceeds the stretched grid row — no overflow. */}
          <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-gold/60 md:min-h-4 md:min-w-0 md:w-px" />
          <span aria-hidden="true" className="text-gold">✦</span>
          <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-gold/60 md:min-h-4 md:min-w-0 md:w-px" />
        </div>
      )}
      {/* Path B: BUILD YOUR OWN LIST — the search panel lives inside this card. */}
      <section
        aria-label="Build your own list"
        className="rounded-lg bg-surface p-5 ring-1 ring-white/10 sm:p-6 md:col-start-1 md:row-start-1"
      >
        <h3 className="font-display text-3xl uppercase leading-none tracking-wide">Build your own list</h3>
        <p className="mt-1 text-sm text-muted">
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
