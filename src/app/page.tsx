"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-72">
      <header className="py-10 text-center sm:py-14">
        <h1 className="text-3xl font-bold text-accent sm:text-5xl">movieranker.win</h1>
        <p className="mt-2 text-lg text-muted sm:text-xl">Settle it once and for all.</p>
      </header>
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
      <SearchPanel onPick={addCandidate} />
      <CandidateTray
        candidates={candidates}
        onRemove={(id) => setCandidates((prev) => prev.filter((c) => c.tmdbId !== id))}
        participants={participants}
        onParticipantsChange={setParticipants}
        title={title}
        onTitleChange={setTitle}
        onStart={start}
      />
    </main>
  );
}
