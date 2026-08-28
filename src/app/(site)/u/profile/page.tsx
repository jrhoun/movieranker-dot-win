import Link from "next/link";
import { redirect } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import ClaimHandleCard from "@/components/profile/ClaimHandleCard";
import LevelProgressionModal from "@/components/profile/LevelProgressionModal";
import ReferralInviteCard from "@/components/profile/ReferralInviteCard";
import ShowcaseCard from "@/components/profile/ShowcaseCard";
import ShowcaseLists from "@/components/profile/ShowcaseLists";
import type { ListRowData } from "@/components/profile/ListRow";
import { chipParticipants } from "@/lib/participants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReferralStats } from "@/lib/referrals";
import {
  EMPTY_SHOWCASE,
  parseShowcase,
} from "@/lib/public-profile";
import {
  LEVELS,
  calculateTotalXp,
  evaluateAchievements,
  levelFor,
  unlockedAt,
  xpProgress,
} from "@/lib/gamification";
import { marqueeStanding, type ThemeCompletion } from "@/lib/marquee-standing";

interface DbList {
  id: string;
  title: string;
  participants: string[];
  status: string;
  visibility: string | null;
  created_at: string;
  list_movies: { title: string; poster_path: string | null; tmdb_id?: number }[] | null;
}

export default async function MyListsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Profile row (handle + visibility + showcase). Created on demand by the claim flow.
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle,visibility,showcase")
    .eq("id", auth.user.id)
    .maybeSingle();
  const claimed = profile != null;
  const profileVisibility =
    profile?.visibility === "public" ? "public" : "private";
  const showcase = parseShowcase(profile?.showcase) ?? EMPTY_SHOWCASE;

  // RLS scopes rows to the owner. Top posters: final_rank first (done lists),
  // then elo desc (drafts).
  const { data: lists } = await supabase
    .from("lists")
    .select("id,title,participants,status,visibility,theme_slug,created_at,list_movies(title,poster_path,tmdb_id)")
    .order("created_at", { ascending: false })
    .order("final_rank", { foreignTable: "list_movies", ascending: true, nullsFirst: false })
    .order("elo", { foreignTable: "list_movies", ascending: false });

  // Attributed participant markers on cards: one query for claims across the
  // visible lists, one for the linked users' public profiles.
  const listIds = ((lists ?? []) as (DbList & { theme_slug?: string | null })[]).map((l) => l.id);
  const { data: attributions } =
    listIds.length > 0
      ? await supabase
          .from("participant_attributions")
          .select("list_id,display_name,user_id")
          .in("list_id", listIds)
      : { data: [] };
  const userIds = [...new Set((attributions ?? []).map((a) => a.user_id))];
  const { data: publicProfiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,handle")
          .in("id", userIds)
          .eq("visibility", "public")
      : { data: [] };
  const attrByList = new Map<
    string,
    { display_name: string; user_id: string }[]
  >();
  for (const a of attributions ?? []) {
    const arr = attrByList.get(a.list_id as string) ?? [];
    arr.push({ display_name: a.display_name, user_id: a.user_id });
    attrByList.set(a.list_id as string, arr);
  }

  // Active referral stats (friends who joined and published a ranking)
  const referralStats = await getReferralStats(supabase, auth.user.id);

  const cards: ListRowData[] = ((lists ?? []) as (DbList & { theme_slug?: string | null })[]).map((l) => ({
    id: l.id,
    title: l.title,
    status: l.status === "done" ? "done" : "draft",
    createdAt: l.created_at,
    themeSlug: l.theme_slug ?? null,
    posters: (l.list_movies ?? []).map((m) => ({
      title: m.title,
      posterPath: m.poster_path,
    })),
    visibility:
      l.visibility === "public" || l.visibility === "private" ? l.visibility : "unlisted",
    // Best-first (ordered by final_rank/elo in the query); proposals use top 8.
    movieIds: (l.list_movies ?? [])
      .map((m) => m.tmdb_id)
      .filter((v): v is number => Number.isInteger(v)),
    chips: chipParticipants(
      l.participants ?? [],
      attrByList.get(l.id) ?? [],
      publicProfiles ?? [],
    ),
  }));

  // Lifetime XP ratchet: active list count + referral bonuses or stored lifetime XP, whichever is higher.
  // Deleting a list from your shelf will never reduce your lifetime XP or level.
  const currentXp = calculateTotalXp({
    lists: cards.map((c) => ({ movieCount: c.posters.length })),
    referralCount: referralStats.activeReferrals,
  });
  const lifetimeXp = Math.max(currentXp, showcase.lifetimeXp ?? 0);
  const progress = xpProgress(lifetimeXp);
  const doneCards = cards.filter((c) => c.status === "done");
  // Marquee ordering achievements. RLS policy "anyone reads done lists" exposes
  // status='done' + visibility in ('unlisted','public'), and marquee lists are
  // saved public, so this ordering is identical for every viewer.
  const { data: themeRows } = await supabase
    .from("lists")
    .select("owner_id,theme_slug,created_at")
    .not("theme_slug", "is", null)
    .eq("status", "done")
    .in("visibility", ["unlisted", "public"]);
  const completions: ThemeCompletion[] = ((themeRows ?? []) as Record<string, unknown>[])
    .filter((r) => typeof r.owner_id === "string" && typeof r.theme_slug === "string")
    .map((r) => ({
      ownerId: r.owner_id as string,
      themeSlug: r.theme_slug as string,
      createdAt: String(r.created_at ?? ""),
    }));
  const standing = marqueeStanding(completions, auth.user.id);
  // Deliberately NOT filtered by user_id: the "read own solves" RLS policy
  // (supabase/upgrade-2.sql) already scopes this to auth.uid(), so this is the
  // VIEWER's solve count, not a table-wide total. Do not "fix" this by adding
  // .eq("user_id", ...) — on a public profile that would need the profile
  // owner's id, which RLS will not return anyway.
  // Consequence: on someone else's public profile the count is 0 and the badge
  // stays locked. That is the intended privacy-preserving default.
  const { count: solveCount } = await supabase
    .from("marquee_solves")
    .select("theme_slug", { count: "exact", head: true });

  const achievements = evaluateAchievements({
    doneLists: doneCards.length,
    moviesRanked: progress.current,
    maxMoviesInSingleList: Math.max(0, ...doneCards.map((c) => c.posters.length)),
    coCuratedLists: doneCards.filter((c) => (c.chips?.length ?? 0) > 0).length,
    marqueeConnectionsSolved: solveCount ?? 0,
    ...standing,
  });
  const level = levelFor(progress.current);
  const { unlocked, locked } = unlockedAt(level.level);

  // Background ratchet: lock in new peak XP so deleting lists later never loses rank
  if (claimed && currentXp > (showcase.lifetimeXp ?? 0)) {
    const nextShowcase = { ...showcase, lifetimeXp: currentXp };
    void supabase
      .from("profiles")
      .update({ showcase: nextShowcase })
      .eq("id", auth.user.id);
  }
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <MarqueeHeading>My Profile & Lists</MarqueeHeading>
          {claimed && profile?.handle ? (
            <p className="mt-1 font-display text-lg uppercase tracking-wider text-gold">
              @{profile.handle}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Track your ranking progress, achievements, and movie collections.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {claimed && profile?.handle && (
            <Link
              href={`/u/${profile.handle}`}
              className="rounded-full bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold ring-1 ring-gold/40 hover:bg-gold/20 transition-colors"
            >
              Preview Profile ↗
            </Link>
          )}
          <Link
            href="/settings"
            className="rounded-full bg-surface-raised px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted ring-1 ring-white/10 hover:text-gold hover:ring-gold/40 transition-colors"
          >
            Settings ⚙
          </Link>
        </div>
      </div>

      {!claimed && (
        <div className="mt-4">
          <ClaimHandleCard />
        </div>
      )}

      {/* Row 1 (1 Col): Marquee Gamification Hero Banner */}
      <section aria-labelledby="stats-heading" className="mt-6 rounded-xl bg-surface p-6 ring-1 ring-gold/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div aria-hidden="true" className="flex flex-col items-center">
              <span className="font-display text-6xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)]">
                {progress.level}
              </span>
              <span className="font-display mt-1 text-xs uppercase tracking-[0.2em] text-muted">
                {progress.prestige > 0 ? `Level · P${progress.prestige}` : "Level"}
              </span>
            </div>
            <div>
              <span className="font-display text-2xl uppercase tracking-[0.14em] text-gold flex items-center gap-1.5">
                Level {progress.level} – {level.title}
                {progress.prestige > 0 && (
                  <span className="text-sm text-accent">
                    {"✦".repeat(progress.prestige)}
                  </span>
                )}
              </span>
              <p className="text-xs text-muted mt-0.5">
                {progress.next
                  ? progress.prestige > 0
                    ? `${progress.next.xp - progress.current} more movies to Prestige ${progress.prestige + 1}`
                    : `${progress.next.xp - progress.current} more movies to Level ${progress.level + 1}`
                  : "You hold the highest prestige rank."}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 font-mono text-sm sm:w-64">
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <dt className="text-xs uppercase tracking-wider text-muted">Movies Ranked</dt>
              <dd className="mt-1 font-display text-2xl text-text tabular-nums">{progress.current}</dd>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <dt className="text-xs uppercase tracking-wider text-muted">Lists Created</dt>
              <dd className="mt-1 font-display text-2xl text-text tabular-nums">{cards.length}</dd>
            </div>
          </dl>
        </div>

        {/* XP Progress Bar & Guide */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-muted">
            <span className="flex items-center gap-1.5">
              <span>XP Progress:</span>
              <strong className="text-gold font-bold">{progress.current}</strong>
              <span>/</span>
              <span>{progress.next?.xp ?? progress.current} XP</span>
            </span>
            <span>
              {progress.next
                ? `${progress.next.xp - progress.current} XP to Level ${progress.next.level}`
                : "Max Level reached"}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={progress.next ? `XP toward next rank` : "Top rank reached"}
            aria-valuenow={Math.round(progress.progress01 * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 overflow-hidden rounded-full bg-surface-raised ring-1 ring-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold transition-[width] duration-700 ease-out motion-reduce:transition-none shadow-[0_0_12px_rgba(245,197,24,0.4)]"
              style={{ width: `${Math.round(progress.progress01 * 100)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <LevelProgressionModal currentLevel={level.level} currentXp={lifetimeXp} />
            {referralStats.activeReferrals > 0 && (
              <span className="text-[11px] font-mono text-gold/80 flex items-center gap-1">
                <span>🎟️</span>
                <span>
                  +{referralStats.bonusXp} XP from {referralStats.activeReferrals} active referral
                  {referralStats.activeReferrals === 1 ? "" : "s"}
                </span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Row 2 (2 Cols): Left = Unlockables & Trophies, Right = Invite Card & Quick Stats */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Col: Unlocks & Achievement Showcase */}
        <div className="space-y-4">
          <section aria-labelledby="unlocks-heading" className="rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 id="unlocks-heading" className="font-display text-sm uppercase tracking-[0.14em] text-gold">
                Level Unlocks
              </h2>
              {locked.length > 0 && (
                <span className="rounded-full bg-gold/10 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-gold ring-1 ring-gold/30">
                  Coming Soon
                </span>
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...unlocked, ...locked].map((u) => {
                const isUnlocked = u.atLevel <= progress.level;
                return (
                  <li
                    key={u.name}
                    title={
                      isUnlocked
                        ? "Unlocked"
                        : `Unlocks at ${LEVELS.find((l) => l.level === u.atLevel)?.title}`
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all ${
                      isUnlocked
                        ? "bg-gold/10 text-gold ring-gold/40"
                        : "bg-surface-raised/40 text-muted/60 ring-white/5 filter blur-[2px] opacity-40 select-none"
                    }`}
                  >
                    {isUnlocked && <span aria-hidden="true" className="mr-1">✓</span>}
                    {u.name}
                  </li>
                );
              })}
            </ul>
          </section>

          <ShowcaseCard achievements={achievements} initialKeys={showcase.achievementKeys} />
        </div>

        {/* Right Col: Invite Card & Quick Status */}
        <div className="space-y-4">
          <ReferralInviteCard handle={profile?.handle ?? null} stats={referralStats} />

          <div className="rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg">
            <h2 className="font-display text-sm uppercase tracking-[0.14em] text-gold">
              Quick Stats
            </h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Completed Rankings:</span>
                <span className="font-mono text-text font-semibold">{cards.filter((c) => c.status === "done").length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>In-Progress Drafts:</span>
                <span className="font-mono text-text font-semibold">{cards.filter((c) => c.status === "draft").length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Profile Visibility:</span>
                <span className="font-mono uppercase text-gold font-semibold">{profileVisibility}</span>
              </div>
            </div>
            <div className="mt-4 pt-2">
              <Link
                href="/settings"
                className="text-xs text-gold hover:underline flex items-center gap-1 font-medium"
              >
                Manage handle, email & privacy settings →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 (1 Col): All My Lists */}
      <section aria-labelledby="lists-heading" className="mt-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 id="lists-heading" className="font-display text-2xl uppercase tracking-[0.12em] text-text">
            All My Lists ({cards.length})
          </h2>
          <Link
            href="/"
            className="rounded-full bg-gold px-4 py-1 text-xs font-bold uppercase tracking-wider text-bg hover:opacity-90 transition-opacity"
          >
            + New Ranking
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-surface p-10 text-center ring-1 ring-white/10 shadow-xl">
            <p className="text-sm text-muted">You haven&apos;t created any movie lists yet.</p>
            <Link
              href="/"
              className="min-h-11 rounded-full bg-gold px-6 leading-[44px] text-xs font-bold uppercase tracking-wider text-bg shadow-lg hover:opacity-90 transition-opacity"
            >
              Start Ranking →
            </Link>
          </div>
        ) : (
          <ShowcaseLists cards={cards} initialFavoriteId={showcase.favoriteListId} userLevel={level.level} />
        )}
      </section>
    </main>
  );
}
