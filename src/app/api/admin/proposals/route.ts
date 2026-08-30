import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse, invalid } from "@/lib/lists-api";
import { isOwnerEmail, parseProposalStatus } from "@/lib/proposals-api";
import { getMovieById } from "@/lib/tmdb";
import { marqueeNumber, weeksSinceUtcEpoch } from "@/lib/shortlist";

/**
 * OWNER_EMAIL-gated admin API for shortlist proposals. Unset/mismatched
 * owner -> 404-style silence (feature has no approver).
 */
async function requireOwner(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return isOwnerEmail(data.user?.email ?? null);
}

interface ProposalRow {
  id: string;
  title: string;
  blurb: string | null;
  movie_ids: number[];
  status: string;
  created_at: string;
  proposer_id: string | null;
  scheduled_week?: number | null;
}

export async function GET() {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });
  const supabase = await createSupabaseServerClient();
  // scheduled_week arrives with upgrade-3.sql. PostgREST errors on a column
  // that does not exist rather than returning null, so this retries without
  // it — the admin screen keeps working before the migration is run, showing
  // everything as unscheduled.
  const cols = "id,title,blurb,movie_ids,status,created_at,proposer_id";
  const read = async (withWeek: boolean) =>
    supabase
      .from("shortlist_proposals")
      .select(withWeek ? `${cols},scheduled_week` : cols)
      .order("created_at", { ascending: false });

  const first = await read(true);
  const scheduling = !first.error;
  const result = scheduling ? first : await read(false);
  if (result.error) return dbErrorResponse(result.error);
  const rows = (result.data ?? []) as unknown as ProposalRow[];

  /**
   * Resolve the films.
   *
   * The queue used to render `movie_ids.join(", ")` — the approver was shown
   * "155, 550, 27205" and asked to judge a shortlist from it, which is not a
   * decision anyone can actually make. Titles are the entire content of a
   * proposal.
   *
   * Deduped across proposals so a film in several of them is fetched once;
   * `getMovieById` is cached a day and returns null rather than throwing, so a
   * dead id or a TMDB outage degrades to showing the bare id for that one film
   * instead of taking down the whole queue. The owner must always be able to
   * act.
   */
  const ids = [...new Set(rows.flatMap((r) => r.movie_ids ?? []))];
  const films = new Map(
    (await Promise.all(ids.map(async (id) => [id, await getMovieById(id)] as const)))
      .filter((entry): entry is [number, NonNullable<Awaited<ReturnType<typeof getMovieById>>>] =>
        entry[1] !== null,
      ),
  );

  // Proposer handles, so a decision is not made about an anonymous row. Only
  // PUBLIC profiles surface, matching how credit is shown on the site itself.
  const proposerIds = [...new Set(rows.map((r) => r.proposer_id).filter((v): v is string => !!v))];
  const handles = new Map<string, string>();
  if (proposerIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,handle")
      .in("id", proposerIds)
      .eq("visibility", "public");
    for (const p of (profs ?? []) as { id: string; handle: string | null }[]) {
      if (p.handle) handles.set(p.id, p.handle);
    }
  }

  return NextResponse.json({
    // The week the marquee is on right now, so the client can label a
    // scheduled week as "Marquee 6" rather than the raw 2956 the rotation
    // actually runs on — that number reads as noise to a human.
    currentWeek: weeksSinceUtcEpoch(),
    currentMarqueeNumber: marqueeNumber(),
    // False until upgrade-3.sql has been run; the UI hides scheduling rather
    // than offering a control that cannot work.
    scheduling,
    proposals: rows.map((r) => ({
      id: r.id,
      title: r.title,
      blurb: r.blurb,
      status: r.status,
      createdAt: r.created_at,
      proposerHandle: r.proposer_id ? (handles.get(r.proposer_id) ?? null) : null,
      scheduledWeek: typeof r.scheduled_week === "number" ? r.scheduled_week : null,
      films: (r.movie_ids ?? []).map((id) => ({
        tmdbId: id,
        title: films.get(id)?.title ?? null,
        posterPath: films.get(id)?.posterPath ?? null,
      })),
    })),
  });
}

export async function PATCH(request: Request) {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });

  let body: { id?: unknown; status?: unknown; scheduledWeek?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return invalid("id required");

  const supabase = await createSupabaseServerClient();

  /**
   * Scheduling is a SEPARATE act from approving, and this route keeps them
   * separate. Approving is a judgement about a theme's quality; scheduling
   * decides which week it takes over the marquee. Collapsing the two is what
   * used to let an approval silently change the theme already on screen.
   *
   * `scheduledWeek: null` unschedules — the proposal stays approved and simply
   * stops claiming a week.
   */
  if (body.scheduledWeek !== undefined) {
    const week = body.scheduledWeek;
    if (week !== null && (typeof week !== "number" || !Number.isInteger(week) || week < 0)) {
      return invalid("scheduledWeek must be a non-negative integer or null");
    }
    if (week !== null && week < weeksSinceUtcEpoch()) {
      // The past cannot be rescheduled, and letting someone try produces a
      // theme that never runs and an index slot that looks taken.
      return invalid("that week has already passed");
    }
    const { error } = await supabase
      .from("shortlist_proposals")
      .update({ scheduled_week: week })
      .eq("id", id);
    if (error) {
      // One theme per week is enforced by a partial unique index, so picking a
      // week another proposal already holds is an ordinary thing to do and a
      // 23505 is the expected answer. Without this it reaches the owner as a
      // 500 carrying a raw "duplicate key value violates unique constraint"
      // string — an opaque failure on a routine action.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Another theme is already scheduled for that week." },
          { status: 409 },
        );
      }
      return dbErrorResponse(error);
    }
    return NextResponse.json({ ok: true });
  }

  const status = parseProposalStatus(body.status);
  if (!status)
    return invalid("status ('approved'|'rejected'|'pending') or scheduledWeek required");

  // Un-approving must release the week too, or a rejected theme keeps a slot
  // no other proposal can take (the unique index makes that permanent).
  const patch: Record<string, unknown> =
    status === "approved" ? { status } : { status, scheduled_week: null };

  const { error } = await supabase.from("shortlist_proposals").update(patch).eq("id", id);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ ok: true });
}
