import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dbErrorResponse, invalid } from "@/lib/lists-api";
import { isOwnerEmail } from "@/lib/proposals-api";
import { flagsFor } from "@/lib/moderation";

/**
 * Moderation over the text this site actually shows strangers.
 *
 * WHAT IS IN SCOPE, and why it is this and not more. A list is reachable by
 * anyone when it is `done` and its visibility is public or unlisted — that is
 * the same condition the "anyone reads done lists" RLS policy uses. The text
 * carried on such a list is its title, its description, and the free-text
 * participant names its owner typed. Handles are NOT here: they are already
 * refused at claim time by `checkHandle`, so the queue would only ever repeat
 * a check that already ran.
 *
 * SERVICE ROLE, for the same reason the dashboard uses it: under the owner's
 * own session `lists` returns their rows plus everyone's finished public ones,
 * which happens to be most of what is wanted here but silently omits any
 * PRIVATE list — and a list can be flipped public later. Reading the real
 * table means the queue is not quietly scoped by the reader's identity.
 *
 * THE FLAG IS A HINT, NOT A VERDICT. `isProfane` folds leetspeak and matches a
 * blocklist; it was written for handles, so on free prose it will both miss
 * things and cry wolf. It exists to sort the list, never to act on its own —
 * nothing here is automatic, and every item is shown whether flagged or not.
 */
async function requireOwner(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return isOwnerEmail(data.user?.email ?? null);
}

const PUBLICLY_READABLE = ["public", "unlisted"];

interface ListRow {
  id: string;
  title: string;
  description: string | null;
  participants: string[] | null;
  status: string;
  visibility: string | null;
  created_at: string;
  owner_id: string;
}

export async function GET() {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      available: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY is not set, so public content cannot be read.",
    });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("lists")
      .select("id,title,description,participants,status,visibility,created_at,owner_id")
      .eq("status", "done")
      .in("visibility", PUBLICLY_READABLE)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const rows = (data ?? []) as ListRow[];

    // Owner handles: who to talk to about a list, and the only identity shown.
    const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
    const handles = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profs } = await db.from("profiles").select("id,handle").in("id", ownerIds);
      for (const p of (profs ?? []) as { id: string; handle: string | null }[]) {
        if (p.handle) handles.set(p.id, p.handle);
      }
    }

    // Claimed participant names, which render on a public list alongside the
    // owner's own free-text ones.
    const { data: attrs } = await db
      .from("participant_attributions")
      .select("list_id,display_name")
      .in("list_id", rows.map((r) => r.id));
    const attrByList = new Map<string, string[]>();
    for (const a of (attrs ?? []) as { list_id: string; display_name: string }[]) {
      attrByList.set(a.list_id, [...(attrByList.get(a.list_id) ?? []), a.display_name]);
    }

    const items = rows.map((r) => {
      const participants = [...(r.participants ?? []), ...(attrByList.get(r.id) ?? [])];
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        participants,
        visibility: r.visibility,
        createdAt: r.created_at,
        ownerHandle: handles.get(r.owner_id) ?? null,
        flags: flagsFor([r.title, r.description, ...participants]),
      };
    });

    // Flagged first, then newest. The queue is meant to be worked from the top
    // and abandoned when it stops being interesting.
    items.sort((a, b) =>
      a.flags.length === b.flags.length
        ? b.createdAt.localeCompare(a.createdAt)
        : b.flags.length - a.flags.length,
    );

    return NextResponse.json({ available: true, items });
  } catch (e) {
    return NextResponse.json({
      available: false,
      reason: e instanceof Error ? e.message : "Public content could not be read.",
    });
  }
}

/**
 * The only moderation action: take a list out of public view.
 *
 * Deliberately NOT a delete. The owner of that list keeps it, keeps their XP
 * and keeps their films — it simply stops being reachable by strangers, which
 * is the actual problem being solved. Reversible, so a wrong call costs a
 * click rather than someone's work.
 */
export async function PATCH(request: Request) {
  if (!(await requireOwner())) return new Response("Not Found", { status: 404 });

  let body: { listId?: unknown; visibility?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  const listId = typeof body.listId === "string" ? body.listId : "";
  const visibility = body.visibility;
  if (!listId) return invalid("listId required");
  if (visibility !== "private" && visibility !== "unlisted") {
    return invalid("visibility must be 'private' or 'unlisted'");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return invalid("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  const { error } = await supabaseAdmin()
    .from("lists")
    .update({ visibility })
    .eq("id", listId);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ ok: true });
}
