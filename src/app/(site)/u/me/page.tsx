import Link from "next/link";
import { redirect } from "next/navigation";
import ListCard, { type ListCardData } from "@/components/profile/ListCard";
import MarqueeHeading from "@/components/MarqueeHeading";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DbList {
  id: string;
  title: string;
  status: string;
  created_at: string;
  list_movies: { title: string; poster_path: string | null; tmdb_id?: number }[] | null;
}

export default async function MyListsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  // RLS scopes rows to the owner. Top posters: final_rank first (done lists),
  // then elo desc (drafts).
  const { data: lists } = await supabase
    .from("lists")
    .select("id,title,status,created_at,list_movies(title,poster_path,tmdb_id)")
    .order("created_at", { ascending: false })
    .order("final_rank", { foreignTable: "list_movies", ascending: true, nullsFirst: false })
    .order("elo", { foreignTable: "list_movies", ascending: false });

  const cards: ListCardData[] = ((lists ?? []) as DbList[]).map((l) => ({
    id: l.id,
    title: l.title,
    status: l.status === "done" ? "done" : "draft",
    createdAt: l.created_at,
    posters: (l.list_movies ?? []).map((m) => ({
      title: m.title,
      posterPath: m.poster_path,
    })),
    // Best-first (ordered by final_rank/elo in the query); proposals use top 8.
    movieIds: (l.list_movies ?? [])
      .map((m) => m.tmdb_id)
      .filter((v): v is number => Number.isInteger(v)),
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>Your lists</MarqueeHeading>
      {cards.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {cards.length} {cards.length === 1 ? "list" : "lists"} ·{" "}
          {cards.filter((c) => c.status === "draft").length} in progress
        </p>
      )}

      {cards.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded bg-surface p-8 text-center ring-1 ring-white/10">
          <p className="text-sm text-muted">Your trophy shelf is empty — rank something.</p>
          <Link
            href="/"
            className="min-h-11 rounded bg-accent px-5 leading-[44px] font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Start ranking
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((list) => (
            <li key={list.id}>
              <ListCard list={list} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
