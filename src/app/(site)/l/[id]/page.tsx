import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import ListViews from "@/components/list/ListViews";
import MarqueeHeading from "@/components/MarqueeHeading";
import OwnerControls from "@/components/list/OwnerControls";
import ParticipantChips from "@/components/ParticipantChips";
import ShareButton from "@/components/ShareButton";
import { withRanks, type ListMovieRow } from "@/lib/list-view";
import { chipParticipants } from "@/lib/participants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DbList {
  id: string;
  title: string;
  description: string | null;
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
    .select("id,title,description,participants,status,owner_id")
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

  // Attributed participants -> chips; links only for visibility='public' profiles.
  const { data: attributions } = await supabase
    .from("participant_attributions")
    .select("display_name,user_id")
    .eq("list_id", id);
  const userIds = [...new Set((attributions ?? []).map((a) => a.user_id))];
  const { data: publicProfiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,handle")
          .in("id", userIds)
          .eq("visibility", "public")
      : { data: [] };
  const chips = chipParticipants(
    list.participants,
    attributions ?? [],
    publicProfiles ?? [],
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <MarqueeHeading>{list.title}</MarqueeHeading>
          {(list.participants.length > 0 || (attributions?.length ?? 0) > 0) && (
            <p className="mt-1 text-sm text-muted">
              Ranked by <ParticipantChips chips={chips} />
            </p>
          )}
          {list.description && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
              {list.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {list.status === "done" && (
            <Link
              href={`/compare/${id}`}
              className="flex min-h-11 items-center rounded bg-surface-raised px-5 text-sm font-medium transition-all duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Compare with a friend
            </Link>
          )}
          <ShareButton title={list.title} url={await shareUrl(id)} />
        </div>
      </header>

      {isOwner && (
        <div className="mt-6">
          <OwnerControls
            listId={id}
            title={list.title}
            description={list.description}
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
