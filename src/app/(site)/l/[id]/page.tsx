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
import { computeThemeStats, type ThemeRoom } from "@/lib/theme-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DbList {
  id: string;
  title: string;
  description: string | null;
  participants: string[];
  status: string;
  owner_id: string;
  theme_slug: string | null;
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
    .select("id,title,description,participants,status,owner_id,theme_slug")
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

  // Community Verdict: aggregate every done room sharing this theme. RLS keeps
  // private rooms out; one query fetches rooms + their movies together.
  let stats: ReturnType<typeof computeThemeStats> | null = null;
  if (list.theme_slug && list.status === "done") {
    const { data: themed } = await supabase
      .from("lists")
      .select("id,list_movies(tmdb_id,title,poster_path,elo,parked,final_rank)")
      .eq("theme_slug", list.theme_slug)
      .eq("status", "done");
    const rooms: ThemeRoom[] = ((themed ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      movies: ((Array.isArray(r.list_movies) ? r.list_movies : []) as Record<string, unknown>[]).map(
        (mv) => ({
          tmdbId: mv.tmdb_id as number,
          title: mv.title as string,
          posterPath: (mv.poster_path as string | null) ?? null,
          elo: mv.elo as number,
          parked: Boolean(mv.parked),
          finalRank: (mv.final_rank as number | null) ?? null,
        }),
      ),
    }));
    stats = computeThemeStats(rooms);
  }
  const pct = (x: number) => `${Math.round(x * 100)}%`;

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

      {list.theme_slug && list.status === "done" && stats !== null && stats.rooms >= 1 && (
        <section aria-label="Community verdict" className="mt-10">
          {stats.rooms >= 2 ? (
            <>
              <MarqueeHeading as="h2">Community Verdict</MarqueeHeading>
              <p className="mt-1 text-sm text-muted">
                {stats.rooms} rooms ranked tonight&apos;s theme so far.
              </p>
              {stats.championId !== null && (() => {
                const champ = stats.movies.find((m) => m.tmdbId === stats!.championId)!;
                return (
                  <div className="mt-4 rounded bg-surface px-4 py-3 ring-1 ring-gold/40">
                    <p className="text-sm text-muted">
                      <span className="font-bold uppercase tracking-wide text-gold">
                        Undisputed champion
                      </span>{" "}
                      — <span className="font-medium text-text">{champ.title}</span>, #1 in all{" "}
                      {champ.appearances} rooms.
                    </p>
                  </div>
                );
              })()}
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {stats.movies.map((m) => {
                  const divisive = m.tmdbId === stats!.mostDivisiveId;
                  return (
                    <li key={m.tmdbId} className="rounded bg-surface p-3 ring-1 ring-white/10">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium text-text">
                          {m.title}
                        </span>
                        <span className="shrink-0 font-mono text-sm text-gold">
                          {pct(m.pctRankedFirst)} #1
                        </span>
                      </div>
                      {/* Gold bar on surface; static width, no motion needed. */}
                      <div className="mt-1.5 h-1.5 rounded bg-white/10">
                        <div
                          className="h-1.5 rounded bg-gold"
                          style={{ width: pct(m.pctRankedFirst) }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                        <span>{pct(m.pctHaventSeen)} haven&apos;t seen</span>
                        {divisive && (
                          <span className="uppercase tracking-wide text-accent">Most divisive</span>
                        )}
                      </div>
                      <div className="mt-1 h-1.5 rounded bg-white/10">
                        <div
                          className="h-1.5 rounded bg-gold/40"
                          style={{ width: pct(m.pctHaventSeen) }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-center text-sm italic text-muted">
              First ranking of tonight&apos;s list — the verdict awaits more rooms.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
