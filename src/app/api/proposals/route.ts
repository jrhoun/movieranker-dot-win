import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse, invalid } from "@/lib/lists-api";
import { parseProposal } from "@/lib/proposals-api";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: Parameters<typeof parseProposal>[0];
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  const parsed = parseProposal(body);
  if (!parsed.ok) return invalid(parsed.error);

  const id = nanoid(10);
  const { error } = await supabase.from("shortlist_proposals").insert({
    id,
    proposer_id: data.user.id,
    title: parsed.value.title,
    blurb: parsed.value.blurb || null,
    movie_ids: parsed.value.movieIds,
    status: "pending",
  });
  if (error) return dbErrorResponse(error);

  return NextResponse.json({ id }, { status: 201 });
}
