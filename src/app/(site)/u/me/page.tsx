import Link from "next/link";
import { redirect } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import AccountSection from "@/components/profile/AccountSection";
import ClaimHandleCard from "@/components/profile/ClaimHandleCard";
import ProfileVisibilityToggle from "@/components/profile/ProfileVisibilityToggle";
import ShowcaseCard from "@/components/profile/ShowcaseCard";
import ShowcaseLists from "@/components/profile/ShowcaseLists";
import type { ListRowData } from "@/components/profile/ListRow";
import { chipParticipants } from "@/lib/participants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EMPTY_SHOWCASE,
  parseShowcase,
} from "@/lib/public-profile";
import {
  LEVELS,
  evaluateAchievements,
  levelFor,
  totalMoviesRanked,
  unlockedAt,
  xpProgress,
} from "@/lib/gamification";

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
    .select("id,title,participants,status,visibility,created_at,list_movies(title,poster_path,tmdb_id)")
    .order("created_at", { ascending: false })
    .order("final_rank", { foreignTable: "list_movies", ascending: true, nullsFirst: false })
    .order("elo", { foreignTable: "list_movies", ascending: false });

  // Attributed participant markers on cards: one query for claims across the
  // visible lists, one for the linked users' public profiles.
  const listIds = ((lists ?? []) as DbList[]).map((l) => l.id);
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

  const cards: ListRowData[] = ((lists ?? []) as DbList[]).map((l) => ({
    id: l.id,
    title: l.title,
    status: l.status === "done" ? "done" : "draft",
    createdAt: l.created_at,
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

  // XP v0: one point per movie ranked across owned lists.
  const progress = xpProgress(totalMoviesRanked(cards.map((c) => ({ movieCount: c.posters.length }))));
  const achievements = evaluateAchievements({
    doneLists: cards.filter((c) => c.status === "done").length,
    moviesRanked: progress.current,
  });
  const level = levelFor(progress.current);
  const { unlocked, locked } = unlockedAt(level.level);
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>My Lists</MarqueeHeading>

      {/* Handle claim: lazy row creation happens via POST /api/profile. */}
      {!claimed && <ClaimHandleCard />}
      {cards.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {cards.length} {cards.length === 1 ? "list" : "lists"} ·{" "}
          {cards.filter((c) => c.status === "draft").length} in progress
        </p>
      )}

      {/* Stats header: Premiere Night marquee band — gold numerals on dark. */}
      <section aria-labelledby="stats-heading" className="mt-4 rounded bg-surface p-4 ring-1 ring-gold/30">
        <h2 id="stats-heading" className="font-display text-xl uppercase tracking-[0.12em]">
          Your premiere night
        </h2>
        {/* Claimed handle: static chip — permanent by design, no edit affordance. */}
        {claimed && profile?.handle && (
          <div className="mt-3">
            <p className="font-display text-2xl uppercase tracking-[0.14em] text-gold">
              @{profile.handle}
              <span aria-hidden="true" className="text-muted">
               {" "}·{" "}
              </span>
              <span className="text-base lowercase tracking-normal">claimed</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">Handles are permanent.</p>
          </div>
        )}
        <div className="mt-3 flex items-center gap-5">
          <div aria-hidden="true" className="flex flex-col items-center">
            <span className="font-display text-5xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)]">
              {progress.level}
            </span>
            <span className="font-display mt-1 text-xs uppercase tracking-[0.2em] text-muted">
              Level
            </span>
          </div>
          <dl className="min-w-0 flex-1 font-mono text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Movies ranked</dt>
              <dd className="tabular-nums">{progress.current}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Lists made</dt>
              <dd className="tabular-nums">{cards.length}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Rank</dt>
              <dd className="truncate font-display text-base uppercase tracking-[0.14em] text-gold">
                {level.title}
              </dd>
            </div>
          </dl>
        </div>
        {/* XP bar toward next rank; eased fill dies under reduced motion. */}
        <div
          role="progressbar"
          aria-label={progress.next ? `XP toward next rank` : "Top rank reached"}
          aria-valuenow={Math.round(progress.progress01 * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised"
        >
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.round(progress.progress01 * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          {progress.next
            ? `${progress.next.xp - progress.current} more rankings to ${LEVELS.find((l) => l.level === progress.next!.level)?.title}`
            : "You hold the top rank."}
        </p>

      </section>

      {/* Progress pair: unlockables + achievements side-by-side so nothing
          stacks into scroll-soup above the list rows. Info-only chips; full
          detail lives in title tooltips. */}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <section aria-labelledby="unlocks-heading" className="rounded bg-surface p-3 ring-1 ring-white/10">
          <h2 id="unlocks-heading" className="font-display text-sm uppercase tracking-[0.14em] text-muted">
            Unlockables
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {[...unlocked, ...locked].map((u) => {
              const isUnlocked = u.atLevel <= progress.level;
              return (
                <li
                  key={u.kind}
                  title={
                    isUnlocked
                      ? "Unlocked"
                      : `Unlocks at ${LEVELS.find((l) => l.level === u.atLevel)?.title}`
                  }
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                    isUnlocked
                      ? "bg-gold/10 text-gold ring-gold/50"
                      : "bg-surface-raised text-muted ring-white/10 opacity-70"
                  }`}
                >
                  {isUnlocked && (
                    <span aria-hidden="true" className="mr-1">
                      ✓
                    </span>
                  )}
                  {u.name}
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="achv-heading">
          <ShowcaseCard achievements={achievements} initialKeys={showcase.achievementKeys} />
        </section>
      </div>

      {cards.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-4 rounded bg-surface p-8 text-center ring-1 ring-white/10">
          <p className="text-sm text-muted">Your trophy shelf is empty — rank something.</p>
          <Link
            href="/"
            className="min-h-11 rounded bg-accent px-5 leading-[44px] font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Start ranking
          </Link>
        </div>
      ) : (
        <ShowcaseLists cards={cards} initialFavoriteId={showcase.favoriteListId} />
      )}

      <section aria-labelledby="privacy-heading" className="mt-8">
        <h2 id="privacy-heading" className="font-display text-xl uppercase tracking-[0.12em]">
          Visibility
        </h2>
        <div className="mt-3">
          <ProfileVisibilityToggle initial={profileVisibility} claimed={claimed} handle={profile?.handle} />
        </div>
        {claimed && profile?.handle && (
          profileVisibility === "public" ? (
            <Link
              href={`/u/${profile.handle}`}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-gold underline-offset-4 transition-colors duration-200 ease-out hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              View public profile →
            </Link>
          ) : (
            <span
              aria-disabled="true"
              title="Set your profile to public first"
              className="mt-3 inline-flex min-h-11 cursor-not-allowed items-center text-sm font-medium text-muted opacity-60"
            >
              View public profile →
            </span>
          )
        )}
      </section>

      <AccountSection />
    </main>
  );
}
