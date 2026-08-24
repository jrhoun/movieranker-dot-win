import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignInLink from "@/components/SignInLink";

const linkCls =
  "flex min-h-11 items-center rounded px-3 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

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
    <header className="border-b border-white/10 bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-1.5">
        <Link
          href="/"
          className={`text-sm font-bold text-accent sm:text-base ${linkCls}`}
        >
          🎬 movieranker
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1">
          {data.user ? (
            <>
              <Link href="/u/me" className={linkCls}>
                My lists
              </Link>
              <form action={signOut}>
                <button type="submit" className={linkCls}>
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
