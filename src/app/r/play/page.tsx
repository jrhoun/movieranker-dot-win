"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import MatchupStage from "@/components/MatchupStage";
import ParkedStrip from "@/components/ParkedStrip";
import {
  estimateRemainingVotes,
  finalizeRanks,
  isStable,
  type RankedMovie,
} from "@/lib/ranking";
import {
  applyVote,
  loadSession,
  parkMovie,
  saveSession,
  selectNextPair,
  type PlaySession,
} from "@/lib/session";

function RankedList({ movies }: { movies: RankedMovie[] }) {
  const byId = new Map(movies.map((m) => [m.tmdbId, m]));
  return (
    <ol className="mt-4 space-y-2 text-left">
      {finalizeRanks(movies).map((r) => {
        const m = byId.get(r.tmdbId)!;
        return (
          <li key={r.tmdbId} className="flex items-baseline gap-3">
            <span className="w-6 shrink-0 text-right font-mono text-sm text-accent">
              {r.rank}.
            </span>
            <span className="min-w-0 truncate">{m.title}</span>
            <span className="shrink-0 text-xs text-muted">{m.releaseYear ?? ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PlayRoom({
  onFinish,
}: {
  onFinish?: (session: PlaySession) => void;
}) {
  const [session, setSession] = useState<PlaySession | null>(null);
  const [ready, setReady] = useState(false);
  const [pair, setPair] = useState<[RankedMovie, RankedMovie] | null>(null);
  const [settlingLoserId, setSettlingLoserId] = useState<number | null>(null);
  const [sharpening, setSharpening] = useState(false);
  const [finished, setFinished] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // async hop so pre-hydration server markup matches first client render
  useEffect(() => {
    const t = setTimeout(() => {
      const s = loadSession();
      setSession(s);
      setPair(s ? selectNextPair(s, false) : null);
      setReady(true);
    }, 0);
    return () => {
      clearTimeout(t);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  const active = useMemo(() => session?.movies.filter((m) => !m.parked) ?? [], [session]);
  const parked = useMemo(() => session?.movies.filter((m) => m.parked) ?? [], [session]);
  const stable = !!session && active.length >= 2 && isStable(active, session.votesSinceOrderChange);

  const doneVotes = Math.round((session?.movies.reduce((a, m) => a + m.comparisons, 0) ?? 0) / 2);
  const targetVotes = Math.max(1, Math.ceil(active.length * 2.5));
  const pct = Math.min(100, Math.round((doneVotes / targetVotes) * 100));

  function handleVote(winnerId: number, loserId: number) {
    if (!session || settlingLoserId !== null) return;
    const next = applyVote(session, winnerId, loserId);
    setSession(next);
    saveSession(next);
    setSettlingLoserId(loserId);
    settleTimer.current = setTimeout(() => {
      setSettlingLoserId(null);
      const p = selectNextPair(next, sharpening);
      if (sharpening && !p) setSharpening(false);
      setPair(p);
    }, 220);
  }

  function handleParkToggle(tmdbId: number, toParked: boolean) {
    if (!session || settlingLoserId !== null) return;
    const next = parkMovie(session, tmdbId, toParked);
    setSession(next);
    saveSession(next);
    const p = selectNextPair(next, sharpening);
    if (sharpening && !p) setSharpening(false);
    setPair(p);
  }

  function handleUndo() {
    if (!session?.undoSnapshot || settlingLoserId !== null) return;
    const prev = session.undoSnapshot;
    // stay in sharpen mode only if the restored list still offers a sharpen pair
    const stillSharpen = sharpening && selectNextPair(prev, true) !== null;
    setSharpening(stillSharpen);
    setSession(prev);
    saveSession(prev);
    setPair(selectNextPair(prev, stillSharpen));
  }

  function startSharpen() {
    if (!session) return;
    setSharpening(true);
    setPair(selectNextPair(session, true));
  }

  if (!ready) return <main className="flex-1" />;

  if (!session) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold">No ranking in progress</h1>
        <Link
          href="/"
          className="min-h-11 rounded bg-accent px-5 leading-[44px] font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Start one
        </Link>
      </main>
    );
  }

  const canUndo = !!session.undoSnapshot && settlingLoserId === null;

  return (
    <main className="mx-auto flex min-h-dvh w-full flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold sm:text-2xl">{session.title}</h1>
          {session.participants.length > 0 && (
            <p className="truncate text-xs text-muted sm:text-sm">
              {session.participants.join(" · ")}
            </p>
          )}
        </div>
        {!finished && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="min-h-11 shrink-0 rounded px-3 text-sm text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent active:text-text disabled:pointer-events-none disabled:opacity-40"
          >
            Undo
          </button>
        )}
      </header>

      {finished ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-8">
          <div className="w-full max-w-md rounded bg-surface p-5 ring-1 ring-white/10">
            <p className="text-sm uppercase tracking-widest text-accent">Final order</p>
            <RankedList movies={active} />
          </div>
          {onFinish && (
            <button
              type="button"
              onClick={() => onFinish(session)}
              className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Confirm &amp; finish
            </button>
          )}
          <div className="text-center">
            <button
              type="button"
              disabled
              className="min-h-11 cursor-not-allowed rounded bg-surface-raised px-6 font-semibold text-muted"
            >
              Save &amp; finish
            </button>
            <p className="mt-2 max-w-xs text-xs text-muted">
              Saving arrives with accounts — your session stays in this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFinished(false)}
            className="min-h-11 text-sm text-muted underline-offset-4 transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent hover:underline"
          >
            Keep voting
          </button>
        </section>
      ) : active.length < 2 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-bold">Not enough movies in play</h2>
          <p className="max-w-sm text-sm text-muted">
            Fewer than two movies are left. Bring some back from the strip below, or finish with
            what you have.
          </p>
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            Finish
          </button>
        </section>
      ) : stable && !sharpening ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
          <div className="animate-celebrate w-full max-w-md rounded bg-surface p-5 ring-1 ring-white/10">
            <p className="text-sm uppercase tracking-widest text-accent">Consensus reached</p>
            <RankedList movies={active} />
          </div>
          {!sharpening && (
            <div className="flex flex-col items-center gap-2">
              <p className="max-w-sm text-sm text-muted">
                Some calls are still close — settle them?
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={startSharpen}
                  className="min-h-11 rounded bg-surface-raised px-5 font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
                >
                  Sharpen the list
                </button>
              <button
                type="button"
                onClick={() => setFinished(true)}
                className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
              >
                Finish
              </button>
              </div>
            </div>
          )}
          {sharpening && <p className="text-sm text-muted">Sharpening — closest call first…</p>}
        </section>
      ) : pair ? (
        <section className="flex flex-1 flex-col px-3 pb-2 pt-1 sm:px-6">
          <div className="my-3">
            <div
              role="progressbar"
              aria-label="Ranking progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
            >
              <div
                className="h-full rounded-full bg-accent transition-all duration-200 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p aria-live="polite" className="mt-1.5 text-xs text-muted sm:text-sm">
              {sharpening
                ? "Sharpening — closest call first"
                : `~${estimateRemainingVotes(active)} votes left`}
            </p>
          </div>
          <MatchupStage
            pair={pair}
            settlingLoserId={settlingLoserId}
            onVote={handleVote}
            onPark={(id) => handleParkToggle(id, true)}
          />
        </section>
      ) : null}

      {!finished && <ParkedStrip movies={parked} onReinstate={(id) => handleParkToggle(id, false)} />}

      <p className="pointer-events-none fixed bottom-2 right-3 z-10 rounded-full bg-surface/90 px-3 py-1 text-[11px] text-muted ring-1 ring-white/10">
        Unsaved — lives in this browser
      </p>
    </main>
  );
}
