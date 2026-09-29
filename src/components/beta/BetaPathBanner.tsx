import Link from "next/link";

/**
 * Catches the beta path's hole: `BetaWalkthroughCard` only lives on
 * `/u/profile`, but the ranking flow's own redirect
 * (play-room.tsx / SaveGateSheet.tsx) sends a first-time finisher to
 * `/l/<id>?finished=1` instead — and a lot of people never make it to the
 * dashboard from there. This one line is the bridge: shown only to the
 * person who just finished their own list, only while the Beta Test
 * Screener achievement is still open, it points straight at the walkthrough
 * card's anchor rather than repeating its steps here.
 */
export default function BetaPathBanner({
  remainingSteps,
}: {
  /**
   * How many of the three onboarding steps are still open. Used only to
   * choose between the generic and specific copy below — never rendered as
   * a number, since "two quick steps" reads fine at 1 or 2 and a 3-remaining
   * visitor here is already signed in and owns a finished list, so no
   * caller should ever pass 3.
   */
  remainingSteps: number;
}) {
  const stepsCopy = remainingSteps === 1 ? "One quick step" : "A couple quick steps";

  return (
    <div
      role="note"
      className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-text sm:text-base"
    >
      <p>
        You&apos;re in the beta. {stepsCopy} earn the Beta Test Screener laurel and its cosmetics.
      </p>
      <Link
        href="/u/profile#beta"
        className="shrink-0 font-semibold text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
      >
        Finish up →
      </Link>
    </div>
  );
}
