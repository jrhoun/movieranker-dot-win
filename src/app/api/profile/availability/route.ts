import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkHandle } from "@/lib/handles";

/** Live availability for the claim input: { available, reason? }. */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const raw = new URL(request.url).searchParams.get("handle") ?? "";
  const checked = checkHandle(raw);
  if (!checked.ok)
    return NextResponse.json({ available: false, reason: checked.reason });

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", checked.handle)
    .maybeSingle();

  return NextResponse.json({
    available: !data,
    ...(data ? { reason: "taken" } : {}),
  });
}
