import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse } from "@/lib/lists-api";
import { LIMITS, rateKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

interface DbListUpvoteRow {
  id: string;
  owner_id: string;
  status: string;
  visibility: string;
  upvotes_count: number | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("id,owner_id,status,visibility,upvotes_count")
    .eq("id", id)
    .maybeSingle<DbListUpvoteRow>();

  if (listError) return dbErrorResponse(listError);

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  const isOwner = user !== null && list !== null && list.owner_id === user.id;
  const isReadable =
    list !== null && (isOwner || (list.status === "done" && (list.visibility === "public" || list.visibility === "unlisted")));

  if (!list || !isReadable) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  let hasUpvoted = false;
  if (user) {
    const { data: upvote } = await supabase
      .from("list_upvotes")
      .select("id")
      .eq("list_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    hasUpvoted = !!upvote;
  }

  const count = list.upvotes_count ?? 0;

  return NextResponse.json({
    upvotesCount: count,
    hasUpvoted,
    count,
    userUpvoted: hasUpvoted,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rl = rateLimit(await rateKey("upvote", request, user.id), LIMITS.upvote);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("id,owner_id,status,visibility,upvotes_count")
    .eq("id", id)
    .maybeSingle<DbListUpvoteRow>();

  if (listError) return dbErrorResponse(listError);

  const isOwner = list !== null && list.owner_id === user.id;
  const isReadable =
    list !== null && (isOwner || (list.status === "done" && (list.visibility === "public" || list.visibility === "unlisted")));

  if (!list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  if (!isReadable) {
    return NextResponse.json(
      { error: "cannot upvote draft or private list" },
      { status: 403 },
    );
  }

  // Check if upvote already exists
  const { data: existing, error: findError } = await supabase
    .from("list_upvotes")
    .select("id")
    .eq("list_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) return dbErrorResponse(findError);

  let hasUpvoted = false;
  let newCount = list.upvotes_count ?? 0;

  if (existing) {
    // Remove upvote
    const { error: deleteError } = await supabase
      .from("list_upvotes")
      .delete()
      .eq("list_id", id)
      .eq("user_id", user.id);

    if (deleteError) return dbErrorResponse(deleteError);
    hasUpvoted = false;
    newCount = Math.max(0, newCount - 1);
  } else {
    // Insert upvote
    const { error: insertError } = await supabase
      .from("list_upvotes")
      .insert({ list_id: id, user_id: user.id });

    if (insertError) return dbErrorResponse(insertError);
    hasUpvoted = true;
    newCount = newCount + 1;
  }

  return NextResponse.json({
    upvotesCount: newCount,
    hasUpvoted,
    count: newCount,
    userUpvoted: hasUpvoted,
  });
}
