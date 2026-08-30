import Link from "next/link";
import { redirect } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import ClaimHandleCard from "@/components/profile/ClaimHandleCard";
import ProfileCanvas from "@/components/profile/ProfileCanvas";
import CustomiseModal from "@/components/profile/CustomiseModal";
import CollectionGallery from "@/components/profile/CollectionGallery";
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
  calculateXpBreakdown,
  countMoviesRanked,
  evaluateAchievements,
  levelFor,
  unlockedAt,
  xpProgress,
  type AchievementStats,
} from "@/lib/gamification";
import { reconcileCareerXp, toXpLists } from "@/lib/career-xp";
import { marqueeStanding, type ThemeCompletion } from "@/lib/marquee-standing";
import { ownedItemIds } from "@/lib/cosmetics/ownership";
import { resolveEquipped } from "@/lib/cosmetics/equipped";
import { itemsForSlot } from "@/lib/cosmetics/catalogue";
import { resolveTaglineText } from "@/lib/cosmetics/taglines";
import type { TaglineItem } from "@/lib/cosmetics/types";

/**
 * Tagline display text, resolved here server-side and never left to the
 * client: earned lines carry a literal "{count}" template, and
 * tagline.earned.pioneer's raw `.text` is the exact spoiler a user who hasn't
 * earned it must not see. `resolveTaglineText` enforces both, returning
 * undefined for a line the viewer hasn't qualified for — those are simply
 * absent from this map, so the gallery and the modal show the item's NAME and
 * its unlock path instead of its text. That keeps a locked line visible
 * (never blurred, never "Coming Soon") without spoiling it.
 */
function taglineTextMap(stats: AchievementStats): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of itemsForSlot("tagline") as TaglineItem[]) {
    const text = resolveTaglineText(t.id, stats);
    if (text !== undefined) out[t.id] = text;
  }
  return out;
}

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

  // Owner-scoped EXPLICITLY — RLS does not do it for us, and cannot. `lists`
  // carries two PERMISSIVE select policies that OR together (supabase/schema.sql):
  // "owner all" (auth.uid() = owner_id) and "anyone reads done lists"
  // (status='done' and visibility in ('unlisted','public')), the latter
  // recreated unchanged by upgrade-1.sql. An unfiltered select therefore
  // returns this user's rows PLUS every other user's finished public lists.
  // That is not merely cosmetic here: these rows feed `breakdown.total`, which
  // the ratchet at the foot of this function writes irreversibly into
  // showcase.lifetimeXp — the floor /api/profile uses to gate cosmetics, list
  // pinning and theme proposals — and `finishedThemeSlugs`, which drives
  // canister drop replay, so strangers' themes would make the picker offer
  // drops the write path then 403s. Every sibling owner-scoped query filters
  // the same way (career-xp.ts, api/profile/route.ts).
  // Top posters: final_rank first (done lists), then elo desc (drafts).
  const { data: lists } = await supabase
    .from("lists")
    .select("id,title,participants,status,visibility,theme_slug,created_at,list_movies(title,poster_path,tmdb_id)")
    .eq("owner_id", auth.user.id)
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

  const doneCards = cards.filter((c) => c.status === "done");

  // Cracked connections are an XP source, so they must be read before the total
  // is struck rather than after it.
  const { count: solveCount } = await supabase
    .from("marquee_solves")
    .select("theme_slug", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    // The table records every attempt, including wrong guesses and peeks, so
    // the badge must count only the ones that were actually cracked.
    .eq("correct", true);

  // Built from the raw rows rather than the rendered cards, and through the
  // same mapper the API gates use, so this page cannot drift from them.
  const xpLists = toXpLists(
    ((lists ?? []) as (DbList & { theme_slug?: string | null })[]).map((l) => ({
      status: l.status,
      theme_slug: l.theme_slug ?? null,
      participants: l.participants,
      movieCount: l.list_movies?.length ?? 0,
    })),
  );
  const breakdown = calculateXpBreakdown({
    lists: xpLists,
    referralCount: referralStats.activeReferrals,
    connectionsSolved: solveCount ?? 0,
  });
  // Lifetime ratchet: deleting a list from your shelf never reduces your rank.
  const { total: lifetimeXp } = reconcileCareerXp(breakdown, showcase.lifetimeXp);
  const progress = xpProgress(lifetimeXp);
  const moviesRanked = countMoviesRanked(xpLists);
  // Marquee ordering achievements. RLS policy "anyone reads done lists" exposes
  // status='done' + visibility in ('unlisted','public'), and marquee lists are
  // saved public, so this ordering is identical for every viewer.
  const { data: themeRows } = await supabase
    .from("lists")
    .select("owner_id,theme_slug,created_at")
    .not("theme_slug", "is", null)
    .eq("status", "done")
    .in("visibility", ["unlisted", "public"])
    .limit(10000);
  const completions: ThemeCompletion[] = ((themeRows ?? []) as Record<string, unknown>[])
    .filter((r) => typeof r.owner_id === "string" && typeof r.theme_slug === "string")
    .map((r) => ({
      ownerId: r.owner_id as string,
      themeSlug: r.theme_slug as string,
      createdAt: String(r.created_at ?? ""),
    }));
  const standing = marqueeStanding(completions, auth.user.id);

  const achievementStats: AchievementStats = {
    doneLists: doneCards.length,
    // Films actually ranked, not XP. Reading XP here meant seven referrals
    // unlocked "ranked a hundred films" for someone who had ranked none.
    moviesRanked,
    maxMoviesInSingleList: Math.max(0, ...doneCards.map((c) => c.posters.length)),
    coCuratedLists: xpLists.filter((l) => l.done && l.coCurated).length,
    marqueeWeeks: xpLists.filter((l) => l.done && l.isMarquee).length,
    marqueeConnectionsSolved: solveCount ?? 0,
    ...standing,
  };
  const achievements = evaluateAchievements(achievementStats);
  const level = levelFor(progress.current);
  const { unlocked, locked } = unlockedAt(level.level);

  // Same rows /api/profile's equip validator reads (owner_id + status=done,
  // oldest first): ownedItemIds replays canister drops in this order, so any
  // other ordering here could show a picker item as owned that a real equip
  // request would then 403. Filter-then-sort is equivalent to the
  // validator's sort-then-filter since sorting never reorders within the
  // filtered subset.
  const finishedThemeSlugs = ((lists ?? []) as (DbList & { theme_slug?: string | null })[])
    .filter(
      (l): l is DbList & { theme_slug: string } =>
        l.status === "done" && typeof l.theme_slug === "string" && l.theme_slug.length > 0,
    )
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((l) => l.theme_slug);

  const ownedCosmetics = ownedItemIds({
    userId: auth.user.id,
    level: level.level,
    unlockedAchievementKeys: achievements.filter((a) => a.unlocked).map((a) => a.key),
    finishedThemeSlugs,
  });
  const canvasEquipped = resolveEquipped(showcase.equipped, ownedCosmetics);
  // Stored SNAPSHOT, consistent with /u/[handle]: that page must read the
  // stored value (its own achievement stats are RLS-limited and can't always
  // re-derive an earned tagline), so the owner's own preview reads the same
  // field rather than a live recompute that could show different text than
  // what visitors actually see. /api/profile resolves and stores it at
  // equip time, from these same achievementStats.
  const taglineText = showcase.equipped?.taglineText ?? undefined;
  const ownedCosmeticIds = [...ownedCosmetics];
  // Shared by the canvas above and the modal's live preview, so the draft is
  // previewed against exactly the art the real profile shows.
  const canvasPosters = doneCards.flatMap((c) => c.posters).slice(0, 6);
  const taglineTexts = taglineTextMap(achievementStats);

  // Avatar picker source: this user's own finished films, built straight from
  // the raw rows (title/poster_path/tmdb_id travel together per movie) rather
  // than zipping ListRowData's `posters` against its `movieIds` — those two
  // arrays are filtered independently and can misalign whenever a row is
  // missing a tmdb_id. Deduplicated by tmdbId (the same film can appear in
  // several finished lists, and the avatar grid keys on tmdbId — an
  // unfiltered flatMap would produce duplicate React keys and a repeated
  // visible chip), keeping the first occurrence unless it lacked a poster
  // and a later one has one. Capped at a generous but bounded size for the
  // picker's flex-wrap chip list.
  const AVATAR_FILM_CAP = 60;
  const avatarFilmsById = new Map<number, { tmdbId: number; title: string; posterPath: string | null }>();
  for (const l of (lists ?? []) as DbList[]) {
    if (l.status !== "done") continue;
    for (const m of l.list_movies ?? []) {
      if (typeof m.tmdb_id !== "number") continue;
      const existing = avatarFilmsById.get(m.tmdb_id);
      if (!existing || (!existing.posterPath && m.poster_path)) {
        avatarFilmsById.set(m.tmdb_id, { tmdbId: m.tmdb_id, title: m.title, posterPath: m.poster_path });
      }
    }
  }
  const avatarFilms = [...avatarFilmsById.values()].slice(0, AVATAR_FILM_CAP);

  // Background ratchet: lock in new peak XP so deleting lists later never loses rank
  if (claimed && breakdown.total > (showcase.lifetimeXp ?? 0)) {
    const nextShowcase = { ...showcase, lifetimeXp: breakdown.total };
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
          {!claimed && (
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

      {/* Rendered as its own block rather than inside the flex header row
          above: ProfileCanvas is a bordered, padded card, and a row laid out
          with `justify-between` against MarqueeHeading and the Preview/Settings
          links would stretch or overflow it — exactly the sideways-scroll
          failure this feature must not introduce at narrow widths. */}
      {claimed && profile?.handle && (
        <div className="mt-4 max-w-sm">
          <ProfileCanvas
            handle={profile.handle}
            level={progress.level}
            equipped={canvasEquipped}
            posters={canvasPosters}
            taglineText={taglineText}
          />
        </div>
      )}

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
                    ? `${progress.next.xp - progress.current} XP to Prestige ${progress.prestige + 1}`
                    : `${progress.next.xp - progress.current} XP to Level ${progress.level + 1}`
                  : "You hold the highest prestige rank."}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 font-mono text-sm sm:w-64">
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <dt className="text-xs uppercase tracking-wider text-muted">Movies Ranked</dt>
              <dd className="mt-1 font-display text-2xl text-text tabular-nums">{moviesRanked}</dd>
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
            <LevelProgressionModal
              currentLevel={level.level}
              currentXp={lifetimeXp}
              breakdown={breakdown}
              challenges={achievements
                .filter((a) => a.challenge)
                .map((a) => ({
                  name: a.name,
                  description: a.description,
                  icon: a.icon,
                  unlocked: a.unlocked,
                }))}
            />
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
              <span className="font-mono text-[11px] text-muted">
                {unlocked.length}/{unlocked.length + locked.length}
              </span>
            </div>
            {/* No blur and no "Coming Soon": every entry here does something, so
                the honest move is to say what, and let it read as a roadmap. */}
            <ul className="mt-3 space-y-1.5">
              {[...unlocked, ...locked].map((u) => {
                const isUnlocked = u.atLevel <= progress.level;
                return (
                  <li
                    key={u.name}
                    className={`flex items-start gap-2.5 rounded-lg p-2.5 ring-1 transition-colors ${
                      isUnlocked
                        ? "bg-gold/10 ring-gold/30"
                        : "bg-surface-raised/40 ring-white/5"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-px text-xs ${isUnlocked ? "text-gold" : "text-muted/60"}`}
                    >
                      {isUnlocked ? "✓" : "○"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-xs font-semibold ${isUnlocked ? "text-gold" : "text-text/70"}`}
                        >
                          {u.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted">
                          Lv {u.atLevel}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted">{u.effect}</p>
                    </div>
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

      {/*
        Customise + collection. One button opens a modal that previews the
        whole draft live and saves once, replacing the five inline pickers
        that each saved on every click and never refreshed the canvas above.
        The gallery below it is the browsable half: everything in the game,
        owned or not, with the specific path to each locked item.
      */}
      {claimed && profile?.handle && (
        <section
          aria-labelledby="customise-heading"
          className="mt-6 rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="customise-heading"
              className="font-display text-sm uppercase tracking-[0.14em] text-gold"
            >
              Collection
            </h2>
            <CustomiseModal
              handle={profile.handle}
              level={progress.level}
              equipped={canvasEquipped}
              owned={ownedCosmeticIds}
              posters={canvasPosters}
              claims={showcase.avatarClaims ?? []}
              films={avatarFilms}
              taglineTexts={taglineTexts}
            />
          </div>
          <CollectionGallery
            owned={ownedCosmeticIds}
            claims={showcase.avatarClaims ?? []}
            films={avatarFilms}
            taglineTexts={taglineTexts}
          />
        </section>
      )}

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
