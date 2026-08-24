import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignInLink from "@/components/SignInLink";
import NavLink from "@/components/NavLink";

// Premiere Night header (DESIGN.md): translucent dark bar over the hero curtain,
// thin gold rule, Geist uppercase links with gold hover underline (200ms ease-out).
const linkCls =
  "flex min-h-11 items-center px-3 text-sm font-medium uppercase tracking-wide text-text decoration-gold decoration-2 underline-offset-4 transition duration-200 ease-out hover:text-gold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

// Sign out matches the link styling but quieter: bordered pill, no gold hover.
const quietCls =
  "flex min-h-11 items-center rounded-full border border-white/15 px-4 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:border-white/30 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

async function signOut() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

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
          {data.user ? (
            <>
              <NavLink href="/u/me" className={linkCls}>
                My lists
              </NavLink>
              <form action={signOut}>
                <button type="submit" className={quietCls}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <SignInLink className={linkCls} />
          )}
        </nav>
      </div>
    </header>
  );
}
