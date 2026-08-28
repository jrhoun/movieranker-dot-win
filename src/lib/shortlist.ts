import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SHORTLIST_THEMES, type ShortlistTheme } from "./shortlist-themes";

/**
 * This Week's Marquee (formerly "Tonight's Shortlist"): a themed strip on the
 * home page that rotates once per UTC week. The rotation is a pure function
 * of the date — every visitor sees the same theme with no cron or per-user
 * state.
 */

export type ShortlistEntry = ShortlistTheme & {
  source: "curated" | "community";
  /** Approved-proposal id when sourced from the community; null for curated. */
  proposalId: string | null;
  /** Proposer's public profile handle, when known; never a private handle. */
  proposedBy: string | null;
};

/** Whole UTC days since 1970-01-01 — stable regardless of local timezone. */
export function daysSinceUtcEpoch(date: Date = new Date()): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

/**
 * Whole ISO weeks since the epoch, anchored to Monday — deterministic weekly
 * rotation index. The epoch was a Thursday, so +3 shifts the flip point from
 * UTC Thursday midnight to UTC Monday midnight (no mid-calendar-week changes).
 */
export function weeksSinceUtcEpoch(date: Date = new Date()): number {
  return Math.floor((daysSinceUtcEpoch(date) + 3) / 7);
}

/**
 * ISO-week index of the launch week (Monday 2026-08-24 UTC). Derived rather
 * than hardcoded so it stays correct against weeksSinceUtcEpoch's Monday anchor.
 */
const MARQUEE_EPOCH_WEEK = weeksSinceUtcEpoch(new Date("2026-08-24T00:00:00Z"));

/**
 * Human-facing marquee counter: 1 during launch week, +1 each UTC Monday.
 * weeksSinceUtcEpoch() counts from 1970 (~2900), which reads as noise in a
 * share; a small incrementing number reads as an appointment.
 * Clamped to >= 1 so pre-launch dates never produce 0 or negatives.
 */
export function marqueeNumber(date: Date = new Date()): number {
  return Math.max(1, weeksSinceUtcEpoch(date) - MARQUEE_EPOCH_WEEK + 1);
}

/** Date of the next UTC Monday midnight rotation (exact millisecond). */
export function getNextWeeklyMarqueeRotation(date: Date = new Date()): Date {
  const currentWeek = weeksSinceUtcEpoch(date);
  const nextWeekDays = (currentWeek + 1) * 7 - 3;
  return new Date(nextWeekDays * 86_400_000);
}

/** Deterministic pick: pool[weekIndex % pool.length] (undefined for empty pool). */
export function pickTonightsEntry<T>(pool: T[], weekIndex: number): T | undefined {
  if (pool.length === 0) return undefined;
  return pool[((weekIndex % pool.length) + pool.length) % pool.length];
}

/** Curated themes first, approved community proposals appended. Pure. */
export function tonightsShortlist(
  proposals: ShortlistEntry[],
  date: Date = new Date(),
): ShortlistEntry | undefined {
  const pool = [
    ...SHORTLIST_THEMES.map((t) => ({
      ...t,
      source: "curated" as const,
      proposalId: null,
      proposedBy: null,
    })),
    ...proposals,
  ];
  return pickTonightsEntry(pool, weeksSinceUtcEpoch(date));
}

/** Shared anon client for public reads (RLS-scoped); null when unconfigured. */
function anonDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ponytail: anon client + unstable_cache; per-proposal cache tags only if approval needs instant rotation
export const getApprovedProposals = unstable_cache(
  async (): Promise<ShortlistEntry[]> => {
    const db = anonDb();
    if (!db) return [];
    try {
      // Anon read relies on RLS "anyone reads approved"; failures degrade to
      // curated-only (e.g. schema not yet re-run on live DB).
      const { data } = await db
        .from("shortlist_proposals")
        .select("id,title,blurb,movie_ids,proposer_id")
        .eq("status", "approved");
      const rows = (data ?? []) as Record<string, unknown>[];
      // Credit handles: one batched lookup of proposer profiles; only PUBLIC
      // profiles surface (missing/private -> no credit). Failures omit credit.
      let handles = new Map<string, string>();
      const proposerIds = [
        ...new Set(
          rows.map((r) => r.proposer_id).filter((v): v is string => typeof v === "string"),
        ),
      ];
      if (proposerIds.length > 0) {
        const { data: profs } = await db
          .from("profiles")
          .select("id,handle")
          .in("id", proposerIds)
          .eq("visibility", "public");
        handles = new Map(
          ((profs ?? []) as { id: string; handle: string }[]).map((p) => [p.id, p.handle]),
        );
      }
      return rows
        .filter((r) => Array.isArray(r.movie_ids))
        .map((r) => ({
          slug: `community-${String(r.id)}`,
          title: String(r.title),
          blurb: r.blurb ? String(r.blurb) : "",
          movieIds: (r.movie_ids as unknown[]).filter(
            (v): v is number => Number.isInteger(v),
          ),
          source: "community" as const,
          proposalId: String(r.id),
          proposedBy:
            typeof r.proposer_id === "string"
              ? (handles.get(r.proposer_id) ?? null)
              : null,
        }));
    } catch {
      return [];
    }
  },
  ["approved-shortlist-proposals"],
  { revalidate: 3600 },
);

// --- Community activity on this week's theme ---

export const MIN_THEME_OVERLAP = 3;
export const MAX_THEMED_PREVIEWS = 5;

/** True when the distinct ids of listMovieIds share >= minOverlap with the theme set. */
export function overlapsTheme(
  listMovieIds: number[],
  themeMovieIds: number[],
  minOverlap: number = MIN_THEME_OVERLAP,
): boolean {
  const theme = new Set(themeMovieIds);
  const seen = new Set<number>();
  let n = 0;
  for (const id of listMovieIds) {
    if (!theme.has(id) || seen.has(id)) continue;
    seen.add(id);
    if (++n >= minOverlap) return true;
  }
  return false;
}

export interface CommunityListPreview {
  id: string;
  title: string;
}

export interface ThemeCommunityActivity {
  /** Total matching done lists (not capped at the preview count). */
  count: number;
  previews: CommunityListPreview[];
}

const EMPTY_ACTIVITY: ThemeCommunityActivity = { count: 0, previews: [] };

// ponytail: full scan of done lists in JS; move overlap counting into SQL if the done-list table grows past a few thousand rows
export const getThemeCommunityActivity = unstable_cache(
  async (themeMovieIds: number[]): Promise<ThemeCommunityActivity> => {
    const db = anonDb();
    if (!db || themeMovieIds.length === 0) return EMPTY_ACTIVITY;
    try {
      // RLS already scopes this to done + unlisted/public lists.
      const { data } = await db
        .from("lists")
        .select("id,title,list_movies(tmdb_id)")
        .eq("status", "done")
        .in("visibility", ["unlisted", "public"]);
      const matches = (
        (data ?? []) as unknown[]
      ).map((row): CommunityListPreview & { ids: number[] } | null => {
        const l = row as Record<string, unknown>;
        if (!l || typeof l.id !== "string" || typeof l.title !== "string") return null;
        const movies = Array.isArray(l.list_movies)
          ? (l.list_movies as { tmdb_id?: unknown }[])
          : [];
        return {
          id: l.id,
          title: l.title,
          ids: movies.filter((m) => Number.isInteger(m.tmdb_id)).map((m) => m.tmdb_id as number),
        };
      });
      const themed = matches.filter(
        (m): m is NonNullable<typeof m> => m !== null && overlapsTheme(m.ids, themeMovieIds),
      );
      return {
        count: themed.length,
        previews: themed.slice(0, MAX_THEMED_PREVIEWS).map(({ id, title }) => ({ id, title })),
      };
    } catch {
      // Degrade silently: no stats, no previews, no fake social proof.
      return EMPTY_ACTIVITY;
    }
  },
  ["theme-community-activity"],
  { revalidate: 300 },
);

export interface TonightsShortlist {
  theme: ShortlistEntry;
  movieIds: number[];
  /** Done lists overlapping this week's theme (stats line + preview row). */
  activity: ThemeCommunityActivity;
}

export async function getTonightsShortlist(): Promise<TonightsShortlist> {
  const theme = tonightsShortlist(await getApprovedProposals());
  if (!theme) throw new Error("shortlist theme catalog is empty");
  const movieIds = theme.movieIds;
  const activity = await getThemeCommunityActivity(movieIds);
  return { theme, movieIds, activity };
}
