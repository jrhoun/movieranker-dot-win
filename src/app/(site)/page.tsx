"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import CandidateTray from "@/components/CandidateTray";
import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import SearchPanel from "@/components/SearchPanel";
import { HERO_CANDIDATES, HERO_POSTERS } from "@/lib/hero-posters";
import type { RankedMovie } from "@/lib/ranking";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import type { TmdbMovieCredit } from "@/lib/tmdb";

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

export default function Home() {
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
    setCandidates((prev) =>
      prev.some((c) => c.tmdbId === m.tmdbId)
        ? prev
        : [...prev, m].sort((a, b) => a.title.localeCompare(b.title)),
    );
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
        <div className="relative mx-auto w-full max-w-5xl px-4 py-10 text-center sm:py-14">
          <div className="mx-auto inline-block rounded-lg bg-bg/80 px-6 py-4 shadow-lg ring-1 ring-white/10 backdrop-blur-[2px]">
            <h1 className="font-display text-6xl uppercase leading-none tracking-widest text-text drop-shadow sm:text-7xl">
              <span aria-hidden="true" className="mr-3 align-middle text-gold">✦</span>
              movieranker.win
              <span aria-hidden="true" className="ml-3 align-middle text-gold">✦</span>
            </h1>
            <p className="mt-2 text-lg text-muted sm:text-xl">Settle it once and for all.</p>
            <a
              href="#start"
              className="mt-4 inline-block min-h-11 rounded-full bg-gold px-6 text-sm font-bold leading-[44px] uppercase tracking-wide text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Start ranking
            </a>
          </div>
          {/* Fanned marquee of real posters: overlapping, tilted -8°..8°,
              straighten+lift on hover (200ms ease-out; killed by reduced-motion). */}
          <ul className="mt-8 flex justify-center px-4 sm:mt-10">
            {HERO_POSTERS.map((p, i) => {
              const inTray = candidates.some((c) => c.tmdbId === p.tmdbId);
              return (
                <li
                  key={p.title}
                  style={{ "--tilt": `${p.tilt}deg`, zIndex: i === 3 ? 10 : i } as React.CSSProperties}
                  className="relative -mx-3 w-20 origin-bottom rotate-(--tilt) transition-all duration-200 ease-out hover:z-20 hover:rotate-0 hover:-translate-y-2 sm:-mx-4 sm:w-28"
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
        <SearchPanel onPick={addCandidate} />
      </div>
      <CandidateTray
        candidates={candidates}
        onRemove={(id) =>
          setCandidates((prev) => prev.filter((c) => c.tmdbId !== id))
        }
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
          No account needed to play — sign up only to save your masterpiece.
        </p>
      </section>
      </main>
    </>
  );
}
