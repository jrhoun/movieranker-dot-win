import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { track } from "@vercel/analytics/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // Back to where sign-in started (mid-game save passes ?next=/r/play).
    if (!error) {
      // This callback serves returning sign-ins too. Count a signup only when
      // the account was created moments ago, so the funnel metric stays honest.
      const createdAt = data?.user?.created_at ? Date.parse(data.user.created_at) : NaN;
      const isNewUser = Number.isFinite(createdAt) && Date.now() - createdAt < 5 * 60_000;
      if (isNewUser) {
        const provider = (data?.user?.app_metadata?.provider as string) || "google";
        try {
          await track("signup_completed", { provider }, { headers: request.headers });
        } catch {
          // Analytics failure must never block authentication redirect.
        }
      }
      return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
    }
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
