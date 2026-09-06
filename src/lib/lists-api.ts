import { NextResponse } from "next/server";
import type { ResumedList } from "./session";

/** Partial movie payload accepted by POST /api/lists (title required there) and PATCH. */
export interface MovieInput {
  tmdbId: number;
  title?: string;
  posterPath?: string | null;
  releaseYear?: number | null;
  tagline?: string | null;
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

/** Optional list description accepted by POST/PATCH /api/lists. */
export type DescriptionResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/** Trimmed optional description (<=1000 chars, empty -> null) or a 400 message. */
export function parseDescription(raw: unknown): DescriptionResult {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "string")
    return { ok: false, error: "description must be a string" };
  const trimmed = raw.trim();
  if (trimmed.length > 1000)
    return { ok: false, error: "description must be at most 1000 characters" };
  return { ok: true, value: trimmed === "" ? null : trimmed };
}

export type Visibility = "unlisted" | "public" | "private";

/** Optional list visibility; defaults to 'unlisted'. */
export function parseVisibility(
  raw: unknown,
): { ok: true; value: Visibility } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true, value: "unlisted" };
  if (raw === "unlisted" || raw === "public" || raw === "private")
    return { ok: true, value: raw };
  return { ok: false, error: "visibility must be 'unlisted', 'public' or 'private'" };
}

const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;

export interface ThemeMeta {
  themeSlug: string | null;
  curated: boolean;
}

/** Optional curated-theme metadata; curated requires a themeSlug. */
export function parseThemeMeta(body: {
  themeSlug?: unknown;
  curated?: unknown;
}): { ok: true; value: ThemeMeta } | { ok: false; error: string } {
  const { themeSlug, curated } = body;
  if (curated !== undefined && typeof curated !== "boolean")
    return { ok: false, error: "curated must be a boolean" };
  if (themeSlug === undefined || themeSlug === null) {
    if (curated)
      return { ok: false, error: "curated is only valid alongside themeSlug" };
    return { ok: true, value: { themeSlug: null, curated: false } };
  }
  if (
    typeof themeSlug !== "string" ||
    themeSlug.length > 80 ||
    !SLUG_RE.test(themeSlug)
  )
    return {
      ok: false,
      error: "themeSlug must be a slug-safe string of at most 80 characters",
    };
  return { ok: true, value: { themeSlug, curated: curated ?? false } };
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
    .select("tmdb_id,title,poster_path,release_year,tagline,elo,comparisons,parked")
    .eq("list_id", id);
  const movies = ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    tmdbId: r.tmdb_id as number,
    title: r.title as string,
    posterPath: (r.poster_path as string | null) ?? null,
    releaseYear: (r.release_year as number | null) ?? null,
    tagline: (r.tagline as string | null) ?? null,
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
    tagline: m.tagline ?? null,
    elo: m.elo ?? 1000,
    comparisons: m.comparisons ?? 0,
    parked: m.parked ?? false,
    final_rank: m.finalRank ?? null,
  };
}
