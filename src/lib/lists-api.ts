import { NextResponse } from "next/server";

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
