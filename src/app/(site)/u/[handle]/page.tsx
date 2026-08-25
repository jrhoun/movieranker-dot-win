import Link from "next/link";
import { notFound } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import { normalizeHandle } from "@/lib/handles";
import { evaluateAchievements } from "@/lib/gamification";
import {
  EMPTY_SHOWCASE,
  parseShowcase,
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

  // Profiles RLS allows read-any; the visibility gate is the notFound() check below.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,handle,visibility,showcase,created_at")
    .eq("handle", handle)
    .maybeSingle<DbProfile>();

  if (!profile || profile.visibility !== "public") notFound();

  // Showcase ONLY public done lists — unlisted stays link-accessible but hidden here.
  const { data: lists } = await supabase
    .from("lists")
    .select("id,title,status,visibility,created_at,list_movies(title,poster_path)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    // Mirror /u/me: without this, PostgREST join order is unspecified and cards
    // may showcase arbitrary movies instead of top-ranked ones.
    .order("final_rank", { foreignTable: "list_movies", ascending: true, nullsFirst: false })
    .order("elo", { foreignTable: "list_movies", ascending: false });

  const { cards, moviesRanked, level } = shapePublicProfile(lists ?? []);
  // Unlocked only; cards.length is the public done-list count (shapePublicProfile
  // filters to status=done + visibility=public, so private/unlisted never count).
  const allAchievements = evaluateAchievements({
    doneLists: cards.length,
    moviesRanked,
  }).filter((a) => a.unlocked);
  // Showcase curation: featured list + pinned achievements first. The favorite
  // must be among the shaped (public done) cards or it is silently omitted.
  const showcase = parseShowcase(profile.showcase) ?? EMPTY_SHOWCASE;
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
      <header>
        <MarqueeHeading>@{profile.handle}</MarqueeHeading>
        {/* Gold ✦ rule under the marquee name (DESIGN.md section-header treatment). */}
        <p aria-hidden="true" className="mt-2 text-center text-gold">
          ✦ ✦ ✦
        </p>
        <p className="mt-1 text-center text-sm text-muted">Joined {joined}</p>

        {/* Stats band: Premiere Night numerals on dark. Level derives from PUBLIC done lists only. */}
        <dl className="mt-6 grid grid-cols-3 gap-2 rounded bg-surface p-5 ring-1 ring-gold/30 font-mono text-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <dd className="font-display text-3xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)] tabular-nums">
              {moviesRanked}
            </dd>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">Movies ranked</dt>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <dd className="font-display text-3xl leading-none text-gold [text-shadow:0_0_24px_rgba(245,197,24,0.35)] tabular-nums">
              {cards.length}
            </dd>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">Public lists</dt>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <dd className="truncate font-display text-xl uppercase leading-none tracking-[0.12em] text-text pt-1">
              {level.title}
            </dd>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">Rank</dt>
          </div>
        </dl>
        {achievements.length > 0 && (
          <ul aria-label="Achievements" className="mt-2 flex flex-wrap justify-center gap-1.5">
            {achievements.map((a) => {
              const pinned = pinnedKeys.has(a.key);
              return (
                <li
                  key={a.key}
                  title={pinned ? `Pinned — ${a.description}` : a.description}
                  className={
                    pinned
                      ? "rounded-full bg-gold/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-gold ring-2 ring-gold shadow-[0_0_16px_rgba(245,197,24,0.18)]"
                      : "rounded-full bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold ring-1 ring-gold"
                  }
                >
                  <span aria-hidden="true" className="mr-1">
                    {pinned ? "★" : "✓"}
                  </span>
                  {a.name}
                </li>
              );
            })}
          </ul>
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
