import type { Metadata } from "next";
import Link from "next/link";
import MarqueeHeading from "@/components/MarqueeHeading";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "About · movieranker.win" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>About the Project</MarqueeHeading>
      <div className="mt-6 rounded-xl bg-surface p-6 ring-1 ring-white/10 sm:p-8 shadow-2xl">
        <div className="space-y-5 text-sm leading-relaxed text-text">
          <p className="text-base text-gold font-medium">
            movieranker.win turns “which movie should we watch?” into a fast, decisive head-to-head tournament.
          </p>

          <p>
            Pick a batch of films, pass the screen around your living room (or share a ranking link), and vote one matchup at a time until every debate is settled. The ranking engine uses a chess-inspired Elo algorithm to crown a definitive champion and podium.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-3">
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <span className="block font-display text-lg text-gold">Zero Ads</span>
              <span className="text-xs text-muted">No tracking or popups</span>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <span className="block font-display text-lg text-gold">Head-to-Head</span>
              <span className="text-xs text-muted">Fast Elo pairwise voting</span>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-white/5 text-center">
              <span className="block font-display text-lg text-gold">Shareable</span>
              <span className="text-xs text-muted">Podium & list links</span>
            </div>
          </div>

          <p>
            Created by JR Houn as a fast, beautiful way to settle movie arguments with friends. Built with Next.js, Tailwind CSS, and Supabase, powered by TMDB metadata.
          </p>

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
