import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignInLink from "@/components/SignInLink";
import IdentityDropdown from "@/components/IdentityDropdown";

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
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", data.user.id)
      .maybeSingle<{ handle: string | null }>();
    handle = profile?.handle ?? null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gold/20 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-1">
        {/* Marquee wordmark: Bebas caps, letterspaced, gold ✦. */}
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 px-1 font-display text-xl uppercase tracking-widest text-text transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span aria-hidden="true" className="text-gold">✦</span>
          <span>MovieRanker</span>
        </Link>
        <nav aria-label="Site Navigation" className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/updates"
            className="flex min-h-9 items-center px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Updates
          </Link>
          {data.user ? (
            <IdentityDropdown handle={handle} signOut={signOut} />
          ) : (
            <SignInLink className="flex min-h-9 items-center rounded-full border border-gold/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold transition-colors duration-200 ease-out hover:bg-gold hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" />
          )}
        </nav>
      </div>
    </header>
  );
}
