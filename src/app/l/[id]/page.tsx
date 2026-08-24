import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ListViews from "@/components/list/ListViews";
import OwnerControls from "@/components/list/OwnerControls";
import ShareButton from "@/components/ShareButton";
import { withRanks, type ListMovieRow } from "@/lib/list-view";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DbList {
  id: string;
  title: string;
  participants: string[];
  status: string;
  owner_id: string;
}

interface DbMovie {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: number | null;
  comparisons: number;
  final_rank: number | null;
}

async function shareUrl(listId: string): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (base) return `${base.replace(/\/+$/, "")}/l/${listId}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "movieranker.win";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/l/${listId}`;
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // RLS: public sees only status='done'; owners also see their drafts.
  const { data: list } = await supabase
    .from("lists")
    .select("id,title,participants,status,owner_id")
    .eq("id", id)
    .maybeSingle<DbList>();

  const user = (await supabase.auth.getUser()).data.user;
  const isOwner = !!user && list !== null && list.owner_id === user.id;

  if (!list || (list.status !== "done" && !isOwner)) notFound();

  const { data: movies } = await supabase
    .from("list_movies")
    .select("tmdb_id,title,poster_path,release_year,comparisons,final_rank")
    .eq("list_id", id)
    .order("final_rank", { ascending: true, nullsFirst: false });

  const rows: ListMovieRow[] = (movies as DbMovie[] | null)?.map((m) => ({
    tmdbId: m.tmdb_id,
    title: m.title,
    posterPath: m.poster_path,
    releaseYear: m.release_year,
    comparisons: m.comparisons,
    finalRank: m.final_rank,
  })) ?? [];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold">{list.title}</h1>
          {list.participants.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              Ranked by {list.participants.join(", ")}
            </p>
          )}
        </div>
        <ShareButton title={list.title} url={await shareUrl(id)} />
      </header>

      {isOwner && (
        <div className="mt-6">
          <OwnerControls
            listId={id}
            title={list.title}
            participants={list.participants}
          />
        </div>
      )}

      <div className="mt-8">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted">No movies ranked yet.</p>
        ) : (
          <ListViews movies={withRanks(rows)} />
        )}
      </div>
    </main>
  );
}
