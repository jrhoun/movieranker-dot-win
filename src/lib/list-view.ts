/** Data shapes + pure grouping logic for the public list page /l/[id]. */

export interface ListMovieRow {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  comparisons: number;
  finalRank: number | null;
}

export interface ListHeader {
  id: string;
  title: string;
  participants: string[];
  status: string;
  ownerId: string;
}

export type RankedRow = ListMovieRow & { rank: number };

/** Trust stored final_rank; fall back to array position for safety. */
export function withRanks(movies: ListMovieRow[]): RankedRow[] {
  return movies.map((m, i) => ({ ...m, rank: m.finalRank ?? i + 1 }));
}

/** Top 3 for the podium; everything else renders below it. */
export function splitPodium<T>(movies: T[]): { podium: T[]; rest: T[] } {
  return { podium: movies.slice(0, 3), rest: movies.slice(3) };
}

/** Podium display order: 2nd, 1st (center, largest), 3rd. Shorter podiums stay in rank order. */
export function podiumDisplayOrder<T>(podium: T[]): T[] {
  if (podium.length < 3) return podium;
  return [podium[1], podium[0], podium[2]];
}
