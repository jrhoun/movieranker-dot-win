import Link from "next/link";
import { Laurel } from "@/components/Laurel";
import type { EvaluatedAchievement } from "@/lib/gamification";
import { MAX_PINNED_ACHIEVEMENTS } from "@/lib/public-profile";

/**
 * The owner's achievements: a record of what they have won.
 *
 * READ-ONLY, and that is the change. This was a wall of toggles — every laurel
 * a button that saved on click — under a heading that is otherwise the one
 * place on the site that simply says "you won this". Choosing which three go on
 * the public profile is an EDIT, so it moved to the dressing room with every
 * other edit, and the link below goes straight to that pane. What is left here
 * is the record, which is what a profile is for.
 *
 * No "use client" any more either: with the toggles gone there is no state, no
 * fetch and no client bundle.
 */
export default function ShowcaseCard({
  achievements,
  pinnedKeys,
}: {
  achievements: EvaluatedAchievement[];
  /** The keys currently shown on the public profile; at most three by policy. */
  pinnedKeys: string[];
}) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const featured = unlocked.filter((a) => pinnedKeys.includes(a.key)).length;

  return (
    <div>
      <p className="max-w-[70ch] text-base leading-relaxed text-text/90">
        {unlocked.length === 0
          ? "Finish a ranking to win your first laurel."
          : `${featured} of ${MAX_PINNED_ACHIEVEMENTS} shown on your public profile.`}{" "}
        <Link
          href="/u/profile/customise#featured-achievements"
          className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
        >
          Choose featured achievements
        </Link>
      </p>

      {unlocked.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-5">
          {unlocked.map((a) => {
            const isFeatured = pinnedKeys.includes(a.key);
            return (
              <li key={a.key} className="flex flex-col items-center">
                <Laurel className="text-base">{a.name}</Laurel>
                {isFeatured && <span className="mt-1 block text-xs text-gold">Featured</span>}
              </li>
            );
          })}
        </ul>
      )}

      {/* Readable, honest count, closed by default: a collection that hides its
          contents cannot make anyone want anything, but it should not crowd out
          the ones already won either. */}
      {locked.length > 0 && (
        <details className="mt-8">
          <summary className="inline-block cursor-pointer list-none text-base text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">
            Still to earn: {locked.length}
          </summary>
          <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            {locked.map((a) => (
              <li key={a.key}>
                <Laurel tone="muted">{a.name}</Laurel>
                <p className="mt-1 max-w-[46ch] text-base leading-relaxed text-muted">
                  {a.description}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
