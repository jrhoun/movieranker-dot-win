import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignInLink from "@/components/SignInLink";
import NavLink from "@/components/NavLink";
import IdentityDropdown from "@/components/IdentityDropdown";

// Premiere Night header (DESIGN.md): translucent dark bar over the hero curtain,
// thin gold rule, Geist uppercase links with gold hover underline (200ms ease-out).
const linkCls =
  "flex min-h-11 items-center px-3 text-sm font-medium uppercase tracking-wide text-text decoration-gold decoration-2 underline-offset-4 transition duration-200 ease-out hover:text-gold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

async function signOut() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // Claimed handle + visibility (if any) for the identity dropdown.
  let handle: string | null = null;
  let profileHref = "/u/me";
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle,visibility")
      .eq("id", data.user.id)
      .maybeSingle<{ handle: string | null; visibility: string | null }>();
    handle = profile?.handle ?? null;
    if (handle && profile?.visibility === "public") profileHref = `/u/${handle}`;
  }

  return (
    <header className="border-b border-gold/20 bg-bg/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-1.5">
        {/* Marquee wordmark: Bebas caps, letterspaced, gold ✦. */}
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 px-1 font-display text-xl uppercase tracking-widest text-text transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span aria-hidden="true" className="text-gold">✦</span>
          movieranker
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1">
          {/* Signed out: gold sign-in. Signed in pre-claim: plain My Lists link.
              Claimed: @handle identity dropdown. */}
          {data.user ? (
            handle ? (
              <IdentityDropdown handle={handle} profileHref={profileHref} signOut={signOut} />
            ) : (
              <NavLink href="/u/me" className={linkCls}>
                My Lists
              </NavLink>
            )
          ) : (
            <SignInLink className={linkCls} />
          )}
        </nav>
      </div>
    </header>
  );
}
