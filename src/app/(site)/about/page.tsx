import type { Metadata } from "next";
import MarqueeHeading from "@/components/MarqueeHeading";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "About · movieranker.win" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>About</MarqueeHeading>
      <div className="mt-6 rounded bg-surface p-6 ring-1 ring-white/10 sm:p-8">
        <div className="space-y-4 text-sm leading-relaxed text-text">
          <p>
            movieranker.win turns “which movie should we watch?” into a game.
            Pick a batch of films, pass the screen (or link) around your group,
            and vote head-to-head until every matchup has settled the argument.
            The site scores every win and hands you back a ranked list you can
            share — no more endless scrolling debates.
          </p>
          <p>
            It was built by JR Houn as a small, fast way to settle movie
            arguments with friends. There are no ads and no tracking; just
            lists, matchups, and a winner’s podium.
          </p>
          <p>
            Questions or feedback? Email{" "}
            <span className="text-muted">{CONTACT_EMAIL}</span>.
          </p>
        </div>
      </div>
    </main>
  );
}
