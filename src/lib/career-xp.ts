// One definition of a user's career XP.
//
// WHY THIS FILE EXISTS: four places used to compute it independently and none
// of them agreed. The profile counted draft lists and referrals; the completion
// card counted finished lists and no referrals, so the two disagreed minutes
// apart; the two API gates ran a third variant. Anything that needs a career
// total now maps rows through `toXpLists` so the shape of the answer is fixed
// in one place.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bankedCareerXp,
  calculateXpBreakdown,
  type XpBreakdown,
  type XpList,
} from "./gamification";
import { getReferralStats } from "./referrals";

/** The columns any career-XP calculation needs from a `lists` row. */
export interface CareerListRow {
  status?: string | null;
  theme_slug?: string | null;
  participants?: unknown;
  movieCount: number;
}

/**
 * Map list rows to XP inputs. Finished lists only — a list you never ranked is
 * not an accomplishment, and treating it as one meant twenty films dropped into
 * a draft paid out as if they had been sorted.
 */
export function toXpLists(rows: CareerListRow[]): XpList[] {
  return rows.map((r) => ({
    movieCount: r.movieCount,
    done: r.status === "done",
    isMarquee: typeof r.theme_slug === "string" && r.theme_slug.length > 0,
    coCurated: Array.isArray(r.participants) && r.participants.length > 0,
  }));
}

export interface CareerXp {
  breakdown: XpBreakdown;
  /** Career XP after the lifetime ratchet and the legacy-curve floor. */
  total: number;
}

/**
 * Combine freshly derived XP with the stored lifetime peak.
 *
 * The ratchet exists so deleting a list never costs you rank. The banked value
 * is priced by `bankedCareerXp`: converted from the old flat rule ONLY when it
 * is marked as having been earned under it (see the note there — converting
 * every banked value inflated levels for everyone).
 */
export function reconcileCareerXp(
  breakdown: XpBreakdown,
  bankedXp: number | undefined,
  bankedCurve?: number,
): CareerXp {
  return {
    breakdown,
    total: Math.max(breakdown.total, bankedCareerXp(bankedXp, bankedCurve)),
  };
}

/**
 * Derive career XP for a user straight from the database.
 *
 * Used by the API gates (pinning a list, proposing a theme), which have no page
 * state to work from. Pages that already hold the user's lists should map them
 * with `toXpLists` instead of paying for these queries again.
 */
export async function fetchCareerXp(
  supabase: SupabaseClient,
  userId: string,
  bankedXp?: number,
  bankedCurve?: number,
): Promise<CareerXp> {
  const [listsResult, referralStats, solvesResult] = await Promise.all([
    supabase
      .from("lists")
      .select("status,theme_slug,participants,list_movies(count)")
      .eq("owner_id", userId),
    getReferralStats(supabase, userId),
    supabase
      .from("marquee_solves")
      .select("theme_slug", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("correct", true),
  ]);

  const rows = (listsResult.data ?? []) as Record<string, unknown>[];
  const breakdown = calculateXpBreakdown({
    lists: toXpLists(
      rows.map((r) => ({
        status: r.status as string | null,
        theme_slug: r.theme_slug as string | null,
        participants: r.participants,
        // Supabase returns an aggregate count as a single-element array.
        movieCount: Array.isArray(r.list_movies)
          ? Number((r.list_movies[0] as { count?: number })?.count ?? 0)
          : 0,
      })),
    ),
    referralCount: referralStats.activeReferrals,
    connectionsSolved: solvesResult.count ?? 0,
  });

  return reconcileCareerXp(breakdown, bankedXp, bankedCurve);
}
