import { NextResponse } from "next/server";
import type { ResumedList } from "./session";

/** Partial movie payload accepted by POST /api/lists (title required there) and PATCH. */
export interface MovieInput {
  tmdbId: number;
  title?: string;
  posterPath?: string | null;
  releaseYear?: number | null;
  elo?: number;
  comparisons?: number;
  parked?: boolean;
  finalRank?: number | null;
}

type DbError = { code?: string | null; message: string };

/** Map a Supabase/PostgREST error to a response: RLS denial -> 403, anything else -> 500. */
export function dbErrorResponse(error: DbError) {
  const forbidden = error.code === "42501" || /row-level security/i.test(error.message);
  return NextResponse.json(
    { error: forbidden ? "forbidden" : error.message },
    { status: forbidden ? 403 : 500 },
  );
}

export function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Returns the list id if visible+owned by the caller (RLS hides other owners'
 * rows), else null. Used as an ownership precheck for PATCH/DELETE.
 */
export async function ownedListId(
  // ponytail: real Supabase generics explode TS inference; loose type keeps mocks simple too
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any },
  id: string,
): Promise<string | null> {
  const { data } = await supabase.from("lists").select("id").eq("id", id);
  return data?.[0]?.id ?? null;
}

/**
 * Owner-only draft fetch for /r/play?id=... RLS hides other owners' rows, so a
 * non-owner or missing id both yield null. Only drafts are resumable.
 */
export async function fetchResumableList(
  // ponytail: real Supabase generics explode TS inference; loose type keeps mocks simple too
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any },
  id: string,
): Promise<ResumedList | null> {
  const { data: list } = await supabase
    .from("lists")
    .select("title,participants,status")
    .eq("id", id)
    .single();
  if (!list || list.status !== "draft") return null;

  const { data: rows } = await supabase
    .from("list_movies")
    .select("tmdb_id,title,poster_path,release_year,elo,comparisons,parked")
    .eq("list_id", id);
  const movies = ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    tmdbId: r.tmdb_id as number,
    title: r.title as string,
    posterPath: (r.poster_path as string | null) ?? null,
    releaseYear: (r.release_year as number | null) ?? null,
    elo: r.elo as number,
    comparisons: r.comparisons as number,
    parked: Boolean(r.parked),
  }));
  return {
    id,
    title: list.title as string,
    participants: (list.participants as string[] | null) ?? [],
    status: list.status as "draft" | "done",
    movies,
  };
}

/** Full list_movies row shape for inserts (POST, PATCH additions). */
export function fullMovieRow(m: MovieInput, listId: string) {
  return {
    list_id: listId,
    tmdb_id: m.tmdbId,
    title: m.title!,
    poster_path: m.posterPath ?? null,
    release_year: m.releaseYear ?? null,
    elo: m.elo ?? 1000,
    comparisons: m.comparisons ?? 0,
    parked: m.parked ?? false,
    final_rank: m.finalRank ?? null,
  };
}
