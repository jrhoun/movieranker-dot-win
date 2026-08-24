import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const btnResume =
  "flex min-h-11 shrink-0 items-center rounded bg-surface-raised px-4 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]";

// Minimal drafts launcher; full profile page is Task 11.
export default async function MyListsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user)
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Your lists</h1>
        <p className="text-sm text-muted">Sign in to see your saved rankings.</p>
        <Link
          href="/login"
          className="min-h-11 rounded bg-accent px-5 leading-[44px] font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Sign in
        </Link>
      </main>
    );

  // RLS scopes rows to the owner.
  const { data: lists } = await supabase.from("lists").select("id,title,status");
  const all = (lists ?? []) as { id: string; title: string; status: "draft" | "done" }[];
  const drafts = all.filter((l) => l.status === "draft");
  const done = all.filter((l) => l.status === "done");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">Your lists</h1>

      {all.length === 0 && (
        <p className="mt-3 text-sm text-muted">Nothing saved yet.</p>
      )}

      {drafts.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-muted">Drafts</h2>
          <ul className="mt-2 space-y-2">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded bg-surface p-3 ring-1 ring-white/10"
              >
                <span className="min-w-0 truncate">{d.title}</span>
                <Link href={`/r/play?id=${d.id}`} className={btnResume}>
                  Resume ranking
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-muted">Finished</h2>
          <ul className="mt-2 space-y-2">
            {done.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded bg-surface p-3 ring-1 ring-white/10"
              >
                <span className="min-w-0 truncate">{d.title}</span>
                <Link href={`/l/${d.id}`} className={btnResume}>
                  View
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
