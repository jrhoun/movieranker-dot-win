import { createSupabaseServerClient } from "@/lib/supabase/server";
import { maskListTitle } from "@/lib/marquee-title";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TrendingMovieSummary {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  finalRank: number | null;
}

export interface TrendingListSummary {
  id: string;
  /**
   * DISPLAY title. For a marquee list this is "Weekly Marquee #N", never the
   * theme title — see the note on `formatTrendingLists`. Nothing downstream is
   * ever handed the raw one, so a new Spotlight surface cannot leak it by
   * forgetting a rule it was never given the chance to break.
   */
  title: string;
  /** Null for a marquee list: the stored blurb is the theme's own blurb. */
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
 * Width of the candidate pool fetched from the database before the in-memory
 * hot-score sort runs. The pool is ordered by `created_at DESC` (recency), not
 * `upvotes_count DESC` — a brand-new, 0-upvote list must be inside this window
 * or the time-decay term in `calculateHotScore` can never do its job, no matter
 * how the in-memory sort is written.
 */
export const HOT_CANDIDATE_POOL = 60;

/**
 * Reddit Hot Ranking Algorithm (Aaron Swartz formula adapted for MovieRanker).
 *
 * Score = log10(max(1, upvotes)) + (createdAtSeconds - epochOffset) / halfLifeSeconds
 *
 * 1. Logarithmic scale:
 *    1 upvote = 0.0, 10 upvotes = 1.0, 100 upvotes = 2.0, 1000 upvotes = 3.0.
 *    Early upvotes matter far more than later ones.
 * 2. Time decay (halfLifeSeconds = 86,400s = 24h):
 *    Every 24 hours, a list loses 1.0 point (an entire 10x order of magnitude)
 *    against new lists — i.e. 10 upvotes buys roughly one day of freshness.
 *
 *    NOTE ON THE ORIGINAL CONSTANT: this used to be 45,000s (~12.5h), copied
 *    verbatim from Reddit's own hot-ranking constant. That value is calibrated
 *    for a site with thousands of new posts per day; on MovieRanker, where new
 *    showcase lists trickle in far more slowly, it made recency swamp upvotes
 *    almost completely. The absolute size of the time term is irrelevant to
 *    ordering (only the *difference* between two lists' terms matters, and
 *    `epochOffsetSeconds` cancels out of that difference entirely) — what
 *    matters is how much upvote lead is needed to survive a given age gap. At
 *    45,000s, a list posted this morning already needed a 10x upvote lead just
 *    to outrank one posted an hour ago (12.5h = one full order of magnitude).
 *    In practice that meant the Spotlight was "newest first" in all but a
 *    narrow same-half-day window, defeating the point of having an upvote term
 *    at all. 86,400s makes the trade-off "10 upvotes ~= 1 day", which is a
 *    trade-off a slower-velocity site can actually spend a day earning.
 *
 * Result: Stale lists from last week naturally decay and sink down, while fresh
 * lists with active momentum shoot up to the Spotlight!
 */
export function calculateHotScore(
  upvotes: number,
  createdAt: string | Date,
  epochOffsetSeconds = 1700000000,
  halfLifeSeconds = 86400,
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
 *
 * THE SPOILER RULE APPLIES HERE, not at the render site. The Community
 * Spotlight on the home page is public, unauthenticated and sits a few hundred
 * pixels below a hero that deliberately refuses to name the week's theme — so a
 * marquee list surfacing there under "The Golden Age of Hollywood" handed the
 * answer to the very visitor the hero had just teased. The blurb goes with it:
 * for a marquee row, `description` is the theme's own blurb, which paraphrases
 * the answer just as directly as the title does.
 *
 * Masked in the summary rather than in home-client because a summary is read by
 * more than one thing: the same `title` also feeds the card's <ForkButton>,
 * whose accessible label names the list it forks, and becomes the forked
 * session's own name. One masked field covers all three; a rule applied in JSX
 * covers only the JSX.
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
        title: maskListTitle({
          title: l.title,
          themeSlug: l.theme_slug,
          createdAt: l.created_at,
        }),
        description: l.theme_slug ? null : l.description,
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
 * Fetches trending public showcases from Supabase.
 *
 * The candidate pool is always fetched ordered by `created_at DESC` (recency)
 * rather than `upvotes_count DESC`, and widened to `HOT_CANDIDATE_POOL` rows
 * for "hot" and "new" modes — a brand-new, 0-upvote list has to be inside the
 * candidate set for `calculateHotScore`'s time-decay term to ever matter.
 * "top" keeps its original upvotes-first query, since that mode is defined as
 * "highest upvotes across everything", not a recency window.
 *
 * `customSupabase` stays `any` (like `src/lib/career-xp.ts`'s narrower
 * `SupabaseClient` typing, which was tried here first): the test suite's
 * hand-rolled builder mocks only implement the handful of chain methods this
 * file actually calls (`select`/`eq`/`in`/`order`/`limit`, plus a thenable),
 * not the real client's dozens of unrelated members (`auth`, `realtime`,
 * `storage`, `rpc`, `channel`, ...). Reconciling the real client's deeply
 * generic `PostgrestFilterBuilder` chain against a minimal structural
 * interface hit TypeScript's "Type instantiation is excessively deep" limit
 * inside this function, and would still have needed `as unknown as` casts at
 * every mock call site anyway, so it bought no real safety over `any`.
 */
export async function getTrendingLists(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customSupabase?: any,
  limit: number = 6,
  sortMode: TrendingSortMode = "hot",
): Promise<TrendingListSummary[]> {
  try {
    const supabase: SupabaseClient = customSupabase ?? (await createSupabaseServerClient());

    let query = supabase
      .from("lists")
      .select(
        "id,title,description,owner_id,status,visibility,upvotes_count,theme_slug,created_at,list_movies(tmdb_id,title,poster_path,release_year,final_rank)",
      )
      .eq("status", "done")
      .eq("visibility", "public");

    query =
      sortMode === "top"
        ? query
            .order("upvotes_count", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(limit)
        : query.order("created_at", { ascending: false }).limit(HOT_CANDIDATE_POOL);

    const { data: lists, error } = await query;

    if (error || !lists || !Array.isArray(lists)) {
      /* Degrading to an empty Spotlight is right for visitors, but doing it
         SILENTLY hid a whole class of problem: on 2026-09-05 this query had
         been failing with `column lists.upvotes_count does not exist` — the
         20260902_list_upvotes.sql migration was never applied — and the only
         symptom was a "Coming Soon" panel on a site that had four public
         lists. Say so in development. */
      if (process.env.NODE_ENV !== "production" && error) {
        console.warn("[trending] Spotlight query failed; rendering empty:", error.message ?? error);
      }
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

    return formatTrendingLists(lists as RawDbListRow[], handlesMap, sortMode).slice(0, limit);
  } catch {
    return [];
  }
}
