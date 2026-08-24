import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  dbErrorResponse,
  fullMovieRow,
  invalid,
  type MovieInput,
} from "@/lib/lists-api";

interface PostBody {
  title?: unknown;
  participants?: unknown;
  status?: unknown;
  movies?: unknown;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return invalid("invalid JSON");
  }

  const { title, participants, status, movies } = body;
  if (typeof title !== "string" || !title.trim()) return invalid("title required");
  if (status !== "draft" && status !== "done")
    return invalid("status must be 'draft' or 'done'");
  if (!Array.isArray(participants)) return invalid("participants array required");
  if (
    !Array.isArray(movies) ||
    movies.some(
      (m) =>
        m === null ||
        typeof m !== "object" ||
        !Number.isInteger((m as MovieInput).tmdbId) ||
        typeof (m as MovieInput).title !== "string",
    )
  )
    return invalid("movies must be objects with tmdbId and title");

  const id = nanoid(10);
  const { error } = await supabase.from("lists").insert({
    id,
    owner_id: data.user.id,
    title,
    participants,
    status,
  });
  if (error) return dbErrorResponse(error);

  if (movies.length > 0) {
    const { error } = await supabase
      .from("list_movies")
      .insert((movies as MovieInput[]).map((m) => fullMovieRow(m, id)));
    if (error) return dbErrorResponse(error);
  }

  return NextResponse.json({ id }, { status: 201 });
}
