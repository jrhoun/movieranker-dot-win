import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse, invalid } from "@/lib/lists-api";
import { isOwnerEmail, parseProposalStatus } from "@/lib/proposals-api";

/**
 * OWNER_EMAIL-gated admin API for shortlist proposals. Unset/mismatched
 * owner -> 404-style silence (feature has no approver).
 */
async function requireOwner(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return isOwnerEmail(data.user?.email ?? null);
}

export async function GET() {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("shortlist_proposals")
    .select("id,title,blurb,movie_ids,status,created_at")
    .order("created_at", { ascending: false });
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ proposals: data ?? [] });
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
