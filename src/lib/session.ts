import {
  nextMatchup,
  recordMatchupResult,
  sharpenNextPair,
  type RankedMovie,
} from "./ranking";

export interface PlaySession {
  title: string;
  participants: string[];
  movies: RankedMovie[];
  votesSinceOrderChange: number;
  nudgeShown: boolean;
  /** Pre-vote deep copy for single-level undo; has its own snapshot stripped. */
  undoSnapshot?: PlaySession | null;
}

const KEY = "mr-session";

export function loadSession(): PlaySession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlaySession;
  } catch {
    return null;
  }
}

export function saveSession(s: PlaySession): void {
  // ponytail: quota errors swallowed silently; surface a toast if users ever hit it
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Deep copy for undo; nested snapshots dropped so undo stays single-level. */
export function snapshotForUndo(s: PlaySession): PlaySession {
  const copy = structuredClone(s);
  delete copy.undoSnapshot;
  return copy;
}

export function applyVote(
  s: PlaySession,
  winnerId: number,
  loserId: number,
): PlaySession {
  const { movies, orderChanged } = recordMatchupResult(s.movies, winnerId, loserId);
  return {
    ...s,
    movies,
    votesSinceOrderChange: orderChanged ? 0 : s.votesSinceOrderChange + 1,
    undoSnapshot: snapshotForUndo(s),
  };
}

export function parkMovie(s: PlaySession, tmdbId: number, parked: boolean): PlaySession {
  return {
    ...s,
    movies: s.movies.map((m) => (m.tmdbId === tmdbId ? { ...m, parked } : m)),
  };
}

export function selectNextPair(
  s: PlaySession,
  sharpening: boolean,
): [RankedMovie, RankedMovie] | null {
  const active = s.movies.filter((m) => !m.parked);
  if (active.length < 2) return null;
  return sharpening ? sharpenNextPair(active) : nextMatchup(active);
}
