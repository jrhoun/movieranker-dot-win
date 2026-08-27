import type { Metadata } from "next";
import Link from "next/link";
import { SITE_UPDATES } from "@/data/updates";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Site Updates & News | MovieRanker",
  description: "Stay up to date with the latest features, releases, and announcements for MovieRanker.",
};

const tagStyles = {
  Feature: "bg-gold/15 text-gold border-gold/40",
  Improvement: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Announcement: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  Milestone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

export default function UpdatesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold mb-3">
          <span aria-hidden="true">✦</span>
          <span>Changelog &amp; Announcements</span>
        </div>
        <h1 className="font-display text-3xl uppercase tracking-wider text-text sm:text-4xl">
          What&apos;s New on MovieRanker
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed sm:text-base">
          Recent releases, newly added features, and product announcements.
        </p>
      </header>

      {/* Timeline of Updates */}
      <section aria-label="Updates Timeline" className="relative space-y-8 border-l border-white/10 pl-6 sm:pl-8 ml-2 sm:ml-4">
        {SITE_UPDATES.map((update) => (
          <article
            key={update.id}
            id={update.id}
            className="relative rounded-2xl border border-white/10 bg-surface p-5 sm:p-6 shadow-xl transition-all duration-200 ease-out hover:border-gold/30"
          >
            {/* Gold Timeline Node Marker */}
            <div
              aria-hidden="true"
              className="absolute -left-[31px] sm:-left-[39px] top-6 flex size-3.5 items-center justify-center rounded-full bg-gold ring-4 ring-bg"
            />

            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-muted">
                  {update.date}
                </span>
                {update.version && (
                  <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] font-bold text-text/80">
                    {update.version}
                  </span>
                )}
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  tagStyles[update.tag]
                }`}
              >
                {update.tag}
              </span>
            </div>

            {/* Title & Summary */}
            <h2 className="mt-3 font-display text-xl uppercase tracking-wide text-text sm:text-2xl">
              {update.title}
            </h2>
            <p className="mt-1.5 text-xs text-muted leading-relaxed sm:text-sm">
              {update.summary}
            </p>

            {/* Key Highlights */}
            {update.highlights && update.highlights.length > 0 && (
              <div className="mt-4 rounded-xl bg-surface-raised/50 p-4 border border-white/5">
                <h3 className="font-display text-xs uppercase tracking-widest text-gold mb-2 flex items-center gap-1.5">
                  <span>✦</span>
                  <span>Highlights</span>
                </h3>
                <ul className="space-y-2">
                  {update.highlights.map((point, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs text-text leading-relaxed">
                      <span className="text-gold shrink-0 mt-0.5">▪</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Community feedback callout */}
      <footer className="mt-14 rounded-2xl border border-gold/30 bg-surface/80 p-6 text-center sm:p-8">
        <h2 className="font-display text-xl uppercase tracking-wider text-gold">
          Have an idea or feature request?
        </h2>
        <p className="mt-2 text-xs text-muted leading-relaxed sm:text-sm max-w-lg mx-auto">
          MovieRanker is built for movie lovers. If there&apos;s a theme, tool, or feature you&apos;d love to see, let us know!
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=MovieRanker Feature Request`}
            className="inline-flex min-h-10 items-center rounded-full bg-gold px-5 text-xs font-bold uppercase tracking-wider text-bg shadow hover:opacity-90 active:scale-95 transition-all"
          >
            ✉ Send Feedback
          </a>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-full bg-surface-raised px-5 text-xs font-semibold uppercase tracking-wider text-text ring-1 ring-white/10 hover:ring-gold hover:text-gold active:scale-95 transition-all"
          >
            ✦ Rank Movies
          </Link>
        </div>
      </footer>
    </main>
  );
}
