import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface TrendingMovieSummary {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  finalRank: number | null;
}

export interface TrendingListSummary {
  id: string;
  title: string;
  description: string | null;
  ownerHandle: string | null;
  ownerId: string;
  upvotesCount: number;
  movieCount: number;
  createdAt: string;
  themeSlug?: string | null;
  movies: TrendingMovieSummary[];
  topPosters: TrendingMovieSummary[];
}

export interface RawDbListRow {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  status: string;
  visibility: string;
  upvotes_count: number | null;
  theme_slug?: string | null;
  created_at: string;
  list_movies?: Array<{
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    release_year: number | null;
    final_rank: number | null;
  }>;
}

export type TrendingSortMode = "hot" | "top" | "new";

/**
 * Reddit Hot Ranking Algorithm (Aaron Swartz formula adapted for MovieRanker).
 *
 * Score = log10(max(1, upvotes)) + (createdAtSeconds - epochOffset) / halfLifeSeconds
 *
 * 1. Logarithmic scale:
 *    1 upvote = 0.0, 10 upvotes = 1.0, 100 upvotes = 2.0, 1000 upvotes = 3.0.
 *    Early upvotes matter far more than later ones.
 * 2. Time decay (halfLifeSeconds = 45,000s ≈ 12.5h):
 *    Every 12.5 hours, a list loses 1.0 point (an entire 10x order of magnitude)
 *    against new lists.
 *
 * Result: Stale lists from last week naturally decay and sink down, while fresh
 * lists with active momentum shoot up to the Spotlight!
 */
export function calculateHotScore(
  upvotes: number,
  createdAt: string | Date,
  epochOffsetSeconds = 1700000000,
  halfLifeSeconds = 45000,
): number {
  const safeUpvotes = Math.max(0, upvotes);
  const order = Math.log10(Math.max(1, safeUpvotes));
  const createdMs =
    typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  const createdSeconds = isNaN(createdMs) ? epochOffsetSeconds : createdMs / 1000;
  const timeBonus = (createdSeconds - epochOffsetSeconds) / halfLifeSeconds;
  return Number((order + timeBonus).toFixed(7));
}

/**
 * Pure helper to filter and sort list rows into TrendingListSummary objects.
 */
export function formatTrendingLists(
  lists: RawDbListRow[],
  profileHandles: Map<string, string> = new Map(),
  sortMode: TrendingSortMode = "top",
): TrendingListSummary[] {
  return lists
    .filter((l) => l.status === "done" && l.visibility === "public")
    .sort((a, b) => {
      if (sortMode === "hot") {
        const scoreA = calculateHotScore(a.upvotes_count ?? 0, a.created_at);
        const scoreB = calculateHotScore(b.upvotes_count ?? 0, b.created_at);
        if (scoreB !== scoreA) return scoreB - scoreA;
      } else if (sortMode === "new") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const upvotesA = a.upvotes_count ?? 0;
      const upvotesB = b.upvotes_count ?? 0;
      if (upvotesB !== upvotesA) return upvotesB - upvotesA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .map((l) => {
      const rawMovies = l.list_movies ?? [];
      const movies: TrendingMovieSummary[] = rawMovies.map((m) => ({
        tmdbId: m.tmdb_id,
        title: m.title,
        posterPath: m.poster_path,
        releaseYear: m.release_year,
        finalRank: m.final_rank,
      }));

      // Sort movies by final_rank ascending (nulls last)
      const sortedByRank = [...movies].sort((x, y) => {
        if (x.finalRank === null && y.finalRank === null) return 0;
        if (x.finalRank === null) return 1;
        if (y.finalRank === null) return -1;
        return x.finalRank - y.finalRank;
      });

      const topPosters = sortedByRank.slice(0, 3);

      return {
        id: l.id,
        title: l.title,
        description: l.description,
        ownerHandle: profileHandles.get(l.owner_id) ?? null,
        ownerId: l.owner_id,
        upvotesCount: l.upvotes_count ?? 0,
        movieCount: movies.length,
        createdAt: l.created_at,
        themeSlug: l.theme_slug ?? null,
        movies,
        topPosters,
      };
    });
}

/**
 * Fetches trending public showcases from Supabase ordered by upvotes_count DESC and recency.
 */
export async function getTrendingLists(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customSupabase?: any,
  limit: number = 6,
): Promise<TrendingListSummary[]> {
  try {
    const supabase = customSupabase ?? (await createSupabaseServerClient());
    const { data: lists, error } = await supabase
      .from("lists")
      .select(
        "id,title,description,owner_id,status,visibility,upvotes_count,theme_slug,created_at,list_movies(tmdb_id,title,poster_path,release_year,final_rank)",
      )
      .eq("status", "done")
      .eq("visibility", "public")
      .order("upvotes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !lists || !Array.isArray(lists)) {
      return [];
    }

    const ownerIds = [
      ...new Set(
        (lists as RawDbListRow[])
          .map((l) => l.owner_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];

    const handlesMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,handle")
        .in("id", ownerIds)
        .eq("visibility", "public");

      if (profiles && Array.isArray(profiles)) {
        for (const p of profiles as { id: string; handle: string }[]) {
          handlesMap.set(p.id, p.handle);
        }
      }
    }

    return formatTrendingLists(lists as RawDbListRow[], handlesMap);
  } catch {
    return [];
  }
}
