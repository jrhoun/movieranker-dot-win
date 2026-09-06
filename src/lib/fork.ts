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
 *
 * NO SOURCE-CURATOR ATTRIBUTION, deliberately. This function used to accept an
 * `ownerHandle` and drop it on the floor, and the obvious repair — seeding
 * `participants` with it so the original curator gets credit — is wrong, because
 * `participants` is not a credits list. It is the list of PEOPLE WHO VOTED, and
 * three other systems read it as exactly that:
 *
 *   1. `toXpLists` in career-xp.ts sets `coCurated: participants.length > 0`,
 *      which pays out CO_CURATION_XP. Seeding a stranger's handle would mint
 *      +5 XP for a solo re-rank with no co-curator.
 *   2. The `double_feature` achievement is "Finished a ranking that credits a
 *      co-curator" — it would unlock just for forking somebody else's list.
 *   3. `participant_attributions` lets a signed-in user CLAIM a participant
 *      chip on any readable list, so the source curator could claim authorship
 *      credit on a fork they had no hand in.
 *
 * Fork lineage is a real and worthwhile feature, but it needs its own field
 * (a `forkedFrom` on PlaySession, persisted and surfaced as provenance rather
 * than as participation) and its own decision about whether lineage should be
 * visible on the finished list. Until then, crediting nobody is the honest
 * answer: an un-passed parameter is dead weight, but a parameter wired to the
 * wrong field is a phantom XP source.
 */
export function createForkSession(list: ForkableListInput): PlaySession {
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
    // Empty on purpose — see the note on this function about why source-curator
    // attribution must not ride on `participants`.
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
