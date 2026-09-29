import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import { decadesSentence, tasteSentences, type TasteProfile, type TasteVoice } from "@/lib/taste";

/**
 * What this person's rankings say about them: a strip of their number ones,
 * a bar of the decades they reach for, and one or two sentences about how
 * they get on with the room. Everything else on a profile is tenure (rank,
 * level, how many films); this is the part a visitor actually reads.
 *
 * Server component: the data arrives computed (see src/lib/taste.ts), so
 * this file is layout and voice only. Renders nothing at all for a profile
 * with no finished lists, so the section never shows an empty strip.
 */

/**
 * Bar segments, darkest to brightest by share so the biggest decade reads
 * first at a glance. Written out so Tailwind can see the class names.
 */
const SEGMENT_TONES = ["bg-gold", "bg-gold/75", "bg-gold/55", "bg-gold/40", "bg-gold/30"];
const FAINT = "bg-gold/20";

export default function TasteSection({
  taste,
  mode,
  handle,
  className = "",
}: {
  taste: TasteProfile;
  /** Owner mode says "you"; visitor mode names the handle. */
  mode: TasteVoice["mode"];
  /** Without the @. */
  handle: string;
  className?: string;
}) {
  if (taste.finishedLists === 0) return null;
  const voice: TasteVoice = { mode, handle };
  const owner = mode === "owner";
  const { numberOnes, decades } = taste;
  const sentences = tasteSentences(taste, voice);
  const decadeLine = decadesSentence(decades, voice);

  // Tone by rank of share, so ties in the bar still read consistently.
  const toneByDecade = new Map<number, string>();
  decades
    .slice()
    .sort((a, b) => b.pct - a.pct || a.decade - b.decade)
    .forEach((d, i) => toneByDecade.set(d.decade, SEGMENT_TONES[i] ?? FAINT));

  return (
    <section aria-labelledby="taste-heading" className={className}>
      <MarqueeHeading as="h2">Taste</MarqueeHeading>

      {numberOnes.length > 0 && (
        <div className="mt-6">
          <h3
            id="taste-number-ones"
            className="font-display text-lg uppercase leading-none tracking-[0.08em] text-text/90"
          >
            {owner ? "Your number ones" : "Their number ones"}
          </h3>
          {/*
            A strip, not a grid: twelve posters at 2:3 would be a second
            poster wall under the first. Scrolls sideways on a phone, and
            fits without scrolling from `md` up at the widths below.
          */}
          <ul
            aria-labelledby="taste-number-ones"
            className="mt-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
          >
            {numberOnes.map((n) => (
              <li key={n.listId} className="w-16 shrink-0 sm:w-20">
                <MoviePoster title={n.title} posterPath={n.posterPath} tmdbId={n.tmdbId} />
                <span className="sr-only">
                  {n.title}
                  {n.releaseYear ? ` (${n.releaseYear})` : ""}, first in {n.listTitle}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {decades.length > 0 && decadeLine && (
        <div className="mt-6">
          <h3 className="font-display text-lg uppercase leading-none tracking-[0.08em] text-text/90">
            By decade
          </h3>
          {/*
            One bar, segments in decade order, labels underneath from `sm` up.
            Below that the labels would collide, so the sentence stands in;
            it is also what a screen reader gets, since the bar is decorative.
          */}
          <div aria-hidden="true" className="mt-3 hidden sm:block">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-raised">
              {decades.map((d) => (
                <div
                  key={d.decade}
                  className={`h-full ${toneByDecade.get(d.decade) ?? FAINT}`}
                  style={{ width: `${d.pct}%` }}
                  title={`${d.label} ${d.pct}%`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex w-full font-mono text-[11px] leading-none text-muted">
              {decades.map((d) => (
                <div
                  key={d.decade}
                  className="min-w-0 overflow-hidden whitespace-nowrap pr-1"
                  style={{ width: `${d.pct}%` }}
                >
                  {/* A sliver has no room for its label; the sentence still names it. */}
                  {d.pct >= 8 ? `${d.label} ${d.pct}%` : ""}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-text/90 sm:sr-only">
            {decadeLine}
          </p>
        </div>
      )}

      {sentences.length > 0 && (
        <p className="mt-6 max-w-[70ch] text-base leading-relaxed text-text/90">
          {sentences.join(" ")}
        </p>
      )}
    </section>
  );
}
