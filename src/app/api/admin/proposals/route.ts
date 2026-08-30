import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse, invalid } from "@/lib/lists-api";
import { isOwnerEmail, parseProposalStatus } from "@/lib/proposals-api";
import { getMovieById } from "@/lib/tmdb";

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
}

export async function GET() {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("shortlist_proposals")
    .select("id,title,blurb,movie_ids,status,created_at,proposer_id")
    .order("created_at", { ascending: false });
  if (error) return dbErrorResponse(error);
  const rows = (data ?? []) as ProposalRow[];

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
    proposals: rows.map((r) => ({
      id: r.id,
      title: r.title,
      blurb: r.blurb,
      status: r.status,
      createdAt: r.created_at,
      proposerHandle: r.proposer_id ? (handles.get(r.proposer_id) ?? null) : null,
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

  let body: { id?: unknown; status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  const id = typeof body.id === "string" ? body.id : "";
  const status = parseProposalStatus(body.status);
  if (!id || !status)
    return invalid("id and status ('approved'|'rejected') required");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("shortlist_proposals")
    .update({ status })
    .eq("id", id);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ ok: true });
}
