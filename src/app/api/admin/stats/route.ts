import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin, supabaseSecretKey } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/proposals-api";

/**
 * Site-wide counts for the admin dashboard.
 *
 * SERVICE ROLE, DELIBERATELY. The owner's own session cannot answer these
 * questions: `lists` carries two permissive select policies that OR together —
 * "owner all" and "anyone reads done lists" — so an owner-authenticated count
 * sees their own rows plus everyone else's FINISHED public lists, and none of
 * anybody else's drafts. A dashboard built on that would quietly under-report
 * every draft on the site and look authoritative doing it. Wrong numbers
 * presented confidently are worse than no numbers.
 *
 * The service key may not be configured (it is only otherwise needed for
 * account deletion), so a failure here reports `available: false` rather than
 * 500ing the admin page or, worse, falling back to RLS-limited counts that
 * would silently be wrong.
 */
async function requireOwner(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return isOwnerEmail(data.user?.email ?? null);
}

export async function GET() {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });

  if (!supabaseSecretKey()) {
    return NextResponse.json({
      available: false,
      reason: "SUPABASE_SECRET_KEY is not set, so site-wide counts cannot be read.",
    });
  }

  try {
    const db = supabaseAdmin();
    const count = async (
      table: string,
      apply?: (q: ReturnType<ReturnType<typeof db.from>["select"]>) => unknown,
    ): Promise<number> => {
      let q = db.from(table).select("*", { count: "exact", head: true });
      if (apply) q = apply(q) as typeof q;
      const { count: n, error } = await q;
      if (error) throw error;
      return n ?? 0;
    };

    // Accounts, not profiles: a profile row only exists once someone claims a
    // handle, so "Profiles" alone hid a signed-up user who had ranked and
    // solved but never claimed one (seen 2026-09-15). Auth users are the real
    // headcount; the beta is far below one page of them.
    const accountsPromise = db.auth.admin
      .listUsers({ page: 1, perPage: 1000 })
      .then(({ data, error }) => {
        if (error) throw error;
        return data.total ?? data.users.length;
      });
    // Distinct people who cracked a connection, next to the raw solve count.
    const solversPromise = db
      .from("marquee_solves")
      .select("user_id")
      .eq("correct", true)
      .then(({ data, error }) => {
        if (error) throw error;
        return new Set((data ?? []).map((r: { user_id: string }) => r.user_id)).size;
      });

    const [
      accounts,
      solvers,
      profiles,
      publicProfiles,
      lists,
      doneLists,
      filmsRanked,
      solves,
      pending,
      approved,
      rejected,
    ] = await Promise.all([
      accountsPromise,
      solversPromise,
      count("profiles"),
      count("profiles", (q) => q.eq("visibility", "public")),
      count("lists"),
      count("lists", (q) => q.eq("status", "done")),
      count("list_movies"),
      // The table records every attempt, including wrong guesses, so only the
      // cracked ones are a meaningful number — same filter the profile uses.
      count("marquee_solves", (q) => q.eq("correct", true)),
      count("shortlist_proposals", (q) => q.eq("status", "pending")),
      count("shortlist_proposals", (q) => q.eq("status", "approved")),
      count("shortlist_proposals", (q) => q.eq("status", "rejected")),
    ]);

    return NextResponse.json({
      available: true,
      stats: {
        accounts,
        solvers,
        profiles,
        publicProfiles,
        lists,
        doneLists,
        draftLists: Math.max(0, lists - doneLists),
        filmsRanked,
        solves,
        proposals: { pending, approved, rejected },
      },
    });
  } catch (e) {
    // Reported, never swallowed into zeroes — a dashboard of silent zeroes
    // reads as "nothing is happening" rather than "this did not load".
    return NextResponse.json({
      available: false,
      reason: e instanceof Error ? e.message : "Site-wide counts could not be read.",
    });
  }
}
