import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invalid } from "@/lib/lists-api";
import { checkHandle } from "@/lib/handles";
import {
  LIMITS,
  rateKey,
  rateLimit,
  tooManyRequests,
} from "@/lib/rate-limit";

const VISIBILITIES = new Set(["private", "public"]);

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // No row yet -> unclaimed handle, default visibility.
  const { data } = await supabase
    .from("profiles")
    .select("handle,visibility")
    .eq("id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    handle: data?.handle ?? null,
    visibility: data?.visibility === "public" ? "public" : "private",
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(
    await rateKey("profile", request, auth.user.id),
    LIMITS.profile,
  );
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: { handle?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  if (typeof body.handle !== "string") return invalid("handle must be a string");

  const checked = checkHandle(body.handle);
  if (!checked.ok)
    return NextResponse.json(
      {
        error:
          checked.reason === "reserved"
            ? "that handle is reserved"
            : checked.reason === "profane"
              ? "handle contains inappropriate language"
              : "invalid handle (3-20 chars: letters, numbers, _ or -)",
      },
      { status: 400 },
    );

  // Upsert keyed on id: creates the row on first claim, updates only the
  // handle afterwards; existing visibility is never touched.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: auth.user.id, handle: checked.handle }, { onConflict: "id" });
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "that handle is taken" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ handle: checked.handle }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(
    await rateKey("profile", request, auth.user.id),
    LIMITS.profile,
  );
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: { visibility?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  if (
    typeof body.visibility !== "string" ||
    !VISIBILITIES.has(body.visibility)
  )
    return invalid("visibility must be 'private' or 'public'");

  // Update-only: a profiles row exists only once a handle is claimed.
  const { data, error } = await supabase
    .from("profiles")
    .update({ visibility: body.visibility })
    .eq("id", auth.user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "claim a handle first" }, { status: 409 });

  return NextResponse.json({ visibility: body.visibility });
}
