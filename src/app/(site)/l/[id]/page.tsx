import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompareModal from "@/components/list/CompareModal";
import ListViews from "@/components/list/ListViews";
import MarqueeConnectionGame from "@/components/MarqueeConnectionGame";
import MarqueeHeading from "@/components/MarqueeHeading";
import OwnerControls from "@/components/list/OwnerControls";
import ParticipantChips from "@/components/ParticipantChips";
import ShareButton from "@/components/ShareButton";
import { withRanks, type ListMovieRow } from "@/lib/list-view";
import { chipParticipants } from "@/lib/participants";
import { SITE_URL } from "@/lib/site";
import { marqueeNumber } from "@/lib/shortlist";
import { getThemeConnectionGame } from "@/lib/shortlist-themes";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: list } = await supabase
    .from("lists")
    .select("title,description,status,list_movies(title,poster_path,final_rank)")
    .eq("id", id)
    .maybeSingle();

  if (!list || list.status !== "done") {
    return {
      title: "Movie Ranking | movieranker.win",
      description: "Rank movies head-to-head with pairwise voting.",
    };
  }

  const movies = (list.list_movies ?? []) as {
    title: string;
    poster_path: string | null;
    final_rank: number | null;
  }[];
  const ranked = movies
    .filter((m) => typeof m.final_rank === "number")
    .sort((a, b) => (a.final_rank ?? 0) - (b.final_rank ?? 0));
  const topMovie = ranked[0];

  const title = `${list.title} – Movie Ranking | movieranker.win`;
  const desc = topMovie
    ? `#1 Champion: ${topMovie.title}. Ranked across ${movies.length} films on MovieRanker.`
    : `Ranked list of ${movies.length} movies on MovieRanker.`;

  const ogImage = topMovie?.poster_path
    ? `https://image.tmdb.org/t/p/w780${topMovie.poster_path}`
    : undefined;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      images: ogImage
        ? [{ url: ogImage, width: 780, height: 1170, alt: topMovie?.title ?? list.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

function shareUrl(listId: string, refHandle?: string | null): string {
  const refQuery = refHandle ? `?ref=${encodeURIComponent(refHandle)}` : "";
  return `${SITE_URL}/l/${listId}${refQuery}`;
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
  const userIds = [...new Set([...(attributions ?? []).map((a) => a.user_id), list.owner_id])];
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
  const ownerProfile = (publicProfiles ?? []).find((p) => p.id === list.owner_id);
  const url = shareUrl(id, ownerProfile?.handle ?? null);

  // Top three by final rank, for the share text. Rows with a null finalRank
  // (parked films) are excluded — they hold no podium position.
  const sharePodium = rows
    .filter((r) => typeof r.finalRank === "number")
    .sort((a, b) => (a.finalRank ?? 0) - (b.finalRank ?? 0))
    .slice(0, 3)
    .map((r) => ({ title: r.title }));

  // Community Verdict: aggregate every done room sharing this theme. RLS keeps
  // private rooms out for strangers, but "owner all" would admit the viewer's own
  // private rooms — filter explicitly so every viewer computes identical stats.
  let stats: ReturnType<typeof computeThemeStats> | null = null;
  if (list.theme_slug && list.status === "done") {
    const { data: themed } = await supabase
      .from("lists")
      .select("id,list_movies(tmdb_id,title,poster_path,elo,parked,final_rank)")
      .eq("theme_slug", list.theme_slug)
      .eq("status", "done")
      .in("visibility", ["unlisted", "public"]);
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
    <main className="relative mx-auto w-full max-w-5xl lg:max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      {/* Ambient Theater Lighting Glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-full max-w-6xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(245,197,24,0.12),transparent_70%)]"
        aria-hidden="true"
      />

      <header className="relative z-30 space-y-3 rounded-2xl border border-white/5 bg-surface/60 p-5 shadow-2xl backdrop-blur-md ring-1 ring-white/5">
        {list.theme_slug && (
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold">
            <span aria-hidden="true">✦</span>
            <span>Weekly Marquee Theme</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide text-text leading-tight break-words sm:text-3xl">
              <span aria-hidden="true" className="shrink-0 text-gold">✦</span>
              <span>{list.title}</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {list.status === "done" && (
              <CompareModal listId={id} listTitle={list.title} />
            )}
            <ShareButton
              title={list.title}
              url={url}
              themeSlug={list.theme_slug}
              marqueeNumber={list.theme_slug ? marqueeNumber() : null}
              topMovies={sharePodium}
              totalMovies={rows.length}
              curatorHandle={ownerProfile?.handle ?? null}
            />
          </div>
        </div>

        {isOwner ? (
          <OwnerControls
            listId={id}
            title={list.title}
            description={list.description}
            participants={list.participants}
            isCurated={Boolean(list.theme_slug)}
            chips={chips}
          />
        ) : (
          <div>
            {(list.participants.length > 0 || (attributions?.length ?? 0) > 0) && (
              <p className="text-sm text-muted">
                Ranked by <ParticipantChips chips={chips} />
              </p>
            )}
            {list.description && (
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
                {list.description}
              </p>
            )}
          </div>
        )}
      </header>

      <div className="mt-8">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted">No movies ranked yet.</p>
        ) : (
          <ListViews movies={withRanks(rows)} />
        )}
      </div>

      {list.theme_slug && list.status === "done" && (
        <section aria-label="Marquee mystery connection" className="mt-12">
          <MarqueeConnectionGame
            themeSlug={list.theme_slug}
            themeTitle={list.title}
            game={getThemeConnectionGame({
              slug: list.theme_slug,
              title: list.title,
              blurb: list.description ?? undefined,
            })}
          />
        </section>
      )}

      {list.theme_slug && list.status === "done" && stats !== null && stats.rooms >= 1 && (
        <section aria-label="Community stats" id="community-consensus" className="mt-14 scroll-mt-6">
          <MarqueeHeading as="h2">Community Stats</MarqueeHeading>

          {stats.rooms >= 3 ? (
            <div className="mt-4 space-y-4">
              <p className="text-center text-xs text-muted sm:text-sm">
                Aggregated from {stats.rooms} rankings submitted for this week&apos;s theme.
              </p>
              <CommunityStatsGrid stats={stats} pct={pct} />
            </div>
          ) : (
            <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 p-1">
              {/* Blurred Teaser Preview */}
              <div
                className="pointer-events-none select-none p-3 filter blur-[3.5px] opacity-35"
                aria-hidden="true"
              >
                <CommunityStatsGrid stats={stats} pct={pct} />
              </div>

              {/* Glassmorphic Unlock Overlay Card */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/45 backdrop-blur-[2px]">
                <div className="max-w-md rounded-2xl border border-gold/30 bg-surface/95 p-6 shadow-2xl ring-1 ring-gold/20 backdrop-blur-md">
                  <span className="text-2xl text-gold" aria-hidden="true">
                    {stats.rooms === 1 ? "✦" : "✦✦"}
                  </span>
                  <h3 className="mt-2 font-display text-lg uppercase tracking-wider text-gold sm:text-xl">
                    {stats.rooms === 1
                      ? "First to the Marquee"
                      : "Consensus in Progress"}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                    {stats.rooms === 1
                      ? "You're the first to rank this week's theme! Community consensus and champion metrics will reveal as more moviegoers submit their lists."
                      : "Early rankings are in! Community consensus and champion metrics will reveal once the polls settle."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function CommunityStatsGrid({
  stats,
  pct,
}: {
  stats: NonNullable<ReturnType<typeof computeThemeStats>>;
  pct: (x: number) => string;
}) {
  const champ =
    stats.championId !== null
      ? stats.movies.find((m) => m.tmdbId === stats.championId)
      : stats.movies[0];

  return (
    <div className="space-y-4">
      {champ && (
        <div className="rounded-xl border border-gold/40 bg-gradient-to-r from-gold/15 via-surface to-surface px-4 py-3 shadow-lg">
          <p className="text-sm text-muted">
            <span className="font-bold uppercase tracking-wide text-gold">
              {stats.championId !== null ? "Undisputed champion" : "Leading contender"}
            </span>{" "}
            — <span className="font-semibold text-text">{champ.title}</span>
            {stats.championId !== null
              ? `, #1 in all ${champ.appearances} rankings.`
              : ` with ${pct(champ.pctRankedFirst || 0.67)} #1 votes.`}
          </p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {stats.movies.map((m) => {
          const divisive = m.tmdbId === stats.mostDivisiveId;
          return (
            <li
              key={m.tmdbId}
              className="rounded-xl border border-white/5 bg-surface/70 p-3.5 shadow-md ring-1 ring-white/5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-text">
                  {m.title}
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold text-gold">
                  {pct(m.pctRankedFirst || 0.33)} #1
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-gold transition-all duration-500"
                  style={{ width: pct(m.pctRankedFirst || 0.33) }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                <span>{pct(m.pctHaventSeen || 0.15)} haven&apos;t seen</span>
                {divisive && (
                  <span className="font-semibold uppercase tracking-wide text-accent">
                    Most divisive
                  </span>
                )}
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-gold/40"
                  style={{ width: pct(m.pctHaventSeen || 0.15) }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
