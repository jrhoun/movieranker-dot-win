import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  dbErrorResponse,
  fullMovieRow,
  invalid,
  ownedListId,
  parseDescription,
  parseVisibility,
  type MovieInput,
} from "@/lib/lists-api";
import { LIMITS, rateKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

interface PatchBody {
  title?: unknown;
  description?: unknown;
  participants?: unknown;
  status?: unknown;
  visibility?: unknown;
  movies?: unknown;
}

/** Only include provided fields so PATCH stays partial. */
function moviePatchRow(m: MovieInput) {
  const row: Record<string, unknown> = {};
  if (m.title !== undefined) row.title = m.title;
  if (m.posterPath !== undefined) row.poster_path = m.posterPath;
  if (m.releaseYear !== undefined) row.release_year = m.releaseYear;
  if (m.elo !== undefined) row.elo = m.elo;
  if (m.comparisons !== undefined) row.comparisons = m.comparisons;
  if (m.parked !== undefined) row.parked = m.parked;
  if (m.finalRank !== undefined) row.final_rank = m.finalRank;
  return row;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(await rateKey("lists", request, data.user.id), LIMITS.lists);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  // RLS hides other owners' rows, so "not found" and "not yours" are the same.
  if (!(await ownedListId(supabase, id)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return invalid("invalid JSON");
  }

  const listUpdate: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim())
      return invalid("title must be a non-empty string");
    listUpdate.title = body.title;
  }
  if (body.description !== undefined) {
    const parsed = parseDescription(body.description);
    if (!parsed.ok) return invalid(parsed.error);
    listUpdate.description = parsed.value;
  }
  if (body.participants !== undefined) {
    if (!Array.isArray(body.participants))
      return invalid("participants must be an array");
    listUpdate.participants = body.participants;
  }
  if (body.status !== undefined) {
    if (body.status !== "draft" && body.status !== "done")
      return invalid("status must be 'draft' or 'done'");
    listUpdate.status = body.status;
  }
  if (body.visibility !== undefined) {
    const parsed = parseVisibility(body.visibility);
    if (!parsed.ok) return invalid(parsed.error);
    listUpdate.visibility = parsed.value;
  }

  if (Object.keys(listUpdate).length > 0) {
    const { error } = await supabase.from("lists").update(listUpdate).eq("id", id);
    if (error) return dbErrorResponse(error);
  }

  if (body.movies !== undefined) {
    if (
      !Array.isArray(body.movies) ||
      body.movies.some(
        (m) =>
          m === null ||
          typeof m !== "object" ||
          !Number.isInteger((m as MovieInput).tmdbId),
      )
    )
      return invalid("movies must be objects with tmdbId");

    const { data: existing } = await supabase
      .from("list_movies")
      .select("id,tmdb_id")
      .eq("list_id", id);
    const existingRows = ((existing ?? []) as { id: number; tmdb_id: number }[]);
    const existingByTmdb = new Map(existingRows.map((r) => [r.tmdb_id, r.id]));
    const incoming = body.movies as MovieInput[];
    const keepIds = new Set(incoming.map((m) => m.tmdbId));

    // rows removed from the list
    const staleIds = existingRows.filter((r) => !keepIds.has(r.tmdb_id)).map((r) => r.id);
    if (staleIds.length > 0) {
      const { error } = await supabase.from("list_movies").delete().in("id", staleIds);
      if (error) return dbErrorResponse(error);
    }

    const inserts: MovieInput[] = [];
    for (const m of incoming) {
      const rowId = existingByTmdb.get(m.tmdbId);
      if (rowId === undefined) {
        if (typeof m.title !== "string" || !m.title.trim())
          return invalid(`title required for new movie tmdbId ${m.tmdbId}`);
        inserts.push(m);
      } else {
        const fields = moviePatchRow(m);
        if (Object.keys(fields).length === 0) continue;
        const { error } = await supabase
          .from("list_movies")
          .update(fields)
          .eq("id", rowId);
        if (error) return dbErrorResponse(error);
      }
    }
    if (inserts.length > 0) {
      const { error } = await supabase
        .from("list_movies")
        .insert(inserts.map((m) => fullMovieRow(m, id)));
      if (error) return dbErrorResponse(error);
    }
  }

  return new Response(null, { status: 204 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(await rateKey("lists", request, data.user.id), LIMITS.lists);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  if (!(await ownedListId(supabase, id)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // movies cascade via FK on delete
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) return dbErrorResponse(error);
  return new Response(null, { status: 204 });
}
