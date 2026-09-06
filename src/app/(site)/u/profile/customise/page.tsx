import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import MarqueeHeading from "@/components/MarqueeHeading";
import CustomiseClient from "./customise-client";
import { loadOwnerProfile } from "./profile-data";

export const metadata: Metadata = {
  title: "Dressing room",
  description: "Choose the avatar, frame, background, atmosphere and tagline your profile wears.",
};

/**
 * The dressing room's route.
 *
 * A server component that does nothing but LOAD — the same dossier the profile
 * page reads, through the same helper, so the two can never disagree about
 * what this person owns or what level they are. Everything below is the client
 * editor's business.
 */
export default async function CustomisePage() {
  const data = await loadOwnerProfile();
  // Nothing to dress until there is a profile to dress: the claim form lives on
  // the dashboard, so send them there rather than showing an editor for a
  // profile that does not exist yet.
  if (!data.claimed || !data.handle) redirect("/u/profile");

  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <MarqueeHeading>Dressing room</MarqueeHeading>
      <p className="mt-5 max-w-[70ch] text-base leading-relaxed text-text/90">
        Everything in the game is here, and every locked piece says what it asks for. Tap anything
        to try it on — nothing is saved until you say so.{" "}
        <Link
          href={`/u/${data.handle}`}
          className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
        >
          View public profile
        </Link>
      </p>

      <CustomiseClient
        handle={data.handle}
        level={data.progress.level}
        equipped={data.canvasEquipped}
        owned={data.ownedCosmeticIds}
        posters={data.canvasPosters}
        claims={data.showcase.avatarClaims ?? []}
        films={data.avatarFilms}
        taglineTexts={data.taglineTexts}
        achievements={data.achievements}
        achievementKeys={data.showcase.achievementKeys}
        lists={data.cards}
        favoriteListId={data.showcase.favoriteListId}
        statsLine={data.statsLine}
      />
    </main>
  );
}
