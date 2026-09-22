import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin, supabaseSecretKey } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/proposals-api";

export interface AdminFeedbackItem {
  id: string;
  created_at: string;
  category: "bug" | "idea" | "other";
  message: string;
  email: string | null;
  user_id: string | null;
  page_url: string | null;
  user_agent: string | null;
}

export type AdminFeedbackResponse =
  | { available: true; feedback: AdminFeedbackItem[] }
  | { available: false; reason: string };

/**
 * Requires an authenticated user whose email matches OWNER_EMAIL.
 * Non-owners receive a 404 response to reveal nothing about the admin endpoints.
 */
async function requireOwner(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return isOwnerEmail(data.user?.email ?? null);
}

export async function GET() {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });

  if (!supabaseSecretKey()) {
    return NextResponse.json({
      available: false,
      reason: "SUPABASE_SECRET_KEY is not set, so feedback cannot be read.",
    });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("feedback")
      .select("id, created_at, category, message, email, user_id, page_url, user_agent")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({
        available: false,
        reason: error.message,
      });
    }

    return NextResponse.json({
      available: true,
      feedback: (data ?? []) as AdminFeedbackItem[],
    });
  } catch (e) {
    return NextResponse.json({
      available: false,
      reason: e instanceof Error ? e.message : "Feedback could not be read.",
    });
  }
}

export async function DELETE(request: Request) {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });

  if (!supabaseSecretKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not set" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).id
      : null;
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "Feedback id is required" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { error } = await db.from("feedback").delete().eq("id", id.trim());
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete feedback" },
      { status: 500 },
    );
  }
}

