import {
  nextMatchup,
  recordMatchupResult,
  sharpenNextPair,
  type RankedMovie,
} from "./ranking";
import { SHORTLIST_THEMES } from "./shortlist-themes";

export interface PlaySession {
  title: string;
  participants: string[];
  movies: RankedMovie[];
  votesSinceOrderChange: number;
  nudgeShown: boolean;
  /** Weekly marquee provenance: set when the session starts from a theme. */
  themeSlug?: string | null;
  /** True while roster is locked to the theme; unlocking keeps themeSlug. */
  curated?: boolean;
  /** Pre-vote deep copy for single-level undo; has its own snapshot stripped. */
  undoSnapshot?: PlaySession | null;
}

const KEY = "mr-session";

export function loadSession(): PlaySession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PlaySession;
    if (session.themeSlug) {
      const theme = SHORTLIST_THEMES.find((t) => t.slug === session.themeSlug);
      if (theme && (session.curated || session.title === "Rain Soaked Cinema")) {
        session.title = theme.title;
      }
    } else if (session.title === "Rain Soaked Cinema") {
      session.title = "Heavy Rain, Poor Choices";
      session.themeSlug = "rain-soaked-cinema";
    }
    return session;
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

export interface ResumedList {
  id: string;
  title: string;
  participants: string[];
  status: "draft" | "done";
  movies: RankedMovie[];
}

/** Sum of per-movie comparison counts (2 per completed vote). */
export function totalComparisons(s: PlaySession): number {
  return s.movies.reduce((a, m) => a + m.comparisons, 0);
}

/** Movies in `after` that are new or changed (elo/comparisons/parked) vs `before`. */
export function changedMovies(before: RankedMovie[], after: RankedMovie[]): RankedMovie[] {
  const prev = new Map(before.map((m) => [m.tmdbId, m]));
  return after.filter((m) => {
    const p = prev.get(m.tmdbId);
    return !p || p.elo !== m.elo || p.comparisons !== m.comparisons || p.parked !== m.parked;
  });
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
  previousPair?: [RankedMovie, RankedMovie] | null,
): [RankedMovie, RankedMovie] | null {
  const active = s.movies.filter((m) => !m.parked);
  if (active.length < 2) return null;
  return sharpening
    ? sharpenNextPair(active)
    : nextMatchup(active,
        previousPair ? ([previousPair[0].tmdbId, previousPair[1].tmdbId] as const) : undefined);
}
