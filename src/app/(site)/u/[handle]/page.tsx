import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProfileCanvas, { profileStatsLine } from "@/components/profile/ProfileCanvas";
import ListCard from "@/components/profile/ListCard";
import MarqueeHeading from "@/components/MarqueeHeading";
import { Laurel } from "@/components/Laurel";
import ParticipantChips from "@/components/ParticipantChips";
import { normalizeHandle } from "@/lib/handles";
import { evaluateAchievements } from "@/lib/gamification";
import { maskListTitle } from "@/lib/marquee-title";
import { marqueeStanding, type ThemeCompletion } from "@/lib/marquee-standing";
import { sanitizeEquipped } from "@/lib/cosmetics/equipped";
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

/** One card on the poster wall; the featured ranking gets a wider strip. */
function RankingCard({ card, featured = false }: { card: PublicListCardData; featured?: boolean }) {
  return (
    <ListCard
      href={`/l/${card.id}`}
      title={card.title}
      meta={card.createdAt}
      caption={
        card.chips && card.chips.length > 0 ? (
          <>
            With <ParticipantChips chips={card.chips} />
          </>
        ) : undefined
      }
      posters={card.posters}
      slots={featured ? 5 : 3}
      featured={featured}
    />
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
    .select("id,title,participants,theme_slug,status,visibility,created_at,list_movies(title,poster_path)")
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
  // THE SPOILER RULE, on the growth surface. A Marquee list's stored title IS
  // the theme title, which paraphrases the answer to that week's connection
  // quiz — so a public profile listing "The Golden Age of Hollywood" handed the
  // answer to every stranger who followed a share link here, without them ever
  // opening the puzzle. Masked with the same helper the list page and the play
  // room use; see src/lib/marquee-title.ts for why past weeks stay masked too.
  //
  // NO OWNER EXEMPTION HERE, deliberately: /u/[handle] is public and this page
  // already goes out of its way (see the sanitizeEquipped and taglineText notes
  // above) to render identically for every viewer, owner included. The owner's
  // own dashboard at /u/profile is where the exemption lives.
  //
  // `theme_slug` and `created_at` come off the raw rows rather than
  // PublicListCardData, which carries neither — the shaped card has only a
  // pre-formatted date string, and the marquee number has to be derived from
  // the real timestamp.
  const themeRowById = new Map(
    ((lists ?? []) as Record<string, unknown>[])
      .filter((r) => typeof r.id === "string")
      .map((r) => [
        r.id as string,
        {
          themeSlug: (r.theme_slug as string | null) ?? null,
          createdAt: String(r.created_at ?? ""),
        },
      ]),
  );
  const cards = attachParticipantChips(
    baseCards,
    lists ?? [],
    attributions ?? [],
    publicProfiles ?? [],
  ).map((card) => {
    const row = themeRowById.get(card.id);
    if (!row?.themeSlug) return card;
    return {
      ...card,
      title: maskListTitle({
        title: card.title,
        themeSlug: row.themeSlug,
        createdAt: row.createdAt,
      }),
    };
  });
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
    .eq("user_id", profile.id)
    // The table records every attempt, including wrong guesses and peeks, so
    // the badge must count only the ones that were actually cracked.
    .eq("correct", true);

  // Finished-Marquee count for achievementStats.marqueeWeeks below — only
  // the COUNT is read, so unlike the ordered version /api/profile computes
  // for its own equip validator, no sort is needed here.
  const finishedThemeCount = ((lists ?? []) as Record<string, unknown>[]).filter(
    (r) =>
      r.status === "done" &&
      typeof r.theme_slug === "string" &&
      (r.theme_slug as string).length > 0,
  ).length;

  // Unlocked only; cards.length is the public done-list count (shapePublicProfile
  // filters to status=done + visibility=public, so private/unlisted never count).
  // marqueeWeeks was missing here before this task: without it, "season_ticket"
  // (12 finished Marquees) could never unlock on this page, so an equipped
  // attendance tagline would silently fall back to nothing. Added to match the
  // /api/profile validator, which does count it (`marqueeWeeks: finishedThemeSlugs.length`).
  const achievementStats = {
    doneLists: cards.length,
    moviesRanked,
    maxMoviesInSingleList: Math.max(0, ...cards.map((c) => c.posters.length)),
    coCuratedLists: cards.filter((c) => (c.chips?.length ?? 0) > 0).length,
    marqueeWeeks: finishedThemeCount,
    marqueeConnectionsSolved: solveCount ?? 0,
    ...standing,
  };
  const evaluated = evaluateAchievements(achievementStats);
  const allAchievements = evaluated.filter((a) => a.unlocked);
  // Counted, not listed: the public page names what someone HAS won. What is
  // still out there is one number, so a visitor can see there is more to the
  // game without reading a locked catalogue on someone else's profile.
  const stillToEarn = evaluated.length - allAchievements.length;

  // NOT resolveEquipped: this page's achievement stats above are inherently
  // RLS-limited (shapePublicProfile counts only public done lists, and
  // marquee_solves is scoped by RLS to its own reader), so they can never
  // fully reconstruct ownership of a challenge- or drop-gated item earned
  // partly through private data. Re-checking ownership here with them would
  // not catch a stale grant — it would produce FALSE NEGATIVES: a user who
  // earns the legendary, challenge-gated frame.prism and equips it would see
  // it themselves, while every other visitor (and the owner on THIS page)
  // would silently see starter brass instead. /api/profile already validated
  // the id against the owner's own full-access stats when it was written,
  // which is the strongest guarantee available here — so this page trusts
  // that snapshot and only re-checks what it CAN verify correctly on its
  // own: that the id still exists in the catalogue and still belongs to its
  // slot (see sanitizeEquipped's doc comment). /u/profile, by contrast, has
  // complete stats and keeps using resolveEquipped's real ownership check —
  // this asymmetry is deliberate, not a mismatch to "fix" later.
  const canvasEquipped = sanitizeEquipped(showcase.equipped);
  // Rendered as the stored SNAPSHOT, never recomputed via resolveTaglineText
  // on this page: this page's achievementStats above is itself RLS-limited
  // (public done lists only, and marquee_solves is scoped to its own reader),
  // so a tagline earned partly through private lists or solves would
  // silently vanish here for EVERY viewer — including the owner previewing
  // their own /u/[handle] — if recomputed with these stats. /api/profile
  // resolves and stores it once, at equip time, from the real owner's own
  // full-access stats, so this is read straight through instead.
  const taglineText = showcase.equipped?.taglineText ?? undefined;

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
  const pinned = allAchievements
    .filter((a) => pinnedKeys.has(a.key))
    .map((a) => ({ name: a.name }));
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
  });
  // The stats band is gone; this is what it said, in a sentence.
  const statsLine = profileStatsLine({
    rank: level.title,
    level: level.level,
    prestige: level.prestige ?? 0,
    moviesRanked,
    lists: cards.length,
    joined,
  });

  return (
    <>
      {/*
        THE STAGE MOMENT, and the only one on this page (DESIGN.md: velvet on
        stage moments, dark house under the content). The marquee card sits in
        the band; everything below it is house black.
      */}
      <header className="bg-curtain-soft relative overflow-hidden">
        {/* Same width and gutters as the content below it, so the card's edge
            lines up with the poster wall; the drape reads above and below. */}
        <div className="relative mx-auto w-full max-w-page px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <ProfileCanvas
            handle={profile.handle}
            level={level.level}
            equipped={canvasEquipped}
            posters={cards.flatMap((c) => c.posters).slice(0, 6)}
            taglineText={taglineText}
            statsLine={statsLine}
            pinned={pinned}
            handleAs="h1"
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {isOwner && profile.visibility !== "public" && (
          // One sentence, not a warning placard: the owner is the only person
          // who can ever read it, and they already know what a private
          // profile is — what they need is the way to change it.
          <p className="mb-10 text-sm text-muted">
            Only you can see this profile.{" "}
            <Link
              href="/settings"
              className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
            >
              Make it public in settings
            </Link>
            .
          </p>
        )}

        <section aria-labelledby="rankings-heading">
          <MarqueeHeading as="h2">Rankings</MarqueeHeading>
          {cards.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              {isOwner ? (
                <>
                  You haven&apos;t published a ranking yet.{" "}
                  <Link
                    href="/"
                    className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    Start with this week&apos;s marquee
                  </Link>
                  .
                </>
              ) : (
                <>@{profile.handle} hasn&apos;t published a ranking yet.</>
              )}
            </p>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {featured && (
                <li className="sm:col-span-2">
                  <RankingCard card={featured} featured />
                </li>
              )}
              {restCards.map((card) => (
                <li key={card.id}>
                  <RankingCard card={card} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {achievements.length > 0 && (
          <section aria-labelledby="achievements-heading" className="mt-14">
            <MarqueeHeading as="h2">Achievements</MarqueeHeading>
            {/*
              Laurels, wrapped. This was a ringed "ACHIEVEMENT SHOWCASE" panel
              of emoji tiles, each with its own tinted square, rarity chip and
              description — a notification tray on a page that is meant to
              read as a lobby. A laurel is what a film wears when it has won
              something, and the name is the whole point; the description is
              an instruction for EARNING one, which nobody reading a stranger's
              profile needs.
            */}
            <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-4">
              {achievements.map((a) => (
                <li key={a.key}>
                  <Laurel className="text-base">{a.name}</Laurel>
                </li>
              ))}
            </ul>
            {stillToEarn > 0 && (
              <p className="mt-5 text-sm text-muted">Still to earn: {stillToEarn}</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
