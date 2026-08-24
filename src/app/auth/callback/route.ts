import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Back to /r/play so a mid-game sign-in resumes the anonymous session.
    if (!error) return NextResponse.redirect(`${origin}/r/play`);
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
