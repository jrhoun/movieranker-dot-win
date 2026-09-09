import { redirect } from "next/navigation";
import { profileStatsLine } from "@/components/profile/ProfileCanvas";
import type { ListRowData } from "@/components/profile/ListRow";
import { maskListTitle } from "@/lib/marquee-title";
import { chipParticipants } from "@/lib/participants";
import { writeProfileShowcase } from "@/lib/profile-showcase-write";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReferralStats, type ReferralStats } from "@/lib/referrals";
import { EMPTY_SHOWCASE, parseShowcase, type ProfileShowcase } from "@/lib/public-profile";
import {
  calculateXpBreakdown,
  countMoviesRanked,
  evaluateAchievements,
  levelFor,
  xpProgress,
  type AchievementStats,
  type EvaluatedAchievement,
  type Level,
  type XpBreakdown,
  type XpProgress,
  XP_CURVE_VERSION,
} from "@/lib/gamification";
import { reconcileCareerXp, toXpLists } from "@/lib/career-xp";
import { marqueeStanding, type ThemeCompletion } from "@/lib/marquee-standing";
import { ownedItemIds } from "@/lib/cosmetics/ownership";
import { resolveEquipped, type Equipped } from "@/lib/cosmetics/equipped";
import { itemsForSlot } from "@/lib/cosmetics/catalogue";
import { resolveTaglineText } from "@/lib/cosmetics/taglines";
import type { TaglineItem } from "@/lib/cosmetics/types";

/**
 * Everything the owner's two pages read.
 *
 * /u/profile and /u/profile/customise are the SAME dossier rendered twice: the
 * dashboard shows it, the dressing room edits it. When the dressing room was a
 * dialog living inside the dashboard that was free; as its own route it would
 * have meant a second copy of ~200 lines of queries, and the two would drift
 * on the first cosmetic added — the customise page would offer an item the
 * dashboard's `resolveEquipped` then dropped, or gate a level the dashboard
 * had already granted.
 *
 * So the load happens once, here, and both pages render from the result. It
 * sits beside the newer page rather than in `src/lib` because it is page data
 * and nothing else may depend on its shape.
 *
 * The comments below travelled with the code out of u/profile/page.tsx: each
 * one records a bug that the query it sits above used to have.
 */

interface DbList {
  id: string;
  title: string;
  participants: string[];
  status: string;
  visibility: string | null;
  created_at: string;
  theme_slug?: string | null;
  list_movies: { title: string; poster_path: string | null; tmdb_id?: number }[] | null;
}

export interface OwnerProfileData {
  userId: string;
  /** null until the handle claim flow has run; the dashboard shows that form. */
  handle: string | null;
  /** Whether a profile row exists at all. */
  claimed: boolean;
  showcase: ProfileShowcase;
  cards: ListRowData[];
  doneCards: ListRowData[];
  referralStats: ReferralStats;
  breakdown: XpBreakdown;
  lifetimeXp: number;
  progress: XpProgress;
  level: Level;
  moviesRanked: number;
  achievements: EvaluatedAchievement[];
  achievementStats: AchievementStats;
  /** Ownership as `ownedItemIds` computes it, for pickers and previews. */
  ownedCosmeticIds: string[];
  /** Equipped, already resolved against ownership — never the raw stored value. */
  canvasEquipped: Equipped;
  canvasPosters: { title: string; posterPath: string | null }[];
  /** The stored tagline SNAPSHOT, not a live recompute (see below). */
  taglineText: string | undefined;
  taglineTexts: Record<string, string>;
  avatarFilms: { tmdbId: number; title: string; posterPath: string | null }[];
  /** Rank, level, counts and joining date as one sentence. */
  statsLine: string;
  /** Month and year the profile row was created, e.g. "August 2026". */
  joined: string | null;
}

/**
 * Tagline display text, resolved here server-side and never left to the
 * client: earned lines carry a literal "{count}" template, and
 * tagline.earned.pioneer's raw `.text` is the exact spoiler a user who hasn't
 * earned it must not see. `resolveTaglineText` enforces both, returning
 * undefined for a line the viewer hasn't qualified for — those are simply
 * absent from this map, so the dressing room shows the item's NAME and its
 * unlock path instead of its text. That keeps a locked line visible (never
 * blurred, never "Coming soon") without spoiling it.
 */
function taglineTextMap(stats: AchievementStats): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of itemsForSlot("tagline") as TaglineItem[]) {
    const text = resolveTaglineText(t.id, stats);
    if (text !== undefined) out[t.id] = text;
  }
  return out;
}

/** Avatar picker cap: a generous but bounded size for a flex-wrap chip list. */
const AVATAR_FILM_CAP = 60;

/**
 * Load the owner's dossier. Redirects to /login when nobody is signed in —
 * both callers want exactly that, and doing it here means neither can forget.
 * An unclaimed handle is NOT a redirect: the dashboard renders the claim form
 * for it, and only the dressing room bounces (it has nothing to dress).
 */
export async function loadOwnerProfile(): Promise<OwnerProfileData> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Profile row (handle + visibility + showcase). Created on demand by the claim flow.
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle,visibility,showcase,created_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  const claimed = profile != null;
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

  const rows = (lists ?? []) as DbList[];

  // Attributed participant markers on cards: one query for claims across the
  // visible lists, one for the linked users' public profiles.
  const listIds = rows.map((l) => l.id);
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
  const attrByList = new Map<string, { display_name: string; user_id: string }[]>();
  for (const a of attributions ?? []) {
    const arr = attrByList.get(a.list_id as string) ?? [];
    arr.push({ display_name: a.display_name, user_id: a.user_id });
    attrByList.set(a.list_id as string, arr);
  }

  // Active referral stats (friends who joined and published a ranking)
  const referralStats = await getReferralStats(supabase, auth.user.id);

  const cards: ListRowData[] = rows.map((l) => ({
    id: l.id,
    // THE SPOILER RULE, with its one exemption. A Marquee list's stored title
    // IS the theme title, which paraphrases the answer to that week's
    // connection quiz — the rows here showed it outright.
    //
    // This is the owner's own dashboard, so a FINISHED Marquee reveals: they
    // played it, and nobody else can load this page. A DRAFT stays masked, and
    // that is the case that actually matters. The home hero deliberately never
    // names the theme, so someone part-way through a Marquee has genuinely
    // never seen it — the list page makes exactly this argument about its own
    // draft branch ("Exempting drafts leaked the answer to the one person
    // still playing"). Same reasoning, same conclusion, one helper.
    //
    // `title` also feeds ListRow's aria-labels and its delete confirmation, so
    // masking here covers every string that row can produce.
    title: maskListTitle({
      title: l.title,
      themeSlug: l.theme_slug,
      createdAt: l.created_at,
      reveal: l.status === "done",
    }),
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
    rows.map((l) => ({
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
  const { total: lifetimeXp } = reconcileCareerXp(
    breakdown,
    showcase.lifetimeXp,
    showcase.lifetimeXpCurve,
  );
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
    publicDoneLists: doneCards.filter((c) => c.visibility === "public").length,
    hasHandle: Boolean(profile?.handle),
    isSignedIn: true,
    ...standing,
  };
  const achievements = evaluateAchievements(achievementStats);
  const level = levelFor(progress.current);

  // Same rows /api/profile's equip validator reads (owner_id + status=done,
  // oldest first): ownedItemIds replays canister drops in this order, so any
  // other ordering here could show a picker item as owned that a real equip
  // request would then 403. Filter-then-sort is equivalent to the
  // validator's sort-then-filter since sorting never reorders within the
  // filtered subset.
  const finishedThemeSlugs = rows
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
    // Without this a claimed poster is not owned, so the picker shows it
    // locked and resolveEquipped below drops an equipped one back to the
    // starter — the claim would be spent and invisible.
    avatarClaims: showcase.avatarClaims ?? [],
  });
  const canvasEquipped = resolveEquipped(showcase.equipped, ownedCosmetics);
  // Stored SNAPSHOT, consistent with /u/[handle]: that page must read the
  // stored value (its own achievement stats are RLS-limited and can't always
  // re-derive an earned tagline), so the owner's own preview reads the same
  // field rather than a live recompute that could show different text than
  // what visitors actually see. /api/profile resolves and stores it at
  // equip time, from these same achievementStats.
  const taglineText = showcase.equipped?.taglineText ?? undefined;
  // Shared by the dashboard's canvas and the dressing room's live preview, so
  // a draft is previewed against exactly the art the real profile shows.
  const canvasPosters = doneCards.flatMap((c) => c.posters).slice(0, 6);

  const joined = profile?.created_at
    ? new Date(profile.created_at as string).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
      })
    : null;

  // Avatar picker source: this user's own finished films, built straight from
  // the raw rows (title/poster_path/tmdb_id travel together per movie) rather
  // than zipping ListRowData's `posters` against its `movieIds` — those two
  // arrays are filtered independently and can misalign whenever a row is
  // missing a tmdb_id. Deduplicated by tmdbId (the same film can appear in
  // several finished lists, and the avatar grid keys on tmdbId — an
  // unfiltered flatMap would produce duplicate React keys and a repeated
  // visible chip), keeping the first occurrence unless it lacked a poster
  // and a later one has one.
  const avatarFilmsById = new Map<
    number,
    { tmdbId: number; title: string; posterPath: string | null }
  >();
  for (const l of rows) {
    if (l.status !== "done") continue;
    for (const m of l.list_movies ?? []) {
      if (typeof m.tmdb_id !== "number") continue;
      const existing = avatarFilmsById.get(m.tmdb_id);
      if (!existing || (!existing.posterPath && m.poster_path)) {
        avatarFilmsById.set(m.tmdb_id, {
          tmdbId: m.tmdb_id,
          title: m.title,
          posterPath: m.poster_path,
        });
      }
    }
  }

  // Background ratchet: lock in new peak XP so deleting lists later never
  // loses rank. Goes through the service-role RPC — `profiles.showcase` is no
  // longer writable by the user's own session (see writeProfileShowcase). It
  // used to be a floating `void supabase.from("profiles").update(...)`, which
  // is exactly how it failed silently for as long as the revoke was live
  // ahead of this code; a failure now at least reaches the server log.
  if (claimed && breakdown.total > (showcase.lifetimeXp ?? 0)) {
    // Marked with the curve it was earned under, so it is never mistaken for
    // a legacy value and inflated on the way back out (see bankedCareerXp).
    const nextShowcase = {
      ...showcase,
      lifetimeXp: breakdown.total,
      lifetimeXpCurve: XP_CURVE_VERSION,
    };
    void writeProfileShowcase(auth.user.id, nextShowcase).catch((e: unknown) => {
      console.error("[profile] lifetimeXp ratchet failed:", e);
    });
  }

  return {
    userId: auth.user.id,
    handle: (profile?.handle as string | undefined) ?? null,
    claimed,
    showcase,
    cards,
    doneCards,
    referralStats,
    breakdown,
    lifetimeXp,
    progress,
    level,
    moviesRanked,
    achievements,
    achievementStats,
    ownedCosmeticIds: [...ownedCosmetics],
    canvasEquipped,
    canvasPosters,
    taglineText,
    taglineTexts: taglineTextMap(achievementStats),
    avatarFilms: [...avatarFilmsById.values()].slice(0, AVATAR_FILM_CAP),
    // The card's sentence, built the same way /u/[handle] builds it — from this
    // user's OWN counts, which include the drafts and private lists the public
    // page cannot see.
    statsLine: profileStatsLine({
      rank: level.title,
      level: progress.level,
      prestige: progress.prestige,
      moviesRanked,
      lists: doneCards.length,
      listNoun: "finished ranking",
      joined,
    }),
    joined,
  };
}
