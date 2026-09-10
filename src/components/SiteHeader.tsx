import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignInLink from "@/components/SignInLink";
import IdentityDropdown from "@/components/IdentityDropdown";
import BetaBadge from "@/components/BetaBadge";
import { isOwnerEmail } from "@/lib/proposals-api";
import { evaluateAchievements, type AchievementStats } from "@/lib/gamification";

async function signOut() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/?signed_out=1");
}

export default async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // Claimed handle (if any) for the identity dropdown.
  let handle: string | null = null;
  // Server-decided, same pattern as `isOwner` below: whether the Beta Test
  // Screener achievement is still open, so the header can draw a small gold
  // dot on the avatar trigger from anywhere on the site — not just the pages
  // that already point someone at the walkthrough on /u/profile#beta.
  let betaIncomplete = false;
  if (data.user) {
    const [{ data: profile }, { count: publicDoneCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("handle")
        .eq("id", data.user.id)
        .maybeSingle<{ handle: string | null }>(),
      supabase
        .from("lists")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", data.user.id)
        .eq("status", "done")
        .eq("visibility", "public"),
    ]);
    handle = profile?.handle ?? null;

    // Same derivation as the profile page: hasHandle from profiles.handle,
    // publicDoneLists from the owner's own done+public rows — passed through
    // the real `evaluateAchievements` rather than a re-typed threshold here.
    const betaStats: AchievementStats = {
      doneLists: 0,
      moviesRanked: 0,
      publicDoneLists: publicDoneCount ?? 0,
      hasHandle: Boolean(handle),
      isSignedIn: true,
    };
    betaIncomplete =
      !evaluateAchievements(betaStats).find((a) => a.key === "beta_pioneer")?.unlocked;
  }

  /**
   * Resolved on the SERVER and passed as a boolean. The owner's email must
   * never reach the client — sending it so the browser could compare would
   * publish the one address the admin gate is keyed on.
   *
   * This only hides a link. /admin's API routes each re-check the gate and
   * answer 404 to anyone else, so the link's absence is a courtesy, not the
   * security boundary.
   */
  const isOwner = isOwnerEmail(data.user?.email ?? null);

  return (
    <header className="sticky top-0 z-40 border-b border-gold/20 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-3 px-4 py-1 sm:px-6 lg:px-8">
        {/* Marquee wordmark: Bebas caps, letterspaced, gold ✦. */}
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 px-1 font-display text-xl uppercase tracking-widest text-text transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span aria-hidden="true" className="text-gold">✦</span>
          <span>MovieRanker</span>
          <BetaBadge />
        </Link>
        <nav aria-label="Site Navigation" className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/updates"
            className="flex min-h-9 items-center px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Updates
          </Link>
          {data.user ? (
            <IdentityDropdown
              handle={handle}
              signOut={signOut}
              isOwner={isOwner}
              betaIncomplete={betaIncomplete}
            />
          ) : (
            <SignInLink className="flex min-h-9 items-center rounded-full border border-gold/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold transition-colors duration-200 ease-out hover:bg-gold hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" />
          )}
        </nav>
      </div>
    </header>
  );
}
