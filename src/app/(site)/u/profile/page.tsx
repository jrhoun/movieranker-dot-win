import Link from "next/link";
import MarqueeHeading from "@/components/MarqueeHeading";
import ClaimHandleCard from "@/components/profile/ClaimHandleCard";
import ProfileBackdrop from "@/components/profile/ProfileBackdrop";
import ProfileCanvas from "@/components/profile/ProfileCanvas";
import LevelProgressionModal from "@/components/profile/LevelProgressionModal";
import ReferralInviteCard from "@/components/profile/ReferralInviteCard";
import ShowcaseCard from "@/components/profile/ShowcaseCard";
import ShowcaseLists from "@/components/profile/ShowcaseLists";
import BetaWalkthroughCard from "@/components/BetaWalkthroughCard";
import { unlockedAt } from "@/lib/gamification";
import { loadOwnerProfile } from "./customise/profile-data";

/** The one primary action on the page, and the look every primary shares. */
const PRIMARY =
  "inline-flex min-h-11 items-center rounded-full bg-gold px-5 font-semibold text-bg transition-opacity duration-200 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export default async function MyListsPage() {
  const {
    handle,
    claimed,
    showcase,
    cards,
    referralStats,
    breakdown,
    lifetimeXp,
    progress,
    level,
    achievements,
    achievementStats,
    canvasEquipped,
    canvasPosters,
    taglineText,
    statsLine,
  } = await loadOwnerProfile();

  const { locked } = unlockedAt(level.level);

  // The cheapest unlock still ahead. Taken by MINIMUM rather than as locked[0]:
  // `unlockedAt` filters UNLOCKS and preserves its order, so the first locked
  // entry is only the next one if that array happens to be sorted by level —
  // which nothing enforces, and which a later insertion would quietly break.
  const nextUnlock =
    locked.length > 0
      ? locked.reduce((lowest, u) => (u.atLevel < lowest.atLevel ? u : lowest))
      : null;

  // The progression strip's one sentence: what the next level costs, and what
  // crossing it (or the level after) gets you. This replaces a "Level Unlocks
  // (next up)" panel, a "Quick Stats" panel, a six-times-larger level numeral
  // and a second copy of the career-guide trigger — four boxes saying what
  // fits in two clauses.
  const nextLevelSentence = progress.next
    ? progress.prestige > 0
      ? `${progress.next.xp - progress.current} XP to prestige ${progress.prestige + 1}.`
      : `${progress.next.xp - progress.current} XP to level ${progress.next.level}.`
    : "You hold the highest prestige rank.";
  const nextUnlockSentence = nextUnlock
    ? ` Next unlock: ${nextUnlock.name.charAt(0).toLowerCase()}${nextUnlock.name.slice(1)} at level ${nextUnlock.atLevel}.`
    : " Every level unlock is yours.";

  const pinnedLaurels = achievements
    .filter((a) => a.unlocked && showcase.achievementKeys.includes(a.key))
    .map((a) => ({ name: a.name }));

  const pct = Math.round(progress.progress01 * 100);

  return (
    <>
      {/*
        THE STAGE IS THE BACKDROP NOW. The equipped background used to be a
        treatment inside the profile card; painted behind the whole page it
        does what a customised profile is for — the room is yours, not just a
        box in it. The velvet curtain that used to run behind this band is gone
        with it: two stages fighting for the same wall is one too many.
      */}
      <ProfileBackdrop variant="page" equipped={canvasEquipped} posters={canvasPosters} />

      {/*
        THE STAGE MOMENT: the page heading, the marquee card, and the one
        control that edits it. Everything that used to crowd this — a level
        numeral six times the size of the type beside it, a two-tile stat
        grid, an XP readout in mono, a referral chip — either moved below or
        went into the card's own sentence.
      */}
      <header className="relative">
        <div className="relative mx-auto w-full max-w-page px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <MarqueeHeading>Your profile</MarqueeHeading>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {claimed && handle && (
              <Link
                href={`/u/${handle}`}
                className="text-base text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                View public profile
              </Link>
            )}
            <Link
              href="/settings"
              className="text-base text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
            >
              Settings
            </Link>
          </div>

          {!claimed && (
            <div className="mx-auto mt-6 max-w-reading">
              <ClaimHandleCard />
            </div>
          )}

          {claimed && handle && (
            <div className="mt-8">
              <ProfileCanvas
                handle={handle}
                level={progress.level}
                equipped={canvasEquipped}
                posters={canvasPosters}
                taglineText={taglineText}
                statsLine={statsLine}
                pinned={pinnedLaurels}
              />
              {/*
                The one primary action on this page, directly under the card it
                edits — and, under that, the quiet way in for someone who came
                to look rather than to change something. Edit Profile IS
                the collection, so the wall of everything-you-could-earn that
                used to sit several screens below is that same page.
              */}
              <div className="mt-5 flex flex-col items-center gap-3">
                <Link href="/u/profile/customise" className={PRIMARY}>
                  Edit Profile
                </Link>
                <Link
                  href="/u/profile/customise"
                  className="text-base text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  Browse everything you can earn
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/*
        THE SHEET. Below the hero, the page's own prose (the XP sentence, the
        links, the invite card) would sit on the equipped backdrop with nothing
        between — on a filmstrip that is body text over Citizen Kane. So the
        main column is one translucent sheet, the same 70% house black as the
        marquee panel, and the room shows at its edges and behind the hero
        rather than through every line of type.
      */}
      <main className="relative mx-auto w-full max-w-page flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-bg/70 px-5 py-8 backdrop-blur-md sm:px-8 sm:py-10">
          <BetaWalkthroughCard
            isSignedIn={achievementStats.isSignedIn}
            hasHandle={achievementStats.hasHandle}
            publicDoneLists={achievementStats.publicDoneLists}
            equipped={showcase.equipped}
            className="mb-10"
          />
          {/* THE PROGRESSION STRIP: a bar, a sentence, a way to read the rules. */}
        <section aria-label="Career progress">
          <div
            role="progressbar"
            aria-label={progress.next ? "XP toward the next level" : "Top rank reached"}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
          >
            <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-text/90">
            {nextLevelSentence}
            {nextUnlockSentence}
          </p>
          <div className="mt-2">
            <LevelProgressionModal
              currentLevel={level.level}
              currentXp={lifetimeXp}
              breakdown={breakdown}
            />
          </div>
        </section>

        <section aria-labelledby="achievements-heading" className="mt-14">
          <MarqueeHeading as="h2">Achievements</MarqueeHeading>
          <div className="mt-6">
            <ShowcaseCard
              achievements={achievements}
              pinnedKeys={showcase.achievementKeys}
            />
          </div>
        </section>

        <section aria-labelledby="invite-heading" className="mt-14">
          <MarqueeHeading as="h2">Invite friends</MarqueeHeading>
          <div className="mt-6">
            <ReferralInviteCard handle={handle} stats={referralStats} />
          </div>
        </section>

        <section aria-labelledby="rankings-heading" className="mt-14">
          <MarqueeHeading as="h2">Your rankings</MarqueeHeading>
          <p className="mt-5">
            <Link
              href="/"
              className="text-base text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
            >
              Start a new ranking
            </Link>
          </p>

          {cards.length === 0 ? (
            <p className="mt-5 text-base text-muted">
              You haven&apos;t ranked anything yet.{" "}
              <Link
                href="/"
                className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Start with this week&apos;s marquee
              </Link>
              .
            </p>
          ) : (
            <ShowcaseLists
              cards={cards}
              initialFavoriteId={showcase.favoriteListId}
              userLevel={level.level}
            />
          )}
        </section>
        </div>
      </main>
    </>
  );
}
