"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import CandidateTray from "@/components/CandidateTray";
import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import SearchPanel from "@/components/SearchPanel";
import { HERO_CANDIDATES, FAN_POSTERS } from "@/lib/hero-posters";
import type { RankedMovie } from "@/lib/ranking";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import { mergeCandidates } from "@/lib/tray";
import type { TmdbMovieCredit } from "@/lib/tmdb";

export interface TonightStrip {
  title: string;
  blurb: string;
  movies: TmdbMovieCredit[];
}

const STEPS = [
  {
    n: "01",
    icon: "🔍",
    alt: "Magnifying glass",
    title: "Build your list",
    body: "Search any actor, director, studio, or vibe. Tap the posters worth arguing about.",
  },
  {
    n: "02",
    icon: "⚔️",
    alt: "Crossed swords",
    title: "Battle head-to-head",
    body: "Movies enter the arena two at a time. Your crew debates, you tap the winner.",
  },
  {
    n: "03",
    icon: "🏆",
    alt: "Trophy",
    title: "Crown the champion",
    body: "Our engine settles the order and gives you a shareable ranked wall.",
  },
];

export default function HomeClient({ tonight }: { tonight: TonightStrip }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<TmdbMovieCredit[]>([]);
  const [confirmResume, setConfirmResume] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

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

  function start() {
    // read localStorage at interaction time to avoid SSR/hydration concerns
    const existing = loadSession();
    if (existing && (existing.movies?.length ?? 0) >= 2) {
      setConfirmResume(true);
      return;
    }
    begin();
  }

  function begin() {
    const movies: RankedMovie[] = candidates.map((m) => ({
      tmdbId: m.tmdbId,
      title: m.title,
      posterPath: m.posterPath,
      releaseYear: m.releaseYear,
      elo: 1000,
      comparisons: 0,
      parked: false,
    }));
    saveSession({
      title: title.trim() || "Movie ranking",
      participants,
      movies,
      votesSinceOrderChange: 0,
      nudgeShown: false,
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
              straighten+lift on hover (200ms ease-out; killed by reduced-motion). */}
          {/* Fanned marquee of real posters: overlapping, tilted -8°..8°,
              straighten+lift on hover (200ms ease-out; killed by reduced-motion).
              Slightly dimmed at rest so the Bebas headline above stays dominant. */}
          <ul className="mt-10 flex justify-center px-4 sm:mt-12">
            {FAN_POSTERS.map((p, i) => {
              const inTray = candidates.some((c) => c.tmdbId === p.tmdbId);
              return (
                <li
                  key={p.title}
                  style={{ "--tilt": `${p.tilt}deg`, zIndex: i === 3 ? 10 : i } as React.CSSProperties}
                  className="relative -mx-3 w-20 origin-bottom rotate-(--tilt) opacity-85 transition-all duration-200 ease-out hover:z-20 hover:rotate-0 hover:-translate-y-2 hover:opacity-100 sm:-mx-4 sm:w-28"
                >
                  <button
                    type="button"
                    onClick={() => toggleCandidate(HERO_CANDIDATES[i])}
                    aria-label={`Add ${p.title} to your ranking`}
                    aria-pressed={inTray}
                    title={inTray ? "Already on your list — tap to remove" : `Add ${p.title}`}
                    className="block w-full cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <MoviePoster title={p.title} posterPath={p.posterPath} className="shadow-xl" />
                  </button>
                </li>
              );
            })}
          </ul>
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
                begin();
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
      <div id="start">
        <SearchPanel
          onPick={toggleCandidate}
          onAddAll={(movies) => setCandidates((prev) => mergeCandidates(prev, movies))}
          isSelected={(m) => candidates.some((c) => c.tmdbId === m.tmdbId)}
        />
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
        onStart={start}
      />
      {/* How It Works (DESIGN.md "Premiere Night"): marquee-headed explainer for
          first-timers. Static cards; hover lift is motion-safe-only. */}
      <section aria-label="How it works" className="mt-16">
        <MarqueeHeading as="h2">How it works</MarqueeHeading>
        <ol className="mt-8 grid list-none gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <div className="h-full rounded-lg bg-surface p-5 ring-1 ring-white/10 transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <p aria-hidden="true" className="font-display text-3xl leading-none text-gold">{s.n}</p>
                  <span role="img" aria-label={s.alt} className="text-2xl">{s.icon}</span>
                </div>
                <h3 className="mt-3 font-display text-2xl uppercase tracking-wide">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-sm text-muted">
          No account needed to play — sign up only to save your lists.
        </p>
      </section>
      {/* Tonight's Shortlist (contract "Keep": filmstrip texture, Premiere Night
          type): themed strip that rotates daily — server-resolved theme +
          movie details. Posters stay tap-to-add candidates, same tray toggle as
          the hero fan. */}
      {tonight.movies.length > 0 && (
      <section aria-label="Tonight's shortlist" className="mt-16">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-gold/60" />
          <p className="font-display text-sm uppercase tracking-[0.2em] text-gold">
            Tonight&apos;s shortlist · rotates daily
          </p>
          <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-gold/60" />
        </div>
        <h2 className="mt-2 text-center font-display text-4xl uppercase leading-none tracking-[0.12em] text-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] sm:text-5xl">
          {tonight.title}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">{tonight.blurb}</p>
        <ul className="mt-8 flex gap-4 overflow-x-auto pb-4">
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
      </main>
    </>
  );
}
