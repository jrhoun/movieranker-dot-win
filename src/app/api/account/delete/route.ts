import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dbErrorResponse } from "@/lib/lists-api";

// Permanently deletes the caller's account: owned lists first (RLS-scoped,
// movies cascade), then the auth user via the service-role admin API.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const userId = data.user.id;

  const { error } = await supabase.from("lists").delete().eq("owner_id", userId);
  if (error) return dbErrorResponse(error);

  const { error: adminError } = await supabaseAdmin().auth.admin.deleteUser(
    userId,
  );
  if (adminError)
    return NextResponse.json({ error: adminError.message }, { status: 500 });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true, redirect: "/?bye=1" });
}
