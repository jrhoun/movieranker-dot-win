// Public profile shaping: derives showcase data from a user's PUBLIC done lists.
// Private/unlisted rows must never leak into stats or the card grid.
import { type Level, levelFor } from "./gamification";

export interface DbPublicList {
  id: string;
  title: string;
  status: string;
  visibility: string | null;
  created_at: string;
  list_movies: { title: string; poster_path: string | null }[] | null;
}

export interface PublicListCardData {
  id: string;
  title: string;
  /** UTC date string, e.g. "Mar 5, 2026". */
  createdAt: string;
  posters: { title: string; posterPath: string | null }[];
}

/** Everything the /u/[handle] page renders, derived only from public done lists. */
export function shapePublicProfile(rows: DbPublicList[]): {
  cards: PublicListCardData[];
  moviesRanked: number;
  level: Level;
} {
  // ponytail: filters again even though the DB query does NOT scope to public+done
  // (RLS on lists is broader); this JS filter is the actual guarantee — keep it.
  // Defense-in-depth at the trust boundary so stats can't leak via query drift.
  const pub = rows.filter((l) => l.status === "done" && l.visibility === "public");
  const moviesRanked = pub.reduce((n, l) => n + (l.list_movies?.length ?? 0), 0);
  return {
    cards: pub.map((l) => ({
      id: l.id,
      title: l.title,
      createdAt: new Date(l.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
      }),
      posters: (l.list_movies ?? []).map((m) => ({
        title: m.title,
        posterPath: m.poster_path,
      })),
    })),
    moviesRanked,
    level: levelFor(moviesRanked),
  };
}
