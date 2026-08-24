"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import MatchupStage from "@/components/MatchupStage";
import ParkedStrip from "@/components/ParkedStrip";
import SaveGateSheet from "@/components/SaveGateSheet";
import {
  estimateRemainingVotes,
  finalizeRanks,
  isStable,
  type RankedMovie,
} from "@/lib/ranking";
import {
  applyVote,
  changedMovies,
  loadSession,
  parkMovie,
  saveSession,
  selectNextPair,
  totalComparisons,
  type PlaySession,
  type ResumedList,
} from "@/lib/session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NUDGE_COMPARISONS = 10;

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

export default function PlayRoom({ initial }: { initial?: ResumedList }) {
  const [session, setSession] = useState<PlaySession | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [pair, setPair] = useState<[RankedMovie, RankedMovie] | null>(null);
  const [settlingLoserId, setSettlingLoserId] = useState<number | null>(null);
  const [sharpening, setSharpening] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<"done" | "draft" | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // last movie state known to be synced to the server (resume mode only)
  const syncedRef = useRef<RankedMovie[] | null>(initial ? initial.movies : null);

  // async hop so pre-hydration server markup matches first client render
  useEffect(() => {
    const t = setTimeout(() => {
      // resume flow: hydrate from the owner's saved draft; votesSinceOrderChange
      // isn't persisted, so stability must be re-earned after a resume
      const s: PlaySession | null = initial
        ? {
            title: initial.title,
            participants: initial.participants,
            movies: initial.movies,
            votesSinceOrderChange: 0,
            nudgeShown: true,
          }
        : loadSession();
      setSession(s);
      setPair(s ? selectNextPair(s, false) : null);
      setReady(true);
    }, 0);
    return () => {
      clearTimeout(t);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(!!data.user);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resume sync: per-action PATCH of only the movies the last action changed
  // (votes are >=1s apart behind the settle animation, so no debounce needed).
  useEffect(() => {
    if (!initial || !session || !syncedRef.current) return;
    const changed = changedMovies(syncedRef.current, session.movies);
    syncedRef.current = session.movies;
    if (changed.length === 0) return;
    void fetch(`/api/lists/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movies: changed }),
    }).catch(() => {}); // ponytail: failed syncs dropped silently; full resync if lost votes ever surface
  }, [session, initial]);

  // Leave warning only while an anonymous, unsaved session holds real votes.
  // Logged-in resume users are exempt — every action already PATCHes to the server.
  useEffect(() => {
    if (signedIn === null || signedIn || initial || !session) return;
    if (totalComparisons(session) === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [signedIn, initial, session]);

  function dismissNudge() {
    if (!session) return;
    const next = { ...session, nudgeShown: true };
    setSession(next);
    saveSession(next);
  }

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
    // belt-and-braces: button is hidden when no comfort-band pair exists
    if (!selectNextPair(session, true)) return;
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
  const canSharpen = !!selectNextPair(session, true);

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

      {signedIn === false && !initial && !finished && sheetStatus === null &&
        session.movies.length >= 2 && totalComparisons(session) >= NUDGE_COMPARISONS &&
        !session.nudgeShown && (
          <div className="mx-auto w-full max-w-2xl animate-fade-in px-4 pt-3 sm:px-6" role="status">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-surface p-3 ring-1 ring-white/10">
              <p className="min-w-0 flex-1 text-sm text-muted">
                Make an account now and this session is safe.
              </p>
              <button
                type="button"
                onClick={() => setSheetStatus("draft")}
                className="min-h-11 rounded bg-surface-raised px-4 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
              >
                Save as draft
              </button>
              <button
                type="button"
                onClick={dismissNudge}
                aria-label="Dismiss"
                className="flex size-11 items-center justify-center rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      {finished ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-8">
          <div className="w-full max-w-md rounded bg-surface p-5 ring-1 ring-white/10">
            <p className="text-sm uppercase tracking-widest text-accent">Final order</p>
            <RankedList movies={active} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetStatus("done")}
              className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Save &amp; finish
            </button>
            <button
              type="button"
              onClick={() => setSheetStatus("draft")}
              className="min-h-11 rounded bg-surface-raised px-5 text-sm font-medium transition-colors duration-200 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Save &amp; quit as draft
            </button>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Your ranking lives in this browser until you save it.
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
              {canSharpen ? (
                <button
                  type="button"
                  onClick={startSharpen}
                  className="min-h-11 rounded bg-surface-raised px-5 font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
                >
                  Sharpen the list
                </button>
              ) : (
                <p className="text-sm text-muted">No close calls left — ready to finish.</p>
              )}
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

      {sheetStatus && (
        <SaveGateSheet
          session={session}
          status={sheetStatus}
          existingId={initial?.id}
          onClose={() => setSheetStatus(null)}
        />
      )}

      {!initial && (
        <p className="pointer-events-none fixed bottom-2 right-3 z-10 rounded-full bg-surface/90 px-3 py-1 text-[11px] text-muted ring-1 ring-white/10">
          Unsaved — lives in this browser
        </p>
      )}
    </main>
  );
}
