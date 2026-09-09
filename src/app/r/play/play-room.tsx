"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import SoundToggle from "@/components/audio/SoundToggle";
import CurtainCallCelebration from "@/components/celebration/CurtainCallCelebration";
import LightsDownToggle from "@/components/duel/LightsDownToggle";
import MatchupStage from "@/components/MatchupStage";
import MarqueeConnectionGame from "@/components/MarqueeConnectionGame";
import MoviePoster from "@/components/list/MoviePoster";
import ParkedStrip from "@/components/ParkedStrip";
import SaveGateSheet from "@/components/SaveGateSheet";
import PremierePassCard from "@/components/share/PremierePassCard";
import { PersonIcon } from "@/components/ParticipantChips";
import { marqueeDisplayTitle } from "@/lib/marquee-title";
import { MATCHUP_SETTLE_MS } from "@/lib/matchup-timing";
import { marqueeNumber } from "@/lib/shortlist";
import {
  isLightsDown,
  isSoundEnabled,
  playGoldenChime,
  playShutterClick,
  setLightsDown,
  setSoundEnabled,
} from "@/lib/audio";
import {
  resolveBlitzAction,
  resolvePendingIntent,
  resolveSettlingIntent,
  sideOfPair,
  type BlitzState,
  type PendingIntent,
} from "@/lib/keyboard";
import { getThemeConnectionGame } from "@/lib/shortlist-themes";
import { getMovieWinStreak } from "@/lib/streak";
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

/*
 * SOUND AND LIGHTS-DOWN PREFERENCES live in localStorage, which the server
 * cannot see. The room used to render them both `false`, read localStorage in a
 * mount effect, and setState — the cascading-render pattern React now lints as
 * an error, and a visible flash of the wrong toggle on every entry.
 *
 * They are read as an EXTERNAL STORE instead, which is what they are.
 * getServerSnapshot keeps the pre-hydration markup honest (lib/audio defaults
 * both preferences to off with no storage available, so `false` is not a
 * guess), the `storage` event keeps two open tabs in step, and
 * `notifyPreferenceChange` is how a toggle in THIS tab tells the store to
 * re-read — localStorage writes do not fire `storage` in the tab that made
 * them. lib/audio's readers are already try/catch-guarded and return plain
 * booleans, which is exactly the stable snapshot useSyncExternalStore needs.
 */
const preferenceListeners = new Set<() => void>();

function subscribeToPreferences(onStoreChange: () => void): () => void {
  preferenceListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    preferenceListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function notifyPreferenceChange(): void {
  for (const listener of preferenceListeners) listener();
}

/** No localStorage on the server; lib/audio defaults both preferences to off. */
const preferenceServerSnapshot = () => false;

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
            {/* Two lines, not an ellipsis: this is the payoff screen, and
                "It's a Wonder…" / "The Sound of Mus…" under the winning posters
                undercut the moment. */}
            <p className="mt-1.5 line-clamp-2 text-xs leading-tight sm:text-sm font-semibold text-text">{m.title}</p>
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
  const [submitToSpotlight, setSubmitToSpotlight] = useState(false);
  const [authNotice, setAuthNotice] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const exitTriggerRef = useRef<HTMLButtonElement>(null);
  const exitPanelRef = useRef<HTMLDivElement>(null);
  // Curated Lock Mode: inline confirm card for leaving this week's themed list
  // set once an OAuth redirect away from the page has begun (leave-warning stays disarmed)
  const [authRedirecting, setAuthRedirecting] = useState(false);
  // Real Participants: resumed drafts let a signed-in viewer claim a chip.
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [canJoin, setCanJoin] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedName, setJoinedName] = useState<string | null>(null);

  // Audio and Focus mode preferences — see the external-store note above.
  const soundEnabled = useSyncExternalStore(
    subscribeToPreferences,
    isSoundEnabled,
    preferenceServerSnapshot,
  );
  const lightsDown = useSyncExternalStore(
    subscribeToPreferences,
    isLightsDown,
    preferenceServerSnapshot,
  );

  function handleToggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    notifyPreferenceChange();
    if (next) {
      playShutterClick();
    }
  }

  function handleToggleLightsDown() {
    setLightsDown(!lightsDown);
    notifyPreferenceChange();
  }
  // once-flag: has the field EVER significantly reordered? stability requires
  // genuine differentiation, not just a quiet streak over a still-tied list.
  // ponytail: room-level and not persisted — a resume resets it until the next
  // significant swap, which only ever delays stability slightly.
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
   * ONE QUEUED INPUT, held across the 380ms settle lock. See the PendingIntent
   * doc in lib/keyboard.ts for why this stores a SIDE rather than a matchup.
   *
   * A ref and not state, for two reasons. Writing it must not re-render — the
   * whole point is that a keypress during the flight is invisible until the
   * flight ends, and a re-render mid-animation is exactly the kind of jitter
   * this pass is removing. And the flush effect below has to be able to read
   * and clear it in the same tick the new pair mounts, which a state update
   * scheduled from a timeout cannot promise.
   */
  const pendingIntent = useRef<PendingIntent | null>(null);
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
        let pendingSpotlight = false;
        try {
          pendingSave = sessionStorage.getItem("mr_pending_auth_save") as "done" | "draft" | null;
          if (pendingSave) sessionStorage.removeItem("mr_pending_auth_save");
          pendingSpotlight = sessionStorage.getItem("mr_pending_auth_spotlight") === "1";
          if (pendingSpotlight) sessionStorage.removeItem("mr_pending_auth_spotlight");
        } catch {}

        if (pendingSpotlight) {
          setSubmitToSpotlight(true);
        }

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
    if (!session) return;
    /*
     * FAST INPUT IS QUEUED, NOT DROPPED.
     *
     * This used to `return` outright while a vote was settling, and the poster
     * buttons in MatchupStage were `disabled` for the same 380ms, so a second
     * tap or keypress inside the window simply never happened. Six keypresses
     * at 250ms apart produced three votes.
     *
     * `pair` has NOT swapped yet at this point (the timer below is what swaps
     * it), so the ids we were handed still belong to the pair on screen and
     * `sideOfPair` can turn the tap back into the physical side the finger
     * landed on. That side — not this already-decided matchup — is what gets
     * replayed against the next pair. `sideOfPair` returning null means the tap
     * came from a pair that is already gone, which is the one case where
     * dropping it is right.
     */
    if (settlingLoserId !== null) {
      const side = sideOfPair(pair, winnerId);
      if (side) pendingIntent.current = { kind: "vote", side };
      return;
    }
    playShutterClick();
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore browsers blocking vibration
      }
    }
    const next = applyVote(session, winnerId, loserId);
    const winnerStreak = getMovieWinStreak(next.history, winnerId);
    if (winnerStreak === 3) {
      playGoldenChime();
    }
    setSession(next);
    saveSession(next);
    const nextSplit = fieldSplit || next.votesSinceOrderChange === 0;
    setFieldSplit(nextSplit);
    const nextActive = next.movies.filter((m) => !m.parked);
    if (initialClosePairs === null && nextActive.length >= 2 && isStable(nextActive, next.votesSinceOrderChange, nextSplit)) {
      setInitialClosePairs(countClosePairs(nextActive));
    }
    if (!stable && nextActive.length >= 2 && isStable(nextActive, next.votesSinceOrderChange, nextSplit)) {
      playGoldenChime();
    }
    setSettlingLoserId(loserId);
    settleTimer.current = setTimeout(() => {
      setSettlingLoserId(null);
      const p = selectNextPair(next, sharpening, pair);
      if (sharpening && !p) setSharpening(false);
      setPair(p);
    }, MATCHUP_SETTLE_MS);
  }

  function handleParkToggle(tmdbId: number, toParked: boolean) {
    if (!session) return;
    /*
     * "Haven't seen" gets the same queue as a vote, for the same reason: the
     * button sits directly under a poster and is fully live during the settle
     * lock, so tapping it mid-flight looked like a dead control.
     *
     * Only the two movies ON STAGE can be queued. A toggle from the YOUR MOVIES
     * tray carries no side — there is no left or right to replay it against —
     * so it keeps the old bail. That is a real (if much rarer) drop; it is left
     * alone deliberately rather than invented a meaning for.
     */
    if (settlingLoserId !== null) {
      const side = toParked ? sideOfPair(pair, tmdbId) : null;
      if (side) pendingIntent.current = { kind: "skip", side };
      return;
    }
    playShutterClick();
    const next = parkMovie(session, tmdbId, toParked);
    setSession(next);
    saveSession(next);
    const p = selectNextPair(next, sharpening, pair);
    if (sharpening && !p) setSharpening(false);
    setPair(p);
  }

  const [savingDirectly, setSavingDirectly] = useState(false);
  // Which save is in flight, so only the pressed button says "Saving…". Both
  // used to flip to a saving label together, which read as two saves running.
  const [savingStatus, setSavingStatus] = useState<"done" | "draft" | null>(null);

  async function handleDirectSave(status: "done" | "draft") {
    if (!session || savingDirectly) return;
    if (!signedIn) {
      setSheetStatus(status);
      return;
    }

    setSavingDirectly(true);
    setSavingStatus(status);
    const ranks = new Map(finalizeRanks(session.movies).map((r) => [r.tmdbId, r.rank]));
    const visibility: "public" | "unlisted" = session.themeSlug
      ? "public"
      : status === "done" && submitToSpotlight
        ? "public"
        : "unlisted";
    const payload = {
      status,
      visibility,
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
      try {
        sessionStorage.removeItem("mr_pending_auth_save");
        sessionStorage.removeItem("mr_pending_auth_spotlight");
      } catch {}
      clearSession();
      // ?finished=1 tells the list page this viewer just completed the ranking,
      // which is what triggers the marquee bonus-round modal. A plain visit to
      // the same URL must not pop it.
      router.push(status === "done" ? `/l/${id}?finished=1` : "/u/profile");
    } catch {
      setSavingDirectly(false);
      setSheetStatus(status);
    }
  }

  function handleUndo() {
    if (!session?.undoSnapshot || settlingLoserId !== null) return;
    playShutterClick();
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

  /*
   * UNLOCK WAS REMOVED, and this note is why, so it is not re-added by
   * reflex.
   *
   * It sat in the header beside Exit and Undo and offered: "Unlocking lets you
   * add more movies, but this ranking will no longer count as this week's
   * themed list." Two halves, and the first was not true here — nothing in the
   * play room gates adding films on `curated`, and there is no add-films
   * control on this screen at all. Searching every non-test use of `curated`,
   * the only thing it gates in the UI is whether a SAVED list's title can be
   * edited (OwnerControls). So the button's real effect was to drop the
   * marquee flag, irreversibly, with no re-lock.
   *
   * It was also `hidden sm:inline-flex` — no phone has ever had it — which is
   * the strongest evidence that nothing depends on it.
   *
   * A player who wants a different set can finish the marquee (six or seven
   * films) and start a fresh ranking, which is the same number of taps and
   * costs them nothing.
   *
   * `curated: false` alongside a themeSlug remains a REACHABLE state: sessions
   * saved in localStorage before this removal can still hold it, which is why
   * the unlocked chip branch in the header stays.
   */

  function startSharpen() {
    if (!session) return;
    // belt-and-braces: button is hidden when no comfort-band pair exists
    if (!selectNextPair(session, true)) return;
    setSharpening(true);
    setPair(selectNextPair(session, true));
  }

  /* The keydown listener below is re-registered whenever the state it reads
     changes, but handleVote/handleParkToggle/handleUndo are re-created on every
     render and close over state that list does NOT track — `fieldSplit` and
     `initialClosePairs`. So a keyboard vote could evaluate stability against a
     stale fieldSplit, which is the real bug behind what eslint was reporting
     here as a missing dependency. Routing the calls through a ref that every
     render refreshes means the listener always invokes the CURRENT handler
     without the listener itself having to be torn down and rebuilt on each
     render. */
  const handlersRef = useRef({ handleVote, handleParkToggle, handleUndo });
  useEffect(() => {
    handlersRef.current = { handleVote, handleParkToggle, handleUndo };
  });

  /*
   * FLUSH THE QUEUE the moment the lock lifts and the next pair is on stage.
   *
   * This deliberately lives in an effect keyed on (settlingLoserId, pair)
   * rather than inside the settle timeout, and the reason is the same staleness
   * trap the note above describes: the timeout closes over the `session`,
   * `pair`, `fieldSplit` and `initialClosePairs` of the render that STARTED the
   * vote, so replaying a vote from in there would evaluate stability against a
   * field one vote out of date. By the time this effect runs, React has already
   * committed the new pair and re-pointed `handlersRef` (that effect is
   * declared first, so it runs first in the same commit), so the queued intent
   * is applied by the CURRENT handler against the CURRENT session.
   *
   * The replayed vote goes through `handleVote` unchanged, which means it plays
   * its shutter click, writes to storage and starts its own 380ms flight. The
   * queue removes the DROP, not the animation — a vote that skipped its own
   * motion would read as a glitch, and the pacing that results (one resolved
   * vote per settle) is the honest ceiling of a 380ms animation rather than a
   * burst of unwatched results.
   */
  useEffect(() => {
    if (settlingLoserId !== null) return;
    const queued = pendingIntent.current;
    if (!queued) return;
    pendingIntent.current = null;
    // A modal, the finale, or the consensus screen appearing mid-flight all
    // mean the player is no longer looking at the stage: discard, don't fire.
    if (finished || exitOpen || joinOpen || sheetStatus !== null) return;
    const action = resolvePendingIntent(queued, pair);
    if (!action) return;
    if (action.type === "park_candidate") {
      handlersRef.current.handleParkToggle(action.tmdbId, true);
    } else if (action.type === "vote_left" || action.type === "vote_right") {
      handlersRef.current.handleVote(action.winnerId, action.loserId);
    }
  }, [settlingLoserId, pair, finished, exitOpen, joinOpen, sheetStatus]);

  // Keyboard Blitz Controls (Milestone 1, Requirement R1)
  useEffect(() => {
    const isModalOpen = exitOpen || joinOpen || sheetStatus !== null;
    const isConsensus = stable && !sharpening;
    const activeCount = session?.movies.filter((m) => !m.parked).length ?? 0;

    const blitzState: BlitzState = {
      pair,
      canUndo: !!session?.undoSnapshot && settlingLoserId === null,
      isSettling: settlingLoserId !== null,
      isFinished: finished,
      isConsensus,
      isModalOpen,
      activeMoviesCount: activeCount,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      /*
       * Mid-flight keys go to the queue instead of the floor. `blitzState.pair`
       * here is still the OUTGOING pair, which is why the queue only records a
       * side — resolveSettlingIntent never looks at the movies, only at the
       * guards and the direction. preventDefault still fires so an arrow key
       * cannot scroll the page out from under the stage.
       */
      if (blitzState.isSettling) {
        const intent = resolveSettlingIntent(e, blitzState);
        if (!intent) return;
        e.preventDefault();
        pendingIntent.current = intent;
        return;
      }

      const action = resolveBlitzAction(e, blitzState);
      if (!action) return;

      e.preventDefault();

      switch (action.type) {
        case "vote_left":
          handlersRef.current.handleVote(action.winnerId, action.loserId);
          break;
        case "vote_right":
          handlersRef.current.handleVote(action.winnerId, action.loserId);
          break;
        case "park_candidate":
          handlersRef.current.handleParkToggle(action.tmdbId, true);
          break;
        case "undo":
          handlersRef.current.handleUndo();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    pair,
    session,
    settlingLoserId,
    finished,
    stable,
    sharpening,
    exitOpen,
    joinOpen,
    sheetStatus,
  ]);

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

  /*
   * WHEN "TOO CLOSE TO CALL" ACTUALLY MEANS ANYTHING.
   *
   * `countClosePairs` walks the field sorted by Elo and counts adjacent pairs
   * whose gap is inside SHARPEN_COMFORT_GAP. Before a single vote every movie
   * still holds the identical starting Elo, so every gap is zero, every pair is
   * "close", and the count is exactly `active.length - 1` — a restatement of
   * how many films are in play, dressed up as a measurement. That is what put
   * "6 too close to call" in front of a first-time player who had not yet made
   * a call, and it is jargon precisely because it cannot be false.
   *
   * THE RULE: show it only once the count has moved off that degenerate
   * starting value. `closePairs < active.length - 1` is true the first time any
   * pair separates past the comfort band and stays true afterwards, so the
   * number only ever appears when it is reporting something the player's own
   * votes caused. It needs no vote-count threshold to tune, and it cannot fire
   * on a fresh session by construction.
   */
  const closeCallsAreInformative = closePairs > 0 && closePairs < active.length - 1;

  /*
   * ONE QUIET LINE INSTEAD OF TWO PILL BADGES. "6 too close to call" and
   * "Final matchups" were rounded-full chips with a ring — the exact shape of
   * every button on this screen — so they read as controls you could press, and
   * they sat in a `flex-wrap` row that grew the board a line when they appeared.
   * They are status, so they are now plain muted text on a reserved-height line
   * under the vote count: nothing to press, and nothing that can reflow.
   */
  const progressNote = [
    closeCallsAreInformative ? `${closePairs} still too close to call` : null,
    podiumLocked ? null : pct >= 75 ? "Final matchups" : pct >= 45 ? "Field narrowing" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className={`mx-auto flex min-h-dvh w-full flex-col transition-colors duration-500 ${lightsDown ? "cinema-lights-down" : ""}`}>
      {/* Slim control strip (user feedback): compact bar, not a banner. The
          wordmark gives a permanent way back to home; Exit stays the
          confirm-flow path out. */}
      <header className={`sticky top-0 z-20 flex items-center gap-2 sm:gap-3 border-b border-gold/15 bg-bg/85 px-3 py-2 sm:px-6 sm:py-2.5 backdrop-blur-md transition-opacity duration-300 ${lightsDown ? "cinema-peripheral" : ""}`}>
        {/*
         * THE WORDMARK IS ALSO AN EXIT, so it goes through the same door.
         *
         * It was a plain <Link href="/">, which means client-side routing —
         * and as the beforeunload note below says, that never fires an unload
         * warning. Sitting two inches from an Exit button that opens a
         * three-way confirm, it silently left instead.
         *
         * Nothing was destroyed by that: every vote writes to localStorage and
         * the home page surfaces a "Ranking in Progress" card. But for a
         * SIGNED-IN user it skipped what Exit's "Resume later" does — a real
         * draft saved to the server — so their votes stayed in one browser's
         * storage, absent from My Lists and lost with site data or a device
         * change. Two exits offering two different levels of safety.
         *
         * Still a link, not a button: right-click, middle-click and the status
         * bar URL all keep working. The click is only intercepted when there is
         * something to lose — real votes, mid-ranking. With no votes yet, or
         * once the ranking is finished (where the dialog does not render), it
         * navigates as before.
         */}
        <Link
          href="/"
          onClick={(e) => {
            if (!session || finished) return;
            if (totalComparisons(session) === 0) return;
            e.preventDefault();
            setExitOpen(true);
          }}
          className="flex shrink-0 items-center gap-1 font-display text-base sm:text-lg uppercase tracking-widest text-text transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span aria-hidden="true" className="text-gold">✦</span>
          MovieRanker
        </Link>
        <div aria-hidden="true" className="h-5 w-px shrink-0 bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {/* THE SPOILER RULE. For a marquee room `session.title` is the theme
                title, which paraphrases the answer to the connection quiz on
                the completion screen — this header used to name it for the
                whole session and then ask the player to guess it. The home hero
                withholds it, the share text withholds it, the OG card withholds
                it and the finished list page withholds it; this was the one
                surface that did not.

                The stored title is untouched: the saved list really is that
                theme, and the quiz reveals it once answered. */}
            {/* Below sm the row is wordmark + four controls and the title was
                truncating to "W…" — worse than no title. Kept for assistive
                tech (it is the page heading) but out of the visual row on
                phones; the progress card immediately below names the state. */}
            <h1 className="truncate text-sm sm:text-base font-bold leading-tight max-sm:sr-only">
              {marqueeDisplayTitle(session.title, session.themeSlug, marqueeNumber())}
            </h1>
            {session.themeSlug && (
              // The unlocked variant stays: `curated: false` with a themeSlug is
              // still reachable in sessions saved before the Unlock control was
              // removed, and those must not render as locked.
              // Hidden below sm: the h1 beside it already says "Weekly Marquee",
              // and on a 390px header the pill was being drawn under the Dim
              // Lights toggle because this column could not shrink (it needed
              // min-w-0 for the h1's truncate to work). The lock is text, not
              // an emoji: DESIGN.md's "labels over icons".
              <span
                className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold sm:inline ${
                  session.curated
                    ? "bg-gold/15 text-gold ring-1 ring-gold/40"
                    : "bg-surface-raised text-muted ring-1 ring-white/10"
                }`}
              >
                {session.curated ? "✦ Marquee · locked" : "Marquee · unlocked"}
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
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LightsDownToggle isLightsDown={lightsDown} onToggle={handleToggleLightsDown} />
          <SoundToggle isSoundEnabled={soundEnabled} onToggle={handleToggleSound} />
          {!finished && (
            <>
              <button
                ref={exitTriggerRef}
                type="button"
                onClick={() => setExitOpen((v) => !v)}
                aria-expanded={exitOpen}
                className="flex min-h-8 items-center rounded px-2.5 py-0.5 text-xs sm:text-sm font-medium text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-raised cursor-pointer"
              >
                Exit
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                aria-keyshortcuts="z"
                title="Undo last vote (Z)"
                className="flex min-h-8 items-center gap-1 rounded bg-surface px-2.5 py-0.5 text-xs sm:text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-raised cursor-pointer disabled:pointer-events-none disabled:opacity-40"
              >
                <span aria-hidden="true">↩</span> Undo
              </button>
            </>
          )}
        </div>
      </header>

      {authNotice && (
        <p role="alert" className="px-4 pt-2 text-xs text-accent-red sm:px-6 sm:text-sm">
          Sign-in failed — still playing as a guest.
        </p>
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
            {/* Say what actually happens. "Leave this ranking?" with three
                buttons and no explanation left people guessing whether their
                votes were about to be thrown away — they are not, and a
                warning that does not say so is just an obstacle. The two cases
                genuinely differ, so they are worded separately rather than
                averaged into something vague. */}
            <p className="mt-1.5 text-xs leading-snug text-muted">
              {signedIn
                ? `Your ${Math.floor(totalComparisons(session) / 2)} votes are safe either way. Resume later saves this as a draft on your account, so you can pick it up on any device.`
                : `Your ${Math.floor(totalComparisons(session) / 2)} votes are kept in this browser — the home page will offer to resume. Only Abandon discards them.`}
            </p>
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
          /* THE SAVE NUDGE IS A TOAST, NOT A BAR, and that is the whole fix.
             It used to render here as an in-flow `div` above the stage, so the
             moment the tenth comparison landed it INSERTED ~40px of layout and
             shoved both posters down mid-vote. A board that reflows under the
             player between one tap and the next is the single most jarring
             thing this screen did; a NYT game would never do it.

             `fixed` takes it out of flow entirely, so appearing and dismissing
             both cost exactly zero layout shift. Position is chosen so it
             covers neither of the two things that matter: the progress board is
             at the top of the stage and the posters are centred, so the toast
             lives in the bottom margin over the YOUR MOVIES tray — the only
             genuinely secondary surface on the screen, and one the player can
             still reach by dismissing.

             The bottom offset stacks it ABOVE the "Unsaved — lives in this
             browser" pill rather than on top of it: both are gated on `!initial`
             so they always appear together, and two floating chips overlapping
             in the same corner reads as a bug. From sm: up there is room to put
             the toast in the opposite corner instead and drop the offset.

             animate-sheet-up (220ms) is the site's existing entrance for
             something arriving from the bottom edge; globals.css already
             neutralises it under prefers-reduced-motion. */
          <div
            role="status"
            className="fixed inset-x-3 bottom-[max(3.25rem,calc(env(safe-area-inset-bottom)+3rem))] z-30 animate-sheet-up sm:inset-x-auto sm:left-4 sm:bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))] sm:max-w-md"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface/95 p-3 ring-1 ring-gold/25 shadow-2xl backdrop-blur-sm">
              <p className="min-w-0 flex-1 text-sm text-muted">
                Save your progress to your account?
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
        /* THE FINALE IS THE STAGE MOMENT, so it gets curtain vocabulary. The
           `stable && !sharpening` consensus screen below already had bg-curtain
           and spotlight-glow; this screen — the one the Finish button actually
           lands you on, and the last thing a first-time ranker sees — sat on
           bare house black. The bigger beat had the plainer set.

           WHY bg-curtain-soft AND NOT bg-curtain: DESIGN.md is explicit that the
           full-strength drape never goes behind dense content or poster grids,
           and that "posters never sit directly on fold crests without a surface
           card between". This is the densest screen in the room — a whole
           RankedList plus the Premiere Pass with its champion poster and
           runner-up thumbnails. bg-curtain-soft exists for exactly this case:
           the same burgundy fold vocabulary, but under a near-opaque house-light
           overlay pulled back toward --bg, with a bottom fade so the buttons and
           caption below the cards stay legible. It is what the vote stage
           already uses, for the same reason. Both utilities are static
           gradients, so reduced motion needs no override here.

           The consensus screen keeps full bg-curtain on purpose: it shows a
           three-poster Podium inside one surface card, not a grid, so it can
           carry the stronger drape. */
        <section className="bg-curtain-soft relative overflow-hidden flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
          <CurtainCallCelebration title="Curtain Call · Ranking Finalized" />
          {/* Warm focal pool, same as the consensus screen. It has to be its own
              element because .spotlight-glow and .bg-curtain-soft both write
              background-image and would clobber each other on one node. */}
          <div aria-hidden="true" className="spotlight-glow pointer-events-none absolute inset-0" />
          {/* Every content child below carries `relative` so it paints ABOVE the
              absolutely-positioned glow instead of under it. */}
          <div className="relative w-full max-w-md rounded bg-surface p-5 ring-1 ring-white/10">
            {/* THE "+N XP EARNED" BADGE WAS REMOVED FROM HERE, and this note is
                why, so it is not re-added by reflex.

                It rendered `+{active.length} XP` — one XP per film in play —
                and that was never what the ranking paid. `movieXp` in
                lib/gamification.ts clamps movie XP at MAX_XP_PER_LIST (20) per
                list, so a 30-film ranking promised +30 and banked 20. The two
                completion bonuses that sit outside that cap
                (MARQUEE_COMPLETION_XP, CO_CURATION_XP) were not counted either,
                so the number was not even wrong in a single direction.

                Worse, this screen is PRE-SAVE. Nothing has been banked when it
                renders: a guest who never saves earns exactly 0, and the "Keep
                voting" button at the bottom of this very screen means even a
                signed-in player may never press Save. Advertising a balance
                before the transaction is the same class of bug the XP-sources
                note in lib/gamification.ts was written about — a "+10 XP"
                marquee bonus and a "+5 XP" group bonus that no code ever paid —
                and the position stated there is that the guide reads the
                constants rather than restating them.

                The honest number already exists and already ships:
                CompletionSummaryCard renders it on /l/[id] after saving, from
                lib/completion.ts, which DIFFS total XP before and after the list
                instead of guessing at it. That is the only place that can know,
                because it is the only place the XP has actually moved. Do not
                reconstruct an estimate here; send people there. */}
            <p className="pb-2 text-sm uppercase tracking-widest text-accent">Final order</p>
            <RankedList movies={active} />
          </div>

          {/* Premiere Pass Golden Ticket Export Card */}
          <div className="relative w-full max-w-xl">
            <PremierePassCard
              /* THE SPOILER RULE APPLIES HERE TOO. For a marquee session
                 `session.title` IS the theme title — the answer to the
                 connection puzzle the player is about to be asked. The header
                 at the top of this room masks it through
                 `marqueeDisplayTitle(...)`, and so do the home hero, the share
                 text, the OG card and the saved list page; this card printed it
                 in gold on the Premiere Pass, on the very screen that leads to
                 the quiz. Same masked string as the header, same arguments.

                 `themeTitle` below still receives the raw title on purpose.
                 It is forwarded into TicketRenderOptions, and ticket-canvas.ts
                 declares the field but never draws it — checked, not assumed —
                 so nothing reaches a pixel or a share sheet through it today.
                 Only the visible headline needed masking. If that prop ever
                 starts rendering, it needs the same treatment. */
              title={
                marqueeDisplayTitle(session.title, session.themeSlug, marqueeNumber()) ||
                "Movie Ranking Consensus"
              }
              items={finalizeRanks(active)
                .filter((r): r is { tmdbId: number; rank: number } => r.rank !== null)
                .map((r) => {
                  const m = active.find((x) => x.tmdbId === r.tmdbId);
                  return {
                    rank: r.rank,
                    title: m?.title ?? "Movie",
                    releaseYear: m?.releaseYear ?? null,
                    posterPath: m?.posterPath ?? null,
                  };
                })}
              participants={session.participants}
              themeTitle={session.title}
              totalRanked={active.length}
            />
          </div>

          <div className="relative flex flex-col items-center gap-2">
            {!session.themeSlug && (
              <label
                htmlFor="play-room-spotlight-opt-in"
                className="mb-1 flex items-center gap-2.5 cursor-pointer select-none rounded-lg px-2 py-1.5 text-xs sm:text-sm text-text transition-colors hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  id="play-room-spotlight-opt-in"
                  name="submitToSpotlight"
                  checked={submitToSpotlight}
                  onChange={(e) => setSubmitToSpotlight(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-surface-raised accent-gold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                />
                <span>Submit to Community Spotlight</span>
              </label>
            )}
            <button
              type="button"
              onClick={() => void handleDirectSave("done")}
              disabled={savingDirectly}
              className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
            >
              {savingDirectly && savingStatus === "done" ? "Saving ranking…" : "Save & finish"}
            </button>
            <button
              type="button"
              onClick={() => void handleDirectSave("draft")}
              disabled={savingDirectly}
              className="min-h-11 rounded bg-surface-raised px-5 text-sm font-medium transition-colors duration-200 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
            >
              {savingDirectly && savingStatus === "draft" ? "Saving draft…" : "Save & quit as draft"}
            </button>
            <p className="mt-1 max-w-xs text-center text-xs text-muted">
              {session.themeSlug
                ? "✦ Weekly Marquee rankings are public by default to power community stats."
                : submitToSpotlight
                  ? "✦ Will appear in Community Spotlight on the home page."
                  : signedIn
                    ? "Saves unlisted to your profile & lists."
                    : "Your ranking lives in this browser until you save it."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFinished(false)}
            className="relative min-h-11 rounded bg-surface px-5 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-raised"
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
          <CurtainCallCelebration title="Curtain Call · Consensus Reached" />
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
          {session.themeSlug && (
            <div className="w-full max-w-xl mx-auto">
              <MarqueeConnectionGame
                themeSlug={session.themeSlug}
                /* A room in play is always the current week's marquee, so "now"
                   is the right anchor here — unlike the saved list page, which
                   must date the number from when the room was made. */
                marqueeNumber={marqueeNumber()}
                game={getThemeConnectionGame({ slug: session.themeSlug, title: session.title })}
              />
            </div>
          )}

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
                <span>Sharpen close calls</span>
                <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">+XP</span>
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
        <section className="bg-curtain-soft transition-all duration-500 relative flex flex-1 flex-col px-3 pb-2 pt-1 sm:px-6">
          {/* Mini marquee board: one trusted "X of ~Y votes" number in Bebas
              gold between thin gold rules; close calls demoted to a chip. */}
          <div className={`mini-marquee-board mt-3 mb-6 sm:mb-8 w-full max-w-5xl mx-auto rounded-xl bg-surface/85 px-4 py-3.5 ring-1 ring-white/10 shadow-lg backdrop-blur-sm transition-opacity duration-300 ${lightsDown ? "cinema-peripheral" : ""}`}>
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
                  <span className="flex items-center gap-2 font-medium text-gold">
                    Sharpening · resolving close calls
                  </span>
                ) : (
                  <span className="flex min-w-0 items-baseline gap-x-1.5 whitespace-nowrap">
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
                )}
                {/* Reserved second line: rendered at a fixed h-4 whether or not
                    it has anything to say, so the status text arriving can
                    never move the board — and the whole two-line stack still
                    measures under the min-h-11 of the button beside it, which
                    is what actually sets this row's height. */}
                <p className="mt-0.5 h-4 truncate text-xs leading-4 text-muted/80">
                  {sharpening ? "" : progressNote}
                </p>
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gold/10 px-3.5 py-2 ring-1 ring-gold/30 animate-fade-in">
                <div className="flex items-center gap-2 text-xs text-gold">
                  <span aria-hidden="true" className="font-display text-sm">✦</span>
                  <span className="font-semibold">Top 3 locked</span>
                  <span className="hidden sm:inline text-muted text-[11px]">— Finish now or keep ranking the full list for complete stats</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFinished(true)}
                  className="inline-flex min-h-8 items-center rounded-full bg-gold px-3.5 text-xs font-bold uppercase tracking-wider text-bg shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  Finish with Top 3 →
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
              history={session.history}
              settlingLoserId={settlingLoserId}
              onVote={handleVote}
              onPark={(id) => handleParkToggle(id, true)}
            />
          </div>
        </section>
      ) : null}

      {!finished && (
        <div className={`parked-strip-container transition-opacity duration-300 ${lightsDown ? "cinema-peripheral" : ""}`}>
          <ParkedStrip movies={session.movies} onToggle={handleParkToggle} />
        </div>
      )}

      {sheetStatus && (
        <SaveGateSheet
          session={session}
          status={sheetStatus}
          existingId={initial?.id}
          initialSubmitToSpotlight={submitToSpotlight}
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
