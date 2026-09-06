import Link from "next/link";
import MoviePoster from "@/components/list/MoviePoster";
import { Laurel } from "@/components/Laurel";

export interface ListCardArt {
  title: string;
  posterPath: string | null;
}

/** Written out rather than interpolated so Tailwind can see the class names. */
const STRIP_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

/**
 * A ranking on the poster wall.
 *
 * The profile used to list rankings as a rounded surface card with the poster
 * strip on top and a caption box screwed underneath it — art, then a bordered
 * tray holding the title and the date. Two boxes for one idea, repeated down
 * the page.
 *
 * Here the art IS the card and the title is set INTO it, over a gradient that
 * rises out of the house black: the same way a poster carries its own billing
 * block. One object, one border.
 */
export default function ListCard({
  href,
  title,
  meta,
  caption,
  posters,
  slots = 3,
  featured = false,
  footer,
}: {
  href: string;
  title: string;
  /** Quiet second line: the date, and the film count where it earns its place. */
  meta?: string;
  /** Optional third line, e.g. the people a ranking was made with. */
  caption?: React.ReactNode;
  posters: ListCardArt[];
  /** How many posters the strip shows; the featured card shows more. */
  slots?: number;
  /** Marks the profile's one pinned ranking with a laurel. */
  featured?: boolean;
  /** Owner controls, rendered under the card rather than inside the link. */
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-lg ring-1 ring-white/10 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none"
      >
        <span
          className={`grid gap-px bg-surface-raised ${
            // A five-poster strip on a phone is five 70px slivers, so the wide
            // card drops back to three there and shows the rest from `sm` up.
            slots > 3 ? "grid-cols-3 sm:grid-cols-5" : (STRIP_COLS[slots] ?? "grid-cols-3")
          }`}
        >
          {Array.from({ length: slots }, (_, i) => {
            const slot = posters[i];
            const hidden = slots > 3 && i >= 3 ? "hidden sm:block" : "";
            return slot ? (
              <MoviePoster
                key={i}
                title={slot.title}
                posterPath={slot.posterPath}
                className={`rounded-none ring-0 ${hidden}`}
              />
            ) : (
              <span key={i} className={`aspect-[2/3] w-full bg-surface ${hidden}`} aria-hidden="true" />
            );
          })}
        </span>

        {/* The billing block: title lit out of the dark, no tray under the art. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-[linear-gradient(0deg,rgba(13,13,16,0.96)_0%,rgba(13,13,16,0.82)_45%,rgba(13,13,16,0)_100%)] px-4 pb-3 pt-12">
          {featured && (
            <span className="mb-0.5">
              <Laurel className="text-xs">Featured</Laurel>
            </span>
          )}
          <span
            className={`block truncate font-semibold text-text ${featured ? "text-lg" : "text-base"}`}
          >
            {title}
          </span>
          {meta && <span className="block truncate text-xs text-muted">{meta}</span>}
          {caption && <span className="block truncate text-xs text-muted">{caption}</span>}
        </span>
      </Link>
      {footer}
    </div>
  );
}
