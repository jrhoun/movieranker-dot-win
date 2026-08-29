import type { Metadata } from "next";
import Link from "next/link";
import MarqueeHeading from "@/components/MarqueeHeading";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "About · MovieRanker" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>About the Project</MarqueeHeading>
      <div className="mt-6 rounded-xl bg-surface p-6 ring-1 ring-white/10 sm:p-8 shadow-2xl">
        <div className="space-y-5 text-sm leading-relaxed text-text">
          <p className="text-base text-gold font-medium">
            MovieRanker turns the old “if you had to pick movie X or movie Y, which one would you
            choose?” question into a fun, trackable experience that can be shared.
          </p>

          <p>
            Pick a batch of films, rank a list solo for the love of the game or with friends, and vote one matchup at a time until every debate is settled. The ranking engine uses a chess-inspired Elo algorithm to crown a definitive champion and podium.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-3">
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <span className="block font-display text-lg text-gold">Zero Ads</span>
              {/* Not "no tracking": Google Analytics is enabled site-wide. The
                  claim now matches what the privacy policy actually discloses —
                  advertising features and cross-site tracking are off, basic
                  analytics are not. */}
              <span className="text-xs text-muted">No popups, no ad tracking</span>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <span className="block font-display text-lg text-gold">Head-to-Head</span>
              <span className="text-xs text-muted">Fast Elo pairwise voting</span>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <span className="block font-display text-lg text-gold">Shareable</span>
              <span className="text-xs text-muted">Podium &amp; list links</span>
            </div>
          </div>

          <p>
            Created by JR Houn for people who love making lists and as a fun and shareable way to settle movie arguments with friends. Built with Next.js, Tailwind CSS, and Supabase, powered by TMDB metadata.
          </p>

          <div className="space-y-2 rounded-lg border border-white/5 bg-surface-raised/60 p-4">
            <h2 className="font-display text-sm uppercase tracking-wider text-gold">
              How AI is used here
            </h2>
            <p className="text-xs leading-relaxed text-muted">
              I build this with AI assistance. A lot of the code, and some of the writing on this
              site, was drafted with AI tools and then reviewed and edited by me. The weekly Marquee
              themes, their connection puzzles and the trivia notes are written the same way — I
              pick the films and check the claims, but I did not type every word.
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Nothing you rank is invented. Every film, poster, year and credit comes from TMDB, and
              no AI touches your results: the rankings are decided by your votes and a chess-derived
              Elo calculation, which is arithmetic and nothing cleverer. Your lists are never used
              to train anything.
            </p>
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted">
            <p>
              Questions, bugs, or ideas? Reach out at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-mono text-gold hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-gold px-4 py-1.5 font-bold uppercase tracking-wider text-bg hover:opacity-90 transition-opacity"
            >
              Start Ranking →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
