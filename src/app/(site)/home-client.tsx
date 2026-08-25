"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CandidateTray from "@/components/CandidateTray";
import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import SearchPanel from "@/components/SearchPanel";
import { FAN_POSTERS } from "@/lib/hero-posters";
import type { RankedMovie } from "@/lib/ranking";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import { mergeCandidates, removeCandidates } from "@/lib/tray";
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
        tilt: fanMovies.length > 1 ? -4 + (8 * i) / (fanMovies.length - 1) : 0,
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
  const [hasSaved, setHasSaved] = useState(false);
  // which entry point opened the resume confirm: tray "Start" vs "Rank this list"
  const pendingCuratedRef = useRef(false);

  useEffect(() => {
    // async hop so pre-hydration markup matches first client render (same as play room)
    const t = setTimeout(() => {
      const s = loadSession();
      setHasSaved(!!s && s.movies.length >= 2);
    }, 0);
    return () => clearTimeout(t);
  }, []);

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
        <div className="relative mx-auto w-full max-w-5xl px-4 py-10 text-center sm:py-14">
          {/* Marquee wordmark: Bebas caps, warm gold sweep clipped to the
              glyphs (one-shot shimmer, reduced-motion-safe), ✦ bulbs flanking. */}
          <div className="mx-auto inline-block rounded-lg bg-bg/80 px-6 py-5 shadow-lg ring-1 ring-white/10 backdrop-blur-[2px] sm:px-8">
            <h1 className="font-display text-[clamp(2.5rem,11vw,6rem)] uppercase leading-none tracking-widest">
              <span aria-hidden="true" className="mr-2 align-middle text-gold text-[0.35em]">✦</span>
              <span className="marquee-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]">movieranker.win</span>
              <span aria-hidden="true" className="ml-2 align-middle text-gold text-[0.35em]">✦</span>
            </h1>
            <p className="mt-3 text-xl font-medium text-text sm:text-2xl">
              Settling the best movies of all time.
            </p>
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
          <ul className="mt-10 flex justify-center gap-3 px-4 sm:mt-12 sm:gap-4">
            {fanItems.map(({ m, tilt }, i) => {
              const inTray = candidates.some((c) => c.tmdbId === m.tmdbId);
              return (
                <li
                  key={m.tmdbId}
                  style={{ "--tilt": `${tilt}deg`, zIndex: fanItems.length - Math.abs(i - (fanItems.length - 1) / 2) } as React.CSSProperties}
                  className="relative mx-1 w-24 origin-bottom rotate-(--tilt) transition-all duration-200 ease-out hover:z-20 hover:rotate-0 hover:-translate-y-2 sm:mx-2 sm:w-28"
                >
                  <button
                    type="button"
                    onClick={() => toggleCandidate(m)}
                    aria-label={`Add ${m.title} to your ranking`}
                    aria-pressed={inTray}
                    title={inTray ? "Already on your list — tap to remove" : `Add ${m.title}`}
                    className="block w-full cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <MoviePoster title={m.title} posterPath={m.posterPath} className="shadow-xl" />
                    {overflowCount > 0 && i === fanItems.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute right-1 bottom-1 z-10 rounded-full bg-gold px-1.5 py-0.5 text-xs font-bold text-bg shadow"
                      >
                        +{overflowCount}
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-72">
      {confirmResume && (
        <div
          role="group"
          aria-labelledby="resume-title"
          aria-describedby="resume-desc"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded bg-surface p-4 ring-1 ring-accent"
        >
          <div>
            <p id="resume-title" className="font-semibold">You have an unfinished ranking.</p>
            <p id="resume-desc" className="mt-0.5 text-sm text-muted">
              Start fresh and your current progress is discarded.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/r/play")}
              className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-bg transition-colors duration-200 ease-out hover:bg-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => {
                clearSession();
                setConfirmResume(false);
                begin(pendingCuratedRef.current);
              }}
              className="min-h-11 rounded-full bg-surface-raised px-5 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}
      {hasSaved && !confirmResume && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded bg-surface p-4 ring-1 ring-white/10"
        >
          <p className="text-sm">You have a ranking in progress.</p>
          <Link
            href="/r/play"
            className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold leading-[44px] text-bg transition-colors duration-200 ease-out hover:bg-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Resume
          </Link>
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
        <p className="text-center font-display text-sm uppercase tracking-[0.2em] text-muted">
          This week&apos;s marquee · rotates weekly
        </p>
        <h3 className="mt-2 text-center font-display text-4xl uppercase leading-none tracking-[0.12em] text-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] sm:text-5xl">
          {tonight.title}
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">{tonight.blurb}</p>
        <p className="mt-2 text-center text-sm text-text">
          {tonight.movies.length} movies · rank them head-to-head until a champion emerges.
        </p>
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
            <button
              type="button"
              onClick={() => start(true)}
              className="inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wide text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
            >
              Rank this list 🔒
            </button>
          </div>
        )}
        {/* Rankings preview row: compact cards into each list, with a small
            "vs" affordance opening the compare picker pre-filled with that id. */}
        {tonight.previews.length > 0 && (
          <ul className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2" aria-label="Rankings matching this theme">
            {tonight.previews.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5 text-xs ring-1 ring-white/10"
              >
                <Link
                  href={`/l/${p.id}`}
                  className="max-w-[12rem] truncate font-medium transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {p.title}
                </Link>
                <Link
                  href={`/compare/${p.id}`}
                  aria-label={`Compare ${p.title} against another ranking`}
                  title="Compare against another ranking"
                  className="rounded-full bg-gold/15 px-2 py-0.5 font-bold uppercase tracking-wide text-gold transition-colors duration-200 ease-out hover:bg-gold/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  vs
                </Link>
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {tonight.movies.map((m) => {
            const inTray = candidates.some((c) => c.tmdbId === m.tmdbId);
            return (
              <li key={m.tmdbId} className="w-24 shrink-0 sm:w-32">
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
                    className="shadow-lg transition-transform duration-200 ease-out motion-safe:group-hover:-translate-y-1"
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
                <p className={`mt-1 truncate text-xs ${inTray ? "text-gold" : "text-muted"}`}>
                  {m.releaseYear}
                </p>
              </li>
            );
          })}
        </ul>
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
