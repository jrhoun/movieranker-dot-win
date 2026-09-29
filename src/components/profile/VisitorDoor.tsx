import Link from "next/link";

/**
 * The two ways OUT of someone else's profile, for a viewer who is not its
 * owner: play the same list, or make a profile of their own.
 *
 * Only the primary is a button. A share link brings strangers here, and the
 * one thing that turns a stranger into a player is the week's Marquee, which
 * `/` starts; a signup is the quieter second door because a profile is worth
 * nothing to someone who has not ranked anything yet. The signup link carries
 * `?ref={handle}` so the site layout's ReferralTracker (mounted globally under
 * (site)/layout.tsx, so it runs on /login too) credits the profile owner.
 */
export function shouldShowVisitorDoor({
  viewerId,
  ownerId,
}: {
  viewerId: string | null | undefined;
  ownerId: string;
}): boolean {
  return viewerId !== ownerId;
}

export function visitorDoorLinks(handle: string) {
  return {
    play: "/",
    signup: `/login?mode=signup&next=${encodeURIComponent("/u/profile")}&ref=${encodeURIComponent(handle)}`,
  };
}

export default function VisitorDoor({ handle }: { handle: string }) {
  const links = visitorDoorLinks(handle);
  return (
    <section
      aria-label="Play or join"
      className="mt-8 rounded-xl bg-bg/60 px-5 py-5 backdrop-blur-sm"
    >
      <p className="max-w-[60ch] text-base text-text">
        Rank the same films and see where you and @{handle} disagree.
      </p>
      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Link
          href={links.play}
          className="inline-flex min-h-11 items-center rounded bg-gold px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Play this week&apos;s list
        </Link>
        <Link
          href={links.signup}
          className="inline-flex min-h-11 items-center px-2 text-sm text-muted underline-offset-4 transition-colors duration-200 ease-out hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Create your profile
        </Link>
      </div>
    </section>
  );
}
