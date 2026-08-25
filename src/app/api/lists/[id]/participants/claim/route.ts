import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse, invalid } from "@/lib/lists-api";
import { LIMITS, rateKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// GET: has the caller already claimed a chip on this list?
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // RLS scopes to rows on lists the caller can read; a miss means "no claim".
  const { data: row, error } = await supabase
    .from("participant_attributions")
    .select("display_name")
    .eq("list_id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!row) return NextResponse.json({ claimed: false });
  return NextResponse.json({ claimed: true, displayName: row.display_name });
}

// POST { displayName }: attach the caller's account to a participant chip.
// Case-insensitive match against lists.participants; no match appends the name.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(await rateKey("claimParticipant", request, data.user.id), LIMITS.claimParticipant);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: { displayName?: unknown };
  try {
    body = (await request.json()) as { displayName?: unknown };
  } catch {
    return invalid("invalid JSON");
  }
  if (typeof body.displayName !== "string")
    return invalid("displayName must be a string");
  const name = body.displayName.trim();
  if (name.length === 0 || name.length > 40)
    return invalid("displayName must be 1-40 characters");

  // RLS read = list readable (drafts owner-only; done+unlisted/public by link).
  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("participants")
    .eq("id", id)
    .maybeSingle();
  if (listError) return dbErrorResponse(listError);
  if (!list) return NextResponse.json({ error: "not found" }, { status: 404 });

  const participants = (list.participants as string[] | null) ?? [];
  // Bind to the existing spelling when it matches; otherwise append fresh.
  const matched = participants.find((p) => p.toLowerCase() === name.toLowerCase());
  const displayName = matched ?? name;

  // Insert first so an already-claimed user never mutates participants.
  const { error: insertError } = await supabase
    .from("participant_attributions")
    .insert({ list_id: id, display_name: displayName, user_id: data.user.id });
  if (insertError) {
    if (insertError.code === "23505")
      return NextResponse.json({ error: "already participating" }, { status: 409 });
    return dbErrorResponse(insertError);
  }

  if (!matched) {
    const { error: updateError } = await supabase
      .from("lists")
      .update({ participants: [...participants, name] })
      .eq("id", id);
    if (updateError) return dbErrorResponse(updateError);
  }
  return new Response(null, { status: 201 });
}

// DELETE: drop own attribution; the name stays on the list.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(await rateKey("claimParticipant", request, data.user.id), LIMITS.claimParticipant);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  const { error } = await supabase
    .from("participant_attributions")
    .delete()
    .eq("list_id", id)
    .eq("user_id", data.user.id);
  if (error) return dbErrorResponse(error);
  return new Response(null, { status: 204 });
}
