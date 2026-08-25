import Link from "next/link";
import { redirect } from "next/navigation";
import ListCard, { type ListCardData } from "@/components/profile/ListCard";
import MarqueeHeading from "@/components/MarqueeHeading";
import AccountSection from "@/components/profile/AccountSection";
import ClaimHandleCard from "@/components/profile/ClaimHandleCard";
import ProfileVisibilityToggle from "@/components/profile/ProfileVisibilityToggle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LEVELS, levelFor, totalMoviesRanked, unlockedAt, xpProgress } from "@/lib/gamification";

interface DbList {
  id: string;
  title: string;
  status: string;
  visibility: string | null;
  created_at: string;
  list_movies: { title: string; poster_path: string | null; tmdb_id?: number }[] | null;
}

export default async function MyListsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Profile row (handle + visibility). Created on demand by the claim flow.
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle,visibility")
    .eq("id", auth.user.id)
    .maybeSingle();
  const claimed = profile != null;
  const profileVisibility =
    profile?.visibility === "public" ? "public" : "private";

  // RLS scopes rows to the owner. Top posters: final_rank first (done lists),
  // then elo desc (drafts).
  const { data: lists } = await supabase
    .from("lists")
    .select("id,title,status,visibility,created_at,list_movies(title,poster_path,tmdb_id)")
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
    visibility:
      l.visibility === "public" || l.visibility === "private" ? l.visibility : "unlisted",
    // Best-first (ordered by final_rank/elo in the query); proposals use top 8.
    movieIds: (l.list_movies ?? [])
      .map((m) => m.tmdb_id)
      .filter((v): v is number => Number.isInteger(v)),
  }));

  // XP v0: one point per movie ranked across owned lists.
  const progress = xpProgress(totalMoviesRanked(cards.map((c) => ({ movieCount: c.posters.length }))));
  const level = levelFor(progress.current);
  const { unlocked, locked } = unlockedAt(level.level);
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>Your lists</MarqueeHeading>

      {/* Handle claim: lazy row creation happens via POST /api/profile. */}
      {!claimed && <ClaimHandleCard />}
      {cards.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {cards.length} {cards.length === 1 ? "list" : "lists"} ·{" "}
          {cards.filter((c) => c.status === "draft").length} in progress
        </p>
      )}

      {/* Stats header: Premiere Night marquee band — gold numerals on dark. */}
      <section aria-labelledby="stats-heading" className="mt-6 rounded bg-surface p-6 ring-1 ring-gold/30">
        <h2 id="stats-heading" className="font-display text-xl uppercase tracking-[0.12em]">
          Your premiere night
        </h2>
        <div className="mt-4 flex items-center gap-5">
          <div aria-hidden="true" className="flex flex-col items-center">
            <span className="font-display text-6xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)]">
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
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-raised"
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

        {/* Unlockables teaser — decorations arrive in a later era. */}
        <ul className="mt-5 grid grid-cols-2 gap-2">
          {[...unlocked, ...locked].map((u) => {
            const isUnlocked = u.atLevel <= progress.level;
            return (
              <li
                key={u.kind}
                className={`rounded p-3 ring-1 ${
                  isUnlocked ? "bg-gold/10 ring-gold/50" : "bg-surface-raised ring-white/10 opacity-60"
                }`}
              >
                <p className={`text-xs font-semibold ${isUnlocked ? "text-gold" : "text-muted"}`}>
                  {isUnlocked && (
                    <span aria-hidden="true" className="mr-1 text-gold">
                      ✓
                    </span>
                  )}
                  {u.name}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {isUnlocked
                    ? "Unlocked"
                    : `Unlocks at ${LEVELS.find((l) => l.level === u.atLevel)?.title}`}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {cards.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-4 rounded bg-surface p-8 text-center ring-1 ring-white/10">
          <p className="text-sm text-muted">Your trophy shelf is empty — rank something.</p>
          <Link
            href="/"
            className="min-h-11 rounded bg-accent px-5 leading-[44px] font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Start ranking
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((list) => (
            <li key={list.id}>
              <ListCard list={list} />
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="privacy-heading" className="mt-10">
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
