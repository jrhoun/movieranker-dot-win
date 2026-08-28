"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import MatchupStage from "@/components/MatchupStage";
import MoviePoster from "@/components/list/MoviePoster";
import ParkedStrip from "@/components/ParkedStrip";
import SaveGateSheet from "@/components/SaveGateSheet";
import { PersonIcon } from "@/components/ParticipantChips";
import {
  closeCallProgress,
  countClosePairs,
  estimateRemainingVotes,
  expectedConsensusVotes,
  finalizeRanks,
  isPodiumLocked,
  isStable,
  type RankedMovie,
} from "@/lib/ranking";
import {
  applyVote,
  changedMovies,
  clearSession,
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
  const final = finalizeRanks(movies);
  const ranked = final.filter((r): r is { tmdbId: number; rank: number } => r.rank !== null);
  const unranked = final.filter((r) => r.rank === null);

  return (
    <div className="mt-4 space-y-4 text-left">
      <ol className="space-y-2">
        {ranked.map((r) => {
          const m = byId.get(r.tmdbId)!;
          return (
            <li key={r.tmdbId} className="flex items-baseline gap-3">
              <span className="w-6 shrink-0 text-right font-display text-sm text-gold">
                {r.rank}.
              </span>
              <span className="min-w-0 truncate">{m.title}</span>
              <span className="shrink-0 text-xs text-muted">{m.releaseYear ?? ""}</span>
            </li>
          );
        })}
      </ol>
      {unranked.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Haven&apos;t seen ({unranked.length})
          </p>
          <ul className="space-y-1 text-xs text-muted">
            {unranked.map((r) => {
              const m = byId.get(r.tmdbId)!;
              return (
                <li key={r.tmdbId} className="truncate">
                  • {m.title} {m.releaseYear ? `(${m.releaseYear})` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// gold / silver / bronze numerals for the podium (gold per DESIGN.md palette)
const MEDAL_CLS = ["text-gold", "text-[#c9ced6]", "text-[#cd7f32]"];

function Podium({ movies }: { movies: RankedMovie[] }) {
  const byId = new Map(movies.map((m) => [m.tmdbId, m]));
  const top3 = finalizeRanks(movies).filter((r): r is { tmdbId: number; rank: number } => r.rank !== null).slice(0, 3);
  // classic podium: 2nd left, 1st center (larger), 3rd right
  const layout = [
    { i: 1, w: "w-1/4" },
    { i: 0, w: "w-1/3" },
    { i: 2, w: "w-1/4" },
  ];
  return (
    <div className="flex items-start justify-center gap-3">
      {layout.map(({ i, w }) => {
        const r = top3[i];
        if (!r) return null;
        const m = byId.get(r.tmdbId)!;
        return (
          <div key={r.tmdbId} className={`${w} min-w-0`}>
            <div className="relative">
              <MoviePoster title={m.title} posterPath={m.posterPath} />
              <span
                className={`absolute -top-2 -left-2 flex size-7 items-center justify-center rounded-full bg-bg font-display text-base ring-1 ring-white/15 ${MEDAL_CLS[i]}`}
              >
                {r.rank}
              </span>
            </div>
            <p className="mt-1.5 truncate text-xs sm:text-sm font-semibold text-text">{m.title}</p>
            {m.releaseYear != null && (
              <p className="truncate font-mono text-xs text-muted">{m.releaseYear}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PlayRoom({ initial }: { initial?: ResumedList }) {
  const router = useRouter();
  const [session, setSession] = useState<PlaySession | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [pair, setPair] = useState<[RankedMovie, RankedMovie] | null>(null);
  const [settlingLoserId, setSettlingLoserId] = useState<number | null>(null);
  const [sharpening, setSharpening] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<"done" | "draft" | null>(null);
  const [authNotice, setAuthNotice] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const exitTriggerRef = useRef<HTMLButtonElement>(null);
  const exitPanelRef = useRef<HTMLDivElement>(null);
  // Curated Lock Mode: inline confirm card for leaving this week's themed list
  const [unlockOpen, setUnlockOpen] = useState(false);
  // set once an OAuth redirect away from the page has begun (leave-warning stays disarmed)
  const [authRedirecting, setAuthRedirecting] = useState(false);
  // Real Participants: resumed drafts let a signed-in viewer claim a chip.
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [canJoin, setCanJoin] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  // once-flag: has the field EVER significantly reordered? stability requires
  // genuine differentiation, not just a quiet streak over a still-tied list.
  // ponytail: room-level and not persisted — a resume resets it until the next
  // significant swap, which only ever delays stability slightly.
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
        if (cancelled) return;
        const signed = !!data.user;
        setSignedIn(signed);
        // Consume ?auth_error=1 left by a failed OAuth round-trip.
        if (new URLSearchParams(window.location.search).has("auth_error")) {
          setAuthNotice(true);
          window.history.replaceState(null, "", "/r/play");
        }
        // OAuth conversion: only auto-save if returning from an explicit OAuth sign-in redirect
        let pendingSave: "done" | "draft" | null = null;
        try {
          pendingSave = sessionStorage.getItem("mr_pending_auth_save") as "done" | "draft" | null;
          if (pendingSave) sessionStorage.removeItem("mr_pending_auth_save");
        } catch {}

        if (signed && !initial && pendingSave) {
          const s = loadSession();
          if (s && s.movies.length > 0) setSheetStatus(pendingSave);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  // Join-as-participant probe: only for signed-in users on a resumed draft.
  useEffect(() => {
    if (!initial || signedIn !== true) return;
    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      setJoinName(profile?.handle ?? "");
      try {
        const res = await fetch(`/api/lists/${initial.id}/participants/claim`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          claimed?: boolean;
          displayName?: string;
        };
        if (!cancelled) setJoinedName(json.claimed ? (json.displayName ?? "") : null);
        if (!json.claimed && !cancelled) setCanJoin(true);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, signedIn]);

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

  // Leave warning only while an anonymous, unsaved session holds real votes and
  // the user is NOT mid-save/signup (sheet open or OAuth redirect in flight).
  // Intentional exits use client-side routing, which never fires beforeunload.
  // Logged-in resume users are exempt — every action already PATCHes to the server.
  useEffect(() => {
    if (signedIn === null || signedIn || initial || !session) return;
    if (totalComparisons(session) === 0) return;
    if (sheetStatus !== null || authRedirecting) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // legacy WebKit/Chrome needs returnValue to prompt
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [signedIn, initial, session, sheetStatus, authRedirecting]);

  function dismissNudge() {
    if (!session) return;
    const next = { ...session, nudgeShown: true };
    setSession(next);
    saveSession(next);
  }

  async function joinAsParticipant() {
    if (!initial || !session) return;
    const displayName = joinName.trim();
    if (!displayName) return;
    setJoining(true);
    setJoinError(null);
    let res: Response;
    try {
      res = await fetch(`/api/lists/${initial.id}/participants/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
    } catch {
      setJoining(false);
      setJoinError("Couldn't reach the server — try again.");
      return;
    }
    setJoining(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setJoinError(
        body?.error === "already participating"
          ? "You've already joined this ranking."
          : body?.error === "not found"
            ? "This draft is no longer available."
            : "Couldn't join — check the name and try again.",
      );
      return;
    }
    setCanJoin(false);
    setJoinedName(displayName);
    setJoinOpen(false);
    // Show the new chip immediately; server list row was appended by the API.
    if (!session.participants.some((p) => p.toLowerCase() === displayName.toLowerCase())) {
      const next = {
        ...session,
        participants: [...session.participants, displayName],
      };
      setSession(next);
      saveSession(next);
    }
  }

  const [fieldSplit, setFieldSplit] = useState(false);
  const active = useMemo(() => session?.movies.filter((m) => !m.parked) ?? [], [session]);
  const stable =
    !!session &&
    active.length >= 2 &&
    isStable(active, session.votesSinceOrderChange, fieldSplit);

  const [initialClosePairs, setInitialClosePairs] = useState<number | null>(null);

  function handleVote(winnerId: number, loserId: number) {
    if (!session || settlingLoserId !== null) return;
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore browsers blocking vibration
      }
    }
    const next = applyVote(session, winnerId, loserId);
    setSession(next);
    saveSession(next);
    const nextSplit = fieldSplit || next.votesSinceOrderChange === 0;
    setFieldSplit(nextSplit);
    const nextActive = next.movies.filter((m) => !m.parked);
    if (initialClosePairs === null && nextActive.length >= 2 && isStable(nextActive, next.votesSinceOrderChange, nextSplit)) {
      setInitialClosePairs(countClosePairs(nextActive));
    }
    setSettlingLoserId(loserId);
    // Snappy physical recoil animation (260ms) before next matchup swaps in
    settleTimer.current = setTimeout(() => {
      const updatePair = () => {
        setSettlingLoserId(null);
        const p = selectNextPair(next, sharpening, pair);
        if (sharpening && !p) setSharpening(false);
        setPair(p);
      };

      if (typeof document !== "undefined" && "startViewTransition" in document) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(updatePair);
      } else {
        updatePair();
      }
    }, 260);
  }

  function handleParkToggle(tmdbId: number, toParked: boolean) {
    if (!session || settlingLoserId !== null) return;
    const next = parkMovie(session, tmdbId, toParked);
    setSession(next);
    saveSession(next);
    const p = selectNextPair(next, sharpening, pair);
    if (sharpening && !p) setSharpening(false);
    setPair(p);
  }

  const [savingDirectly, setSavingDirectly] = useState(false);

  async function handleDirectSave(status: "done" | "draft") {
    if (!session || savingDirectly) return;
    if (!signedIn) {
      setSheetStatus(status);
      return;
    }

    setSavingDirectly(true);
    const ranks = new Map(finalizeRanks(session.movies).map((r) => [r.tmdbId, r.rank]));
    const payload = {
      status,
      movies: session.movies.map((m) => ({
        ...m,
        finalRank: status === "done" ? (ranks.get(m.tmdbId) ?? null) : null,
      })),
    };

    try {
      const res = await fetch(initial?.id ? `/api/lists/${initial.id}` : "/api/lists", {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          initial?.id
            ? payload
            : {
                ...payload,
                title: session.title,
                participants: session.participants,
                ...(session.themeSlug
                  ? {
                      themeSlug: session.themeSlug,
                      curated: !!session.curated,
                      visibility: "public",
                    }
                  : {}),
              },
        ),
      });

      if (!res.ok) {
        setSavingDirectly(false);
        setSheetStatus(status);
        return;
      }

      const id = initial?.id ?? ((await res.json()) as { id: string }).id;
      clearSession();
      router.push(status === "done" ? `/l/${id}` : "/u/profile");
    } catch {
      setSavingDirectly(false);
      setSheetStatus(status);
    }
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

  // Resume later: logged-in draft owners save directly; anonymous users keep localStorage.
  function handleResumeLater() {
    setExitOpen(false);
    if (signedIn) {
      void handleDirectSave("draft");
      return;
    }
    router.push("/");
  }

  function handleAbandon() {
    clearSession();
    router.push("/");
  }

  // Unlock exits curated mode (chip goes muted); themeSlug is kept so stage-B
  // community stats can still credit the list. No reverse re-lock.
  function handleUnlock() {
    if (!session) return;
    const next = { ...session, curated: false };
    setSession(next);
    saveSession(next);
    setUnlockOpen(false);
  }

  function startSharpen() {
    if (!session) return;
    // belt-and-braces: button is hidden when no comfort-band pair exists
    if (!selectNextPair(session, true)) return;
    setSharpening(true);
    setPair(selectNextPair(session, true));
  }

  // Outside click and Escape both mean "keep ranking" (user feedback): they
  // dismiss the leave menu exactly like the positive button. While open, the
  // dialog traps Tab focus and takes it from the Exit trigger; on close,
  // focus returns to the trigger.
  useEffect(() => {
    if (!exitOpen) return;
    const trigger = exitTriggerRef.current;
    const panel = exitPanelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExitOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [exitOpen]);

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
  const closePairs = countClosePairs(active);
  const remainingVotes = estimateRemainingVotes(active);
  const doneVotes = Math.round(totalComparisons(session) / 2);
  // UNIFIED progress signal (user feedback: bar and ~N text diverged). ONE
  // primary number: "X of ~Y votes". Y = votes cast + comfort-band estimate
  // of what's left, never below the empirical expectation (⌈n·log₂n⌉ sim
  // median). It updates EVERY vote — X increments, and Y re-derives from the
  // live close-pair count, shrinking toward reality as gaps widen past the
  // comfort band or growing if the session runs long. Bar pct = X/Y from the
  // same two values, so bar and text are arithmetically incapable of
  // disagreeing. Capped at 99% — only stability itself is 100%.
  const maxUniquePairs = (active.length * (active.length - 1)) / 2;
  const estTotal = Math.min(
    maxUniquePairs,
    Math.max(expectedConsensusVotes(active.length), doneVotes + remainingVotes),
  );
  const pct = Math.min(99, Math.round((doneVotes / Math.max(1, estTotal)) * 100));
  const podiumLocked = !stable && isPodiumLocked(active);

  return (
    <main className="mx-auto flex min-h-dvh w-full flex-col">
      {/* Slim control strip (user feedback): compact bar, not a banner. The
          wordmark gives a permanent way back to home; Exit stays the
          confirm-flow path out. */}
      <header className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 border-b border-gold/15 bg-bg/85 px-3 py-2 sm:px-6 sm:py-2.5 backdrop-blur-md">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1 font-display text-base sm:text-lg uppercase tracking-widest text-text transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span aria-hidden="true" className="text-gold">✦</span>
          MovieRanker
        </Link>
        <div aria-hidden="true" className="h-5 w-px shrink-0 bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm sm:text-base font-bold leading-tight">{session.title}</h1>
            {session.themeSlug && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  session.curated
                    ? "bg-gold/15 text-gold ring-1 ring-gold/40"
                    : "bg-surface-raised text-muted ring-1 ring-white/10"
                }`}
              >
                {session.curated ? "🔒 Marquee" : "🔓 Marquee"}
              </span>
            )}
          </div>
          {session.participants.length > 0 && (
            <p className="truncate text-xs text-muted">
              {session.participants.map((p, i) => (
                <span key={p}>
                  {i > 0 && " · "}
                  {p}
                  {(joinedName && p.toLowerCase() === joinedName.toLowerCase()) && <PersonIcon />}
                </span>
              ))}
            </p>
          )}
        </div>
        {!finished && (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {session.curated && (
              <button
                type="button"
                onClick={() => setUnlockOpen((v) => !v)}
                aria-expanded={unlockOpen}
                className="hidden sm:inline-flex min-h-8 rounded bg-surface px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-raised"
              >
                Unlock
              </button>
            )}
            <button
              ref={exitTriggerRef}
              type="button"
              onClick={() => setExitOpen((v) => !v)}
              aria-expanded={exitOpen}
              className="min-h-8 rounded px-2 py-0.5 text-xs sm:text-sm text-muted underline-offset-4 transition-colors duration-200 ease-out hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:text-text"
            >
              Exit
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex min-h-8 items-center gap-1 rounded bg-surface px-2.5 py-0.5 text-xs sm:text-sm font-medium ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-raised disabled:pointer-events-none disabled:opacity-40"
            >
              <span aria-hidden="true">↩</span> Undo
            </button>
          </div>
        )}
      </header>

      {authNotice && (
        <p role="alert" className="px-4 pt-2 text-xs text-accent-red sm:px-6 sm:text-sm">
          Sign-in failed — still playing as a guest.
        </p>
      )}

      {unlockOpen && session.curated && !finished && (
        <div
          role="group"
          aria-labelledby="unlock-title"
          className="mx-auto w-full max-w-2xl animate-fade-in px-4 pt-3 sm:px-6"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded bg-surface p-3 ring-1 ring-white/10">
            <p id="unlock-title" className="min-w-0 flex-1 text-sm text-muted">
              Unlocking lets you add more movies, but this ranking will no longer
              count as this week&apos;s themed list.
            </p>
            <button
              type="button"
              onClick={() => setUnlockOpen(false)}
              className="min-h-11 rounded bg-surface-raised px-4 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Keep it locked
            </button>
            <button
              type="button"
              onClick={handleUnlock}
              className="min-h-11 rounded bg-surface-raised px-4 text-sm font-medium text-accent-red transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Unlock anyway
            </button>
          </div>
        </div>
      )}

      {exitOpen && !finished && (
        <div
          className="fixed inset-0 z-40 flex animate-fade-in items-start justify-center bg-black/60 px-4 pt-24 backdrop-blur-[2px]"
          onClick={() => setExitOpen(false)}
        >
          <div
            ref={exitPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Leave this ranking"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded bg-surface p-4 shadow-2xl ring-1 ring-gold/25"
          >
            <p className="text-sm uppercase tracking-widest text-muted">Leave this ranking?</p>
            <div className="mt-3 flex flex-col gap-2">
              {/* Positive default first; destructive last and quietest. */}
              <button
                type="button"
                onClick={() => setExitOpen(false)}
                className="min-h-11 rounded bg-gold px-4 font-semibold text-bg transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
              >
                Keep ranking
              </button>
              <button
                type="button"
                onClick={handleResumeLater}
                className="min-h-11 rounded bg-surface-raised px-4 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
              >
                Resume later
              </button>
              <button
                type="button"
                onClick={handleAbandon}
                className="min-h-11 rounded px-4 text-sm font-medium text-accent-red ring-1 ring-accent-red/40 transition-colors duration-200 ease-out hover:bg-accent-red/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-red active:scale-[0.98]"
              >
                Abandon ranking
              </button>
            </div>
          </div>
        </div>
      )}

      {canJoin && !finished && (
        <div className="mx-auto w-full max-w-2xl animate-fade-in px-4 pt-3 sm:px-6">
          <div
            role="group"
            aria-label="Join this ranking as a participant"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-surface p-3 ring-1 ring-white/10"
          >
            {joinOpen ? (
              <form
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void joinAsParticipant();
                }}
              >
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={40}
                  placeholder="Your participant name"
                  aria-label="Your participant name"
                  className="min-h-11 min-w-0 flex-1 rounded bg-surface-raised px-3 text-sm text-text ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
                />
                <button
                  type="submit"
                  disabled={!joinName.trim() || joining}
                  className="min-h-11 rounded bg-surface-raised px-4 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {joining ? "Joining…" : "Join"}
                </button>
                <button
                  type="button"
                  onClick={() => setJoinOpen(false)}
                  className="min-h-11 rounded px-4 text-sm text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:text-text"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <p className="min-w-0 flex-1 text-sm text-muted">
                  Ranking with this crew?
                </p>
                <button
                  type="button"
                  onClick={() => setJoinOpen(true)}
                  className="min-h-11 shrink-0 rounded bg-surface-raised px-4 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
                >
                  Join as participant
                </button>
              </>
            )}
            {joinError && (
              <p role="alert" className="w-full text-xs text-accent-red">
                {joinError}
              </p>
            )}
          </div>
        </div>
      )}

      {signedIn === false &&
        !initial &&
        !finished &&
        sheetStatus === null &&
        session.movies.length >= 2 &&
        totalComparisons(session) >= NUDGE_COMPARISONS &&
        !session.nudgeShown && (
          <div
            role="status"
            className="mx-auto w-full max-w-2xl animate-fade-in px-4 pt-3 sm:px-6"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-surface p-3 ring-1 ring-white/10">
              <p className="min-w-0 flex-1 text-sm text-muted">
                Create an account now to save your progress.
              </p>
              <button
                type="button"
                onClick={() => void handleDirectSave("draft")}
                disabled={savingDirectly}
                className="min-h-11 rounded bg-surface-raised px-4 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
              >
                {savingDirectly ? "Saving…" : "Save as draft"}
              </button>
              <button
                type="button"
                onClick={dismissNudge}
                aria-label="Dismiss"
                className="flex size-11 items-center justify-center rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent active:text-text"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      {finished ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-8">
          <div className="w-full max-w-md rounded bg-surface p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm uppercase tracking-widest text-accent">Final order</p>
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold ring-1 ring-gold/40">
                +{active.length} XP Earned
              </span>
            </div>
            <RankedList movies={active} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDirectSave("done")}
              disabled={savingDirectly}
              className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
            >
              {savingDirectly ? "Saving ranking…" : "Save & finish"}
            </button>
            <button
              type="button"
              onClick={() => void handleDirectSave("draft")}
              disabled={savingDirectly}
              className="min-h-11 rounded bg-surface-raised px-5 text-sm font-medium transition-colors duration-200 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
            >
              {savingDirectly ? "Saving draft…" : "Save & quit as draft"}
            </button>
            <p className="mt-1 max-w-xs text-center text-xs text-muted">
              {session.themeSlug
                ? "✦ Weekly Marquee rankings are public by default to power community stats."
                : signedIn
                  ? "Saves directly to your profile & lists."
                  : "Your ranking lives in this browser until you save it."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFinished(false)}
            className="min-h-11 rounded bg-surface px-5 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-raised"
          >
            Keep voting
          </button>
        </section>
      ) : active.length < 2 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-bold">Not enough movies in play</h2>
          <p className="max-w-sm text-sm text-muted">
            Fewer than two movies are left. Bring some back via Your movies
            below, or finish with what you have.
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
        <section className="relative overflow-hidden bg-curtain flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
          <div aria-hidden="true" className="spotlight-glow pointer-events-none absolute inset-0" />
          <div className="animate-celebrate relative w-full max-w-md rounded bg-surface p-5 ring-1 ring-white/10">
            <p className="text-sm uppercase tracking-widest text-accent">Consensus reached</p>
            <div className="mt-4">
              <Podium movies={active} />
            </div>
            <p aria-live="polite" className="mt-4 text-center text-xs text-muted">
              {active.length} movies · {doneVotes} head-to-heads
              {session.participants.length > 0 &&
                ` · ${session.participants.length} voter${session.participants.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {canSharpen && initialClosePairs !== null && (
            <p className="max-w-sm rounded-full bg-surface px-4 py-2 text-sm text-muted ring-1 ring-white/10">
              {closeCallProgress(closePairs, initialClosePairs)} — Sharpen settles them one at
              a time.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {canSharpen ? (
              <button
                type="button"
                onClick={startSharpen}
                className="inline-flex items-center gap-2 min-h-11 rounded-full bg-surface-raised px-5 font-semibold text-text ring-1 ring-white/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:ring-gold/50 hover:text-gold active:scale-[0.98]"
              >
                <span>🎯 Sharpen Close Calls</span>
                <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">+XP Bonus</span>
              </button>
            ) : (
              <p className="rounded-full bg-surface px-4 py-2 text-sm text-muted ring-1 ring-white/10">
                No close calls left — ready to finish.
              </p>
            )}
            <button
              type="button"
              onClick={() => setFinished(true)}
              className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Finish
            </button>
          </div>
          {sharpening && (
            <p className="rounded-full bg-surface px-4 py-2 text-sm text-muted ring-1 ring-white/10">
              Sharpening — closest call first…
            </p>
          )}
        </section>
      ) : pair ? (
        /* Low-intensity curtain wash (user feedback): burgundy drape vocabulary
           behind the vote stage, dimmer than the home hero so posters pop. */
        <section className="bg-curtain-soft relative flex flex-1 flex-col px-3 pb-2 pt-1 sm:px-6">
          {/* Mini marquee board: one trusted "X of ~Y votes" number in Bebas
              gold between thin gold rules; close calls demoted to a chip. */}
          <div className="mt-3 mb-6 sm:mb-8 w-full max-w-5xl mx-auto rounded-xl bg-surface/85 px-4 py-3.5 ring-1 ring-white/10 shadow-lg backdrop-blur-sm">
            <div
              role="progressbar"
              aria-label="Ranking progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2 w-full overflow-hidden rounded-full bg-surface-raised"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-gold transition-all duration-200 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <div aria-live="polite" className="min-w-0 text-sm text-muted sm:text-base">
                {sharpening ? (
                  <span className="flex items-center gap-2 text-gold font-medium">
                    <span>🎯 Sharpening — fine-tuning neck-and-neck debates</span>
                  </span>
                ) : (
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="flex shrink-0 items-baseline gap-x-1.5 whitespace-nowrap">
                      <span aria-hidden="true">Settling ·</span>
                      <span className="font-display text-xl leading-none tracking-wide text-gold sm:text-2xl">
                        {doneVotes}
                      </span>
                      of ~
                      <span className="font-display text-xl leading-none tracking-wide text-gold sm:text-2xl">
                        {estTotal}
                      </span>
                      votes
                    </span>
                    {closePairs > 0 && (
                      <span className="shrink-0 rounded-full bg-surface-raised px-2.5 py-0.5 text-xs ring-1 ring-white/10">
                        {closePairs} too close to call
                      </span>
                    )}
                    {/* Encouraging motivational micro-nudges */}
                    {doneVotes >= 2 && pct < 40 && (
                      <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold ring-1 ring-gold/30 animate-fade-in">
                        ✦ Off to a great start!
                      </span>
                    )}
                    {pct >= 40 && pct <= 65 && !podiumLocked && (
                      <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold ring-1 ring-gold/30 animate-fade-in">
                        ✦ Halfway there — field taking shape
                      </span>
                    )}
                    {pct > 65 && !podiumLocked && (
                      <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold ring-1 ring-gold/30 animate-fade-in">
                        ✦ Final stretch — crowning your champion!
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFinished(true)}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-surface px-4 text-xs sm:text-sm font-semibold uppercase tracking-wider text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:bg-surface-raised"
              >
                Wrap up list →
              </button>
            </div>
            {podiumLocked && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gold/10 px-3.5 py-2 ring-1 ring-gold/40 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-semibold text-gold">
                  <span aria-hidden="true" className="text-base">🏆</span>
                  <span>Your Top 3 Podium is locked in!</span>
                  <span className="hidden sm:inline font-normal text-text/80 text-[11px]">— Keep ranking to achieve full consensus & earn bonus XP</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFinished(true)}
                  className="inline-flex min-h-8 items-center rounded-full bg-gold px-3.5 text-xs font-bold uppercase tracking-wider text-bg shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  Claim Podium →
                </button>
              </div>
            )}
          </div>
          <div className="relative flex flex-1 flex-col justify-center py-2">
            {/* Premiere Night stage lighting: static low-intensity curtain
                vocabulary (spotlight + vignette) behind the matchup pair. */}
            <div aria-hidden="true" className="stage-spotlight pointer-events-none absolute -inset-x-6 inset-y-0" />
            <MatchupStage
              pair={pair}
              settlingLoserId={settlingLoserId}
              onVote={handleVote}
              onPark={(id) => handleParkToggle(id, true)}
            />
          </div>
        </section>
      ) : null}

      {!finished && (
        <ParkedStrip movies={session.movies} onToggle={handleParkToggle} />
      )}

      {sheetStatus && (
        <SaveGateSheet
          session={session}
          status={sheetStatus}
          existingId={initial?.id}
          // Reset the redirect latch too: if OAuth failed in place (auth_error
          // + sheet closed, no navigation) the latch would stay set forever,
          // permanently disarming the leave-warning.
          onClose={() => {
            setSheetStatus(null);
            setAuthRedirecting(false);
          }}
          onAuthRedirect={() => setAuthRedirecting(true)}
        />
      )}

      {!initial && (
        <p className="pointer-events-none fixed bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))] right-3 z-10 rounded-full bg-surface/90 px-3 py-1 text-xs text-muted ring-1 ring-white/10 shadow backdrop-blur-sm">
          Unsaved — lives in this browser
        </p>
      )}
    </main>
  );
}
