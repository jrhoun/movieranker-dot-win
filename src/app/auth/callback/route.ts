import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { track } from "@vercel/analytics/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin, supabaseSecretKey } from "@/lib/supabase/admin";
import { resolveReferrerId } from "@/lib/referrals";
import { safeNext } from "@/lib/redirect";

/** Where a brand-new account lands when sign-in started nowhere in particular. */
const WELCOME_PATH = "/u/profile?welcome=1";

/**
 * Referral credit at account creation. `profiles.handle` is NOT NULL, so no
 * profiles row can exist before the handle is claimed; the referrer is
 * stashed in auth user metadata instead and POST /api/profile reads it back
 * when the mr_ref cookie has expired or been cleared by then.
 */
async function stashReferrer(
  request: NextRequest,
  user: { id: string; user_metadata?: Record<string, unknown> | null },
): Promise<void> {
  if (!supabaseSecretKey()) return;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const matchCookie = cookieHeader.match(/(?:^|;\s*)mr_ref=([^;]+)/);
  const refCode = matchCookie ? decodeURIComponent(matchCookie[1]) : null;
  if (!refCode) return;
  if (user.user_metadata?.referred_by) return;

  const admin = supabaseAdmin();
  const referrerId = await resolveReferrerId(admin, refCode);
  if (!referrerId || referrerId === user.id) return;

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata ?? {}), referred_by: referrerId },
  });
}

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
      let next = safeNext(searchParams.get("next"));
      if (isNewUser) {
        const provider = (data?.user?.app_metadata?.provider as string) || "google";
        try {
          await track("signup_completed", { provider }, { headers: request.headers });
        } catch {
          // Analytics failure must never block authentication redirect.
        }
        if (data?.user?.id) {
          try {
            await stashReferrer(request, data.user);
          } catch {
            // Referral credit is a bonus; losing it must never block sign-in.
          }
        }
        // A fresh account with nowhere to go lands on the claim-your-handle
        // card rather than a home page it has already seen.
        if (next === "/") next = WELCOME_PATH;
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
