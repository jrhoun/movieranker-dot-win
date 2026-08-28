import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import ParticipantChips from "@/components/ParticipantChips";
import MoviePoster from "@/components/list/MoviePoster";
import { normalizeHandle } from "@/lib/handles";
import { evaluateAchievements } from "@/lib/gamification";
import { marqueeStanding, type ThemeCompletion } from "@/lib/marquee-standing";
import {
  EMPTY_SHOWCASE,
  parseShowcase,
  attachParticipantChips,
  shapePublicProfile,
  type PublicListCardData,
} from "@/lib/public-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DbProfile {
  id: string;
  handle: string;
  visibility: string | null;
  showcase: unknown;
  created_at: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle: raw } = await params;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const handle = normalizeHandle(decoded);
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle,visibility")
    .ilike("handle", handle)
    .eq("visibility", "public")
    .maybeSingle();

  if (!profile) {
    return {
      title: "Curator Profile | movieranker.win",
      description: "Movie ranker public profile showcase.",
    };
  }

  const title = `@${profile.handle} – Movie Showcase | movieranker.win`;
  const desc = `Explore @${profile.handle}'s movie rankings, achievements, and featured films on MovieRanker.`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "profile",
      username: profile.handle,
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
    },
  };
}

// Triptych art shared by the featured card and regular grid cards.
function Triptych({ card, className = "" }: { card: PublicListCardData; className?: string }) {
  return (
    <span className={`grid grid-cols-3 gap-px bg-surface-raised ${className}`}>
      {[0, 1, 2].map((i) => {
        const slot = card.posters[i];
        return slot ? (
          <MoviePoster key={i} title={slot.title} posterPath={slot.posterPath} className="rounded-none ring-0" />
        ) : (
          <span key={i} className="aspect-[2/3] w-full bg-surface" aria-hidden="true" />
        );
      })}
    </span>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  // App Router delivers dynamic params percent-encoded, so decode manually;
  // malformed input (e.g. /u/%zz) falls back to the raw string -> lookup miss -> 404.
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {}
  const handle = normalizeHandle(decoded);
  const supabase = await createSupabaseServerClient();

  // Profiles RLS allows read-any; allow owner to preview even if private.
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,handle,visibility,showcase,created_at")
    .eq("handle", handle)
    .maybeSingle<DbProfile>();

  const isOwner = !!auth.user && auth.user.id === profile?.id;
  if (!profile || (profile.visibility !== "public" && !isOwner)) notFound();

  // Showcase ONLY public done lists — unlisted stays link-accessible but hidden here.
  const { data: lists } = await supabase
    .from("lists")
    .select("id,title,participants,status,visibility,created_at,list_movies(title,poster_path)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    // Mirror /u/me: without this, PostgREST join order is unspecified and cards
    // may showcase arbitrary movies instead of top-ranked ones.
    .order("final_rank", { foreignTable: "list_movies", ascending: true, nullsFirst: false })
    .order("elo", { foreignTable: "list_movies", ascending: false });

  const showcase = parseShowcase(profile.showcase) ?? EMPTY_SHOWCASE;
  const shaped = shapePublicProfile(lists ?? [], showcase);
  const { cards: baseCards, moviesRanked, level } = shaped;

  // Attributed participant markers on cards; links only to public profiles.
  const cardIds = baseCards.map((c) => c.id);
  const { data: attributions } =
    cardIds.length > 0
      ? await supabase
          .from("participant_attributions")
          .select("list_id,display_name,user_id")
          .in("list_id", cardIds)
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
  const cards = attachParticipantChips(
    baseCards,
    lists ?? [],
    attributions ?? [],
    publicProfiles ?? [],
  );
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
  const standing = marqueeStanding(completions, profile.id);

  // Scoped to profile owner: RLS ensures only the owner can read their own rows,
  // preventing viewer solve counts from leaking onto another user's public profile.
  const { count: solveCount } = await supabase
    .from("marquee_solves")
    .select("theme_slug", { count: "exact", head: true })
    .eq("user_id", profile.id);

  // Unlocked only; cards.length is the public done-list count (shapePublicProfile
  // filters to status=done + visibility=public, so private/unlisted never count).
  const allAchievements = evaluateAchievements({
    doneLists: cards.length,
    moviesRanked,
    maxMoviesInSingleList: Math.max(0, ...cards.map((c) => c.posters.length)),
    coCuratedLists: cards.filter((c) => (c.chips?.length ?? 0) > 0).length,
    marqueeConnectionsSolved: solveCount ?? 0,
    ...standing,
  }).filter((a) => a.unlocked);
  // Showcase curation: featured list + pinned achievements first. The favorite
  // must be among the shaped (public done) cards or it is silently omitted.
  const featured = showcase.favoriteListId
    ? cards.find((c) => c.id === showcase.favoriteListId)
    : undefined;
  const restCards = featured ? cards.filter((c) => c.id !== featured.id) : cards;
  const pinnedKeys = new Set(showcase.achievementKeys);
  const achievements = [
    ...allAchievements.filter((a) => pinnedKeys.has(a.key)),
    ...allAchievements.filter((a) => !pinnedKeys.has(a.key)),
  ];
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      {isOwner && profile.visibility !== "public" && (
        <div className="mb-6 rounded-xl bg-accent/15 p-4 ring-1 ring-accent/40 text-center text-xs text-text">
          <p className="font-bold text-accent uppercase tracking-wider mb-0.5">
            🔒 Private Preview Mode
          </p>
          <p className="text-muted">
            Your profile is currently set to <strong>Private</strong> and is only visible to you. To make it visible to the public web, switch to Public in{" "}
            <Link href="/settings" className="text-gold underline hover:text-white">
              Settings
            </Link>
            .
          </p>
        </div>
      )}
      <header>
        <MarqueeHeading>@{profile.handle}</MarqueeHeading>
        {/* Single-line Level & Rank badge */}
        <div className="mt-2 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold ring-1 ring-gold/40 shadow-sm">
            <span aria-hidden="true">✦</span>
            <span>Level {level.level} – {level.title}</span>
            {(level.prestige ?? 0) > 0 && (
              <span className="text-accent ml-0.5">
                {"✦".repeat(level.prestige!)}
              </span>
            )}
          </span>
        </div>
        <p className="mt-1.5 text-center text-xs text-muted">Joined {joined}</p>

        {/* Stats band: 3 balanced, aligned columns */}
        <dl className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-surface p-5 ring-1 ring-gold/30 font-mono text-sm">
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <dd className="font-display text-3xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)] tabular-nums">
              {moviesRanked}
            </dd>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">Movies ranked</dt>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <dd className="font-display text-3xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)] tabular-nums">
              {cards.length}
            </dd>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">Public lists</dt>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <dd className="font-display text-3xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)] tabular-nums">
              {level.level}
            </dd>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted truncate max-w-full">
              {level.title}
            </dt>
          </div>
        </dl>

        {/* Steam-style Achievement Showcase Box */}
        {achievements.length > 0 && (
          <section
            aria-labelledby="public-achievements-heading"
            className="mt-6 rounded-2xl border border-white/10 bg-surface/80 p-5 ring-1 ring-gold/20 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">🏆</span>
                <h2
                  id="public-achievements-heading"
                  className="font-display text-sm uppercase tracking-[0.14em] text-gold"
                >
                  Achievement Showcase
                </h2>
              </div>
              <span className="rounded-full bg-gold/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-gold ring-1 ring-gold/30">
                {achievements.length} Unlocked
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {achievements.map((a) => {
                const pinned = pinnedKeys.has(a.key);
                return (
                  <div
                    key={a.key}
                    className={`flex items-start gap-3 rounded-xl p-3 transition-all ${
                      pinned
                        ? "bg-gold/10 ring-1 ring-gold/50 shadow-sm"
                        : "bg-surface-raised ring-1 ring-white/10"
                    }`}
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner ring-1 ${
                        a.rarity === "legendary"
                          ? "bg-gold/20 text-gold ring-gold/50"
                          : a.rarity === "rare"
                            ? "bg-purple-500/20 text-purple-300 ring-purple-500/30"
                            : "bg-white/10 text-text ring-white/15"
                      }`}
                    >
                      {a.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-text truncate">{a.name}</h3>
                        {pinned && (
                          <span
                            title="Featured on Showcase"
                            className="text-gold text-[11px]"
                            aria-label="Pinned achievement"
                          >
                            ★
                          </span>
                        )}
                        {a.rarity === "legendary" && (
                          <span className="rounded bg-gold/20 px-1 text-[9px] font-bold uppercase tracking-wider text-gold">
                            Legendary
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-tight text-muted">{a.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </header>

      {cards.length === 0 ? (
        <p className="mt-8 rounded bg-surface p-8 text-center text-sm text-muted ring-1 ring-white/10">
          No public rankings yet.
        </p>
      ) : (
        <>
          {featured && (
            <Link
              href={`/l/${featured.id}`}
              className="mt-8 block overflow-hidden rounded bg-surface p-1 ring-2 ring-gold shadow-[0_0_32px_rgba(245,197,24,0.12)] transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none"
            >
              {/* ✦ FEATURED tag on a thin gold rule (marquee treatment). */}
              <span className="flex items-center gap-2 px-3 pt-2">
                <span className="font-display text-xs uppercase tracking-[0.24em] text-gold">
                  ✦ Featured ranking
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-gold/30" />
              </span>
              <Triptych card={featured} className="mt-2" />
              <span className="flex min-h-[3.75rem] flex-col justify-center gap-0.5 p-3">
                <span className="truncate font-semibold">{featured.title}</span>
                {featured.chips && featured.chips.length > 0 && (
                  <span className="truncate text-xs text-muted">
                    With <ParticipantChips chips={featured.chips} />
                  </span>
                )}
                <span className="text-xs text-muted">{featured.createdAt}</span>
              </span>
            </Link>
          )}
          <ul className={(featured ? "mt-4" : "mt-8") + " grid grid-cols-1 gap-4 sm:grid-cols-2"}>
            {restCards.map((card) => (
              <li key={card.id}>
                <Link
                  href={`/l/${card.id}`}
                  className="flex flex-col overflow-hidden rounded bg-surface ring-1 ring-white/10 transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Triptych card={card} />
                  <span className="flex min-h-[3.25rem] flex-col justify-center gap-0.5 p-3">
                    <span className="truncate font-semibold">{card.title}</span>
                    {card.chips && card.chips.length > 0 && (
                      <span className="truncate text-xs text-muted">
                        With <ParticipantChips chips={card.chips} />
                      </span>
                    )}
                    <span className="text-xs text-muted">{card.createdAt}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
