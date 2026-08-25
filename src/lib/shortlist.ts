import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SHORTLIST_THEMES, type ShortlistTheme } from "./shortlist-themes";

/**
 * Tonight's Shortlist: a themed strip on the home page that rotates once per
 * UTC day. The rotation is a pure function of the date — every visitor sees
 * the same theme with no cron or per-user state.
 */

export type ShortlistEntry = ShortlistTheme & {
  source: "curated" | "community";
};

/** Whole UTC days since 1970-01-01 — stable regardless of local timezone. */
export function daysSinceUtcEpoch(date: Date = new Date()): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

/** Deterministic pick: pool[dayIndex % pool.length] (undefined for empty pool). */
export function pickTonightsEntry<T>(pool: T[], dayIndex: number): T | undefined {
  if (pool.length === 0) return undefined;
  return pool[((dayIndex % pool.length) + pool.length) % pool.length];
}

/** Curated themes first, approved community proposals appended. Pure. */
export function tonightsShortlist(
  proposals: ShortlistEntry[],
  date: Date = new Date(),
): ShortlistEntry | undefined {
  const pool = [
    ...SHORTLIST_THEMES.map((t) => ({ ...t, source: "curated" as const })),
    ...proposals,
  ];
  return pickTonightsEntry(pool, daysSinceUtcEpoch(date));
}

// ponytail: anon client + unstable_cache; per-proposal cache tags only if approval needs instant rotation
export const getApprovedProposals = unstable_cache(
  async (): Promise<ShortlistEntry[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    try {
      // Anon read relies on RLS "anyone reads approved"; failures degrade to
      // curated-only (e.g. schema not yet re-run on live DB).
      const db = createClient(url, key);
      const { data } = await db
        .from("shortlist_proposals")
        .select("id,title,blurb,movie_ids")
        .eq("status", "approved");
      return ((data ?? []) as Record<string, unknown>[])
        .filter((r) => Array.isArray(r.movie_ids))
        .map((r) => ({
          slug: `community-${String(r.id)}`,
          title: String(r.title),
          blurb: r.blurb ? String(r.blurb) : "",
          movieIds: (r.movie_ids as unknown[]).filter(
            (v): v is number => Number.isInteger(v),
          ),
          source: "community" as const,
        }));
    } catch {
      return [];
    }
  },
  ["approved-shortlist-proposals"],
  { revalidate: 3600 },
);

export interface TonightsShortlist {
  theme: ShortlistEntry;
  movieIds: number[];
}

export async function getTonightsShortlist(): Promise<TonightsShortlist> {
  const theme = tonightsShortlist(await getApprovedProposals());
  if (!theme) throw new Error("shortlist theme catalog is empty");
  return { theme, movieIds: theme.movieIds };
}
