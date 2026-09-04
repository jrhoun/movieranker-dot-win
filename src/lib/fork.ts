import type { RankedMovie } from "./ranking";
import { saveSession, type PlaySession } from "./session";

export interface ForkableMovieInput {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  releaseYear?: number | null;
  tagline?: string | null;
  finalRank?: number | null;
  elo?: number;
  comparisons?: number;
  parked?: boolean;
}

export interface ForkableListInput {
  title: string;
  movies: ForkableMovieInput[] | RankedMovie[];
  themeSlug?: string | null;
}

/**
 * Creates a pristine PlaySession from an existing list:
 * - Resets all Elo ratings to 1000
 * - Resets all comparisons to 0
 * - Resets parked flags to false
 * - Clears participants
 * - Prefixes title with "Re-rank: "
 * - Automatically saves the clean session to localStorage
 */
export function createForkSession(
  list: ForkableListInput,
  ownerHandle?: string | null,
): PlaySession {
  const cleanMovies: RankedMovie[] = (list.movies ?? []).map((m) => ({
    tmdbId: m.tmdbId,
    title: m.title,
    posterPath: m.posterPath ?? null,
    releaseYear: m.releaseYear ?? null,
    tagline: m.tagline ?? null,
    elo: 1000,
    comparisons: 0,
    parked: false,
  }));

  const trimmedTitle = list.title.trim();
  const forkTitle = trimmedTitle.startsWith("Re-rank:")
    ? trimmedTitle
    : `Re-rank: ${trimmedTitle}`;

  const session: PlaySession = {
    title: forkTitle,
    participants: [],
    movies: cleanMovies,
    votesSinceOrderChange: 0,
    nudgeShown: false,
    themeSlug: list.themeSlug ?? null,
    curated: false, // forked sessions allow full user customization
  };

  saveSession(session);
  return session;
}
