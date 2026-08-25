import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  dbErrorResponse,
  fullMovieRow,
  invalid,
  parseDescription,
  parseThemeMeta,
  parseVisibility,
  type MovieInput,
} from "@/lib/lists-api";
import { LIMITS, rateKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

interface PostBody {
  title?: unknown;
  description?: unknown;
  participants?: unknown;
  status?: unknown;
  visibility?: unknown;
  themeSlug?: unknown;
  curated?: unknown;
  movies?: unknown;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(await rateKey("lists", request, data.user.id), LIMITS.lists);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return invalid("invalid JSON");
  }

  const { title, participants, status, movies } = body;
  if (typeof title !== "string" || !title.trim()) return invalid("title required");
  const parsed = parseDescription(body.description);
  if (!parsed.ok) return invalid(parsed.error);
  const description = parsed.value;
  if (status !== "draft" && status !== "done")
    return invalid("status must be 'draft' or 'done'");
  const visibility = parseVisibility(body.visibility);
  if (!visibility.ok) return invalid(visibility.error);
  const meta = parseThemeMeta(body);
  if (!meta.ok) return invalid(meta.error);
  if (!Array.isArray(participants) || participants.some((p) => typeof p !== "string"))
    return invalid("participants must be an array of strings");
  // Reject malformed numeric/string fields before they reach the DB insert.
  if (
    !Array.isArray(movies) ||
    movies.some((raw) => {
      if (raw === null || typeof raw !== "object") return true;
      const m = raw as MovieInput;
      return (
        !Number.isInteger(m.tmdbId) ||
        typeof m.title !== "string" ||
        (m.elo !== undefined && (typeof m.elo !== "number" || !Number.isFinite(m.elo))) ||
        (m.comparisons !== undefined && (!Number.isInteger(m.comparisons) || m.comparisons < 0)) ||
        (m.finalRank != null && !Number.isInteger(m.finalRank))
      );
    })
  )
    return invalid("movies must be objects with tmdbId and title");

  const id = nanoid(10);
  // single atomic insert via save_list RPC (schema.sql); RLS applies (invoker rights)
  const { error } = await supabase.rpc("save_list", {
    p_id: id,
    p_title: title,
    p_description: description,
    p_participants: participants,
    p_status: status,
    p_movies: (movies as MovieInput[]).map((m) => fullMovieRow(m, id)),
  });
  if (error) return dbErrorResponse(error);

  // Visibility and curated-theme metadata are follow-up owner updates so live
  // DBs only need the ALTER — no save_list signature change to re-run.
  if (visibility.value !== "unlisted") {
    const { error: visError } = await supabase
      .from("lists")
      .update({ visibility: visibility.value })
      .eq("id", id);
    if (visError) return dbErrorResponse(visError);
  }
  if (meta.value.themeSlug) {
    const { error: themeError } = await supabase
      .from("lists")
      .update({
        theme_slug: meta.value.themeSlug,
        curated: meta.value.curated,
      })
      .eq("id", id);
    if (themeError) return dbErrorResponse(themeError);
  }

  return NextResponse.json({ id }, { status: 201 });
}
