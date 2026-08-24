"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CandidateTray from "@/components/CandidateTray";
import SearchPanel from "@/components/SearchPanel";
import type { RankedMovie } from "@/lib/ranking";
import { saveSession } from "@/lib/session";
import type { TmdbMovieCredit } from "@/lib/tmdb";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<TmdbMovieCredit[]>([]);

  function addCandidate(m: TmdbMovieCredit) {
    setCandidates((prev) =>
      prev.some((c) => c.tmdbId === m.tmdbId)
        ? prev
        : [...prev, m].sort((a, b) => a.title.localeCompare(b.title)),
    );
  }

  function start() {
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
