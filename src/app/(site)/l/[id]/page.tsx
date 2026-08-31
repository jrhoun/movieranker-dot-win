import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompareModal from "@/components/list/CompareModal";
import CompletionSummaryCard from "@/components/CompletionSummaryCard";
import ListViews from "@/components/list/ListViews";
import MarqueeConnectionGame from "@/components/MarqueeConnectionGame";
import MarqueeHeading from "@/components/MarqueeHeading";
import OwnerControls from "@/components/list/OwnerControls";
import ParticipantChips from "@/components/ParticipantChips";
import ShareButton from "@/components/ShareButton";
import { withRanks, type ListMovieRow } from "@/lib/list-view";
import { marqueeDisplayTitle } from "@/lib/marquee-title";
import { summariseCompletion, isWorthCelebrating, type CompletionSummary } from "@/lib/completion";
import { calculateXpBreakdown, countMoviesRanked } from "@/lib/gamification";
import { reconcileCareerXp, toXpLists, type CareerListRow } from "@/lib/career-xp";
import { getReferralStats } from "@/lib/referrals";
import { marqueeStanding, type ThemeCompletion } from "@/lib/marquee-standing";
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
  created_at: string;
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
    .select("title,description,status,theme_slug,list_movies(title,poster_path,final_rank)")
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

  // THE SPOILER RULE: for a marquee list, list.title IS the theme title. Naming
  // it in og:title would spoil the week's puzzle in every link preview, so the
  // preview poses the question instead — matching the card in opengraph-image.tsx.
  const isMarquee = !!list.theme_slug;
  const title = isMarquee
    ? "What connects these films? | movieranker.win"
    : `${list.title} – Movie Ranking | movieranker.win`;
  const desc = isMarquee
    ? // No "this week's": a marquee list stays shareable long after its week,
      // and dating it here would repeat the misattribution the share text's
      // marqueeNumber anchor exists to prevent.
      `One hidden thread runs through all ${movies.length} films in this Marquee. Rank them and see if you can spot it.`
    : topMovie
      ? `#1 Champion: ${topMovie.title}. Ranked across ${movies.length} films on MovieRanker.`
      : `Ranked list of ${movies.length} movies on MovieRanker.`;

  // No openGraph.images or twitter.images: opengraph-image.tsx in this segment
  // generates a proper 1200x630 card. The old code pointed at a raw 780x1170
  // TMDB poster, which every link card centre-cropped into a band across the
  // actor's chin.
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: "website" },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

function shareUrl(listId: string, refHandle?: string | null): string {
  const refQuery = refHandle ? `?ref=${encodeURIComponent(refHandle)}` : "";
  return `${SITE_URL}/l/${listId}${refQuery}`;
}

export default async function PublicListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ finished?: string }>;
}) {
  const { id } = await params;
  // Set by the ranking flow's redirect (play-room / SaveGateSheet). Distinguishes
  // "you just finished this" from "you opened a link", which is the difference
  // between a congratulations modal and a quiet card further down the page.
  const justFinished = (await searchParams)?.finished === "1";
  const supabase = await createSupabaseServerClient();

  // RLS: public sees only status='done'; owners also see their drafts.
  const { data: list } = await supabase
    .from("lists")
    .select("id,title,description,participants,status,owner_id,theme_slug,created_at")
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

  // The marquee number identifies WHICH weekly puzzle this list belongs to, so it
  // must be anchored to the week the room was made — not the week someone
  // happens to be reading it. Calling marqueeNumber() bare relabelled every past
  // marquee share with the current week's number.
  //
  // created_at rather than an inversion of theme_slug -> week: the rotation pool
  // is SHORTLIST_THEMES plus whatever community proposals were approved at the
  // time, so pool.length shifts and a slug cannot be mapped back to its week
  // reliably. The one case created_at gets wrong is a room saved after the UTC
  // Monday flip but played before it (Sunday evening in the Americas), which
  // reads one week high.
  const listMarqueeNumber = list.theme_slug
    ? marqueeNumber(new Date(list.created_at))
    : null;

  // THE SPOILER RULE, on the page itself. For a marquee list, list.title IS the
  // theme title and the description IS the theme blurb — both paraphrase the
  // answer to the connection quiz sitting further down the page. The week is
  // shown instead, and the real title is revealed by the quiz once answered.
  //
  // DRAFTS ARE WITHHELD TOO, which they were not. The old rule exempted them
  // on the premise that "the owner is mid-ranking and chose the theme" — and
  // that premise is false. The home hero deliberately does not name the theme
  // (its own comment: the hook "only works because the theme is withheld"), so
  // a player starting the marquee has never seen it. Exempting drafts leaked
  // the answer to the one person still playing.
  //
  // Shared with the play room rather than restated: two copies of a rule whose
  // failure is silent will drift, and this one already had.
  const withholdTheme = !!list.theme_slug;
  const displayTitle = marqueeDisplayTitle(list.title, list.theme_slug, listMarqueeNumber);

  /**
   * What this ranking just earned, shown only to the person who finished it and
   * only on the hop straight from the ranking screen.
   *
   * Everything is derived by evaluating the same pure functions twice — once on
   * the owner's totals, once on those totals minus this list — so "new" means
   * genuinely new without an awards table to keep in sync. See lib/completion.ts.
   *
   * The extra reads are deliberate and rare: they run once, for one person, on
   * the redirect after a save.
   */
  let completion: CompletionSummary | null = null;
  if (justFinished && isOwner && user && list.status === "done") {
    const { data: ownedRows } = await supabase
      .from("lists")
      .select("id,participants,theme_slug,created_at,list_movies(tmdb_id)")
      .eq("owner_id", user.id)
      .eq("status", "done");

    // The query above is already scoped to finished lists, so every row here is
    // done by construction.
    const owned: ({ id: string } & CareerListRow)[] = (
      (ownedRows ?? []) as Record<string, unknown>[]
    ).map((r) => ({
      id: String(r.id),
      status: "done",
      theme_slug: (r.theme_slug as string | null) ?? null,
      participants: r.participants,
      movieCount: Array.isArray(r.list_movies) ? r.list_movies.length : 0,
    }));
    const before = owned.filter((l) => l.id !== id);

    // Referrals, cracked connections and the lifetime ratchet all feed the
    // profile's number. This card has to read them too, or it reports a
    // different level than the profile does minutes later.
    const [referralStats, { count: solveCount }, { data: profileRow }] = await Promise.all([
      getReferralStats(supabase, user.id),
      supabase
        .from("marquee_solves")
        .select("theme_slug", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("correct", true),
      supabase.from("profiles").select("showcase").eq("id", user.id).maybeSingle(),
    ]);
    const bankedXp = (profileRow as { showcase?: { lifetimeXp?: number } } | null)?.showcase
      ?.lifetimeXp;

    // Marquee ordering (first to finish a theme, front row, century) is global,
    // so it needs every themed done list — the same read the profile page does.
    const { data: themeRows } = await supabase
      .from("lists")
      .select("owner_id,theme_slug,created_at")
      .not("theme_slug", "is", null)
      .eq("status", "done")
      .in("visibility", ["unlisted", "public"])
      .limit(10000);
    const allCompletions: ThemeCompletion[] = ((themeRows ?? []) as Record<string, unknown>[]).map(
      (r) => ({
        ownerId: r.owner_id as string,
        themeSlug: r.theme_slug as string,
        createdAt: String(r.created_at ?? ""),
      }),
    );
    // This list has no id in that projection, so it is identified the only way
    // available: same owner, same theme, same instant.
    const completionsBefore = allCompletions.filter(
      (c) =>
        !(
          c.ownerId === list.owner_id &&
          c.themeSlug === list.theme_slug &&
          c.createdAt === list.created_at
        ),
    );

    const snapshot = (ls: typeof owned, completions: ThemeCompletion[]) => {
      const xpLists = toXpLists(ls);
      const breakdown = calculateXpBreakdown({
        lists: xpLists,
        referralCount: referralStats.activeReferrals,
        connectionsSolved: solveCount ?? 0,
      });
      return {
        xp: reconcileCareerXp(breakdown, bankedXp).total,
        stats: {
          // Filtered on the mapper's own flag rather than trusting the query
          // three screens up to stay scoped to finished lists.
          doneLists: xpLists.filter((l) => l.done).length,
          moviesRanked: countMoviesRanked(xpLists),
          maxMoviesInSingleList: Math.max(0, ...ls.map((l) => l.movieCount)),
          coCuratedLists: xpLists.filter((l) => l.done && l.coCurated).length,
          marqueeWeeks: xpLists.filter((l) => l.done && l.isMarquee).length,
          marqueeConnectionsSolved: solveCount ?? 0,
          ...marqueeStanding(completions, user.id),
        },
      };
    };

    const summary = summariseCompletion(
      snapshot(before, completionsBefore),
      snapshot(owned, allCompletions),
    );
    completion = isWorthCelebrating(summary) ? summary : null;
  }

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
              <span>{displayTitle}</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {list.status === "done" && (
              <CompareModal listId={id} listTitle={displayTitle} />
            )}
            <ShareButton
              title={displayTitle}
              url={url}
              themeSlug={list.theme_slug}
              marqueeNumber={listMarqueeNumber}
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
            {list.description && !withholdTheme && (
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

      {completion && (
        <section aria-label="Ranking complete" className="mt-10 flex justify-center">
          <div className="w-full max-w-xl">
            <CompletionSummaryCard summary={completion} />
          </div>
        </section>
      )}

      {list.theme_slug && list.status === "done" && (
        <section aria-label="Marquee mystery connection" className="mt-12">
          <MarqueeConnectionGame
            themeSlug={list.theme_slug}
            marqueeNumber={listMarqueeNumber}
            justFinished={justFinished}
            revealTitle={list.title}
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
