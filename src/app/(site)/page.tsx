"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import CandidateTray from "@/components/CandidateTray";
import SearchPanel from "@/components/SearchPanel";
import type { RankedMovie } from "@/lib/ranking";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import type { TmdbMovieCredit } from "@/lib/tmdb";

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
      {/* Curtain stage band (DESIGN.md): hero text sits on a surface scrim so it
          never lands on fold crests; muted subtitle is allowed only on the scrim. */}
      <header className="bg-curtain">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 text-center sm:py-14">
          <div className="mx-auto inline-block rounded-lg bg-bg/80 px-6 py-4 shadow-lg ring-1 ring-white/10 backdrop-blur-[2px]">
            <h1 className="text-3xl font-bold text-accent drop-shadow sm:text-5xl">
              movieranker.win
            </h1>
            <p className="mt-2 text-lg text-muted sm:text-xl">Settle it once and for all.</p>
          </div>
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
      <SearchPanel onPick={addCandidate} />
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
      </main>
    </>
  );
}
