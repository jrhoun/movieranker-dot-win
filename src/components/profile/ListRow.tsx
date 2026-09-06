"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MoviePoster from "@/components/list/MoviePoster";
import ParticipantChips from "@/components/ParticipantChips";
import type { ParticipantChip } from "@/lib/participants";
import { MIN_PIN_LIST_LEVEL, MIN_PROPOSAL_LEVEL, rankForLevel } from "@/lib/gamification";

export interface ListRowData {
  id: string;
  title: string;
  status: "draft" | "done";
  createdAt: string;
  themeSlug?: string | null;
  /** Top-ranked posters, best first; row shows the leading one at 2:3. */
  posters: { title: string; posterPath: string | null }[];
  /** TMDB ids, best first (proposals submit the top 8). */
  movieIds?: number[];
  /** Participant chips with attribution markers (linked names when public). */
  chips?: ParticipantChip[];
  /** Owner-only sharing scope; defaults to unlisted when absent. */
  visibility?: "unlisted" | "public" | "private";
}

interface ListRowProps {
  list: ListRowData;
  /** Showcase curation: this row is the profile's featured ranking. */
  featured?: boolean;
  /** When provided, a feature control is rendered (done + public lists only). */
  onToggleFeature?: () => void;
  /** User's career level to enforce unlock gates. */
  userLevel?: number;
}

const VISIBILITY_OPTIONS = [
  {
    value: "unlisted",
    label: "Unlisted",
    title: "Only people with the link can see this list.",
  },
  {
    value: "public",
    label: "Public",
    title: "Anyone on movieranker.win can view this list.",
  },
  {
    value: "private",
    label: "Private",
    title: "Only you can see this list, even when finished.",
  },
] as const;

type Visibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

/** Quiet text control: a verb, gold, underlined on hover. */
const textAction =
  "min-h-9 rounded text-sm text-gold underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:text-muted disabled:no-underline";

const formField =
  "rounded bg-surface px-3 py-2 text-sm text-text placeholder:text-muted ring-1 ring-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold";

/**
 * The owner's controls for ONE ranking, as plain verbs on the house
 * background.
 *
 * These used to be a row of pills and icon buttons (a ★ in a ringed circle, a
 * 🔒 when it was locked, "▶ Resume", "✦ Propose") wedged into the right end of
 * a bordered row. They are the same four actions, said in words: who can see
 * it, whether it is the featured one, proposing it as a Marquee theme, and
 * deleting it. Shared by the draft rows and the finished rankings on the
 * poster wall, so the wall did not have to lose them.
 */
export function ListActions({
  list,
  featured,
  onToggleFeature,
  userLevel,
  leading,
  className = "",
}: ListRowProps & { leading?: React.ReactNode; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localVisibility, setLocalVisibility] = useState<Visibility | null>(null);
  const visibility: Visibility =
    localVisibility ??
    (list.visibility === "public" || list.visibility === "private"
      ? list.visibility
      : "unlisted");
  const [proposeOpen, setProposeOpen] = useState(false);
  const [pTitle, setPTitle] = useState(list.title.slice(0, 80));
  const [pBlurb, setPBlurb] = useState("");
  const [pNote, setPNote] = useState<string | null>(null);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setLocalVisibility(null);
        router.refresh();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

  async function remove() {
    if (!window.confirm(`Delete "${list.title}" permanently? This can't be undone.`)) return;
    setBusy(true);
    let res: Response;
    try {
      res = await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
    } catch {
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!res.ok) return;
    router.refresh();
  }

  // Propose this ranking as a future "This Week's Marquee" theme.
  async function propose() {
    setPNote(null);
    let res: Response;
    try {
      res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pTitle,
          blurb: pBlurb,
          movieIds: list.movieIds?.slice(0, 8),
        }),
      });
    } catch {
      setPNote("Couldn't reach the server — try again.");
      return;
    }
    if (!res.ok) {
      setPNote("Proposal needs a title and 6–8 movies.");
      return;
    }
    setProposeOpen(false);
    setPBlurb("");
    setPNote(null);
  }

  async function changeVisibility(value: Visibility) {
    if (value === visibility) return;
    const previous = localVisibility;
    setLocalVisibility(value);
    let res: Response;
    try {
      res = await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: value }),
      });
    } catch {
      setLocalVisibility(previous);
      return;
    }
    if (!res.ok) {
      setLocalVisibility(previous);
      return;
    }
    router.refresh();
  }

  const isDraft = list.status === "draft";
  const canPropose = !isDraft && !list.themeSlug && (list.movieIds?.length ?? 0) >= 6;
  const hasRankToPropose = (userLevel ?? 1) >= MIN_PROPOSAL_LEVEL;
  const hasRankToFeature = (userLevel ?? 1) >= MIN_PIN_LIST_LEVEL;
  // Featuring requires: finished + public + the Level 10 milestone.
  const canFeature = !isDraft && visibility === "public" && hasRankToFeature;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {leading}
        <select
          aria-label={`Who can see ${list.title}`}
          title={VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.title}
          value={visibility}
          onChange={(e) => void changeVisibility(e.target.value as Visibility)}
          className="min-h-9 rounded bg-surface px-2 text-sm text-muted ring-1 ring-white/10 transition-colors hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {onToggleFeature && (
          <button
            type="button"
            onClick={onToggleFeature}
            disabled={!canFeature}
            aria-pressed={featured}
            title={
              !hasRankToFeature
                ? `Featuring a ranking unlocks at level ${MIN_PIN_LIST_LEVEL}. One ranking sits at the top of your public profile.`
                : !canFeature
                  ? "Finish the ranking and set it to public to feature it."
                  : featured
                    ? "Stop featuring this ranking"
                    : "Feature this ranking at the top of your public profile"
            }
            className={textAction}
          >
            {featured ? "Featured" : "Feature"}
          </button>
        )}

        {canPropose &&
          (hasRankToPropose ? (
            <button
              type="button"
              onClick={() => setProposeOpen((v) => !v)}
              aria-expanded={proposeOpen}
              title="Propose this ranking as a future weekly Marquee theme"
              className={textAction}
            >
              Propose as a theme
            </button>
          ) : (
            <span
              title={`Theme proposals unlock at level ${MIN_PROPOSAL_LEVEL} (${rankForLevel(MIN_PROPOSAL_LEVEL)}).`}
              className="text-sm text-muted"
            >
              Propose as a theme at level {MIN_PROPOSAL_LEVEL}
            </span>
          ))}

        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          aria-label={`Delete ${list.title}`}
          className="min-h-9 rounded text-sm text-muted underline-offset-4 transition-colors hover:text-accent-red hover:underline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-40"
        >
          Delete
        </button>
      </div>

      {proposeOpen && (
        <form
          className="mt-3 flex max-w-[70ch] flex-col gap-2 border-l-2 border-gold/40 pl-4"
          onSubmit={(e) => {
            e.preventDefault();
            void propose();
          }}
        >
          <p className="text-sm leading-relaxed text-muted">
            Suggest your top picks as a future This Week&apos;s Marquee theme — the owner reviews
            every proposal. Keep titles vague and atmospheric: describe the vibe, never spoil any
            movie&apos;s plot.
          </p>
          <input
            value={pTitle}
            onChange={(e) => setPTitle(e.target.value)}
            maxLength={80}
            required
            placeholder="Theme name"
            aria-label="Theme name"
            className={`min-h-11 ${formField}`}
          />
          <textarea
            value={pBlurb}
            onChange={(e) => setPBlurb(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="One-line pitch (optional)"
            aria-label="One-line pitch (optional)"
            className={`leading-relaxed ${formField}`}
          />
          <div>
            <button
              type="submit"
              disabled={!pTitle.trim()}
              className="min-h-11 rounded-full bg-gold px-5 font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
            >
              Send proposal
            </button>
          </div>
          {pNote && (
            <p role="status" className="text-sm text-accent">
              {pNote}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

/**
 * A draft ranking, as a row.
 *
 * Finished rankings live on the poster wall (`ListCard`); a draft has no
 * finished order to show off, so it stays a row: the leading poster, what it
 * is, and the way back into it. The row's ring and hover-lift are gone — a
 * list of rows is one idea, not six bordered cards stacked up.
 */
export default function ListRow({ list, featured, onToggleFeature, userLevel }: ListRowProps) {
  const isDraft = list.status === "draft";
  const href = isDraft ? `/r/play?id=${list.id}` : `/l/${list.id}`;
  const date = new Date(list.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
  });
  const top = list.posters[0];

  return (
    <article className="flex gap-4 border-b border-white/5 py-4">
      <Link
        href={href}
        aria-label={`Open ${list.title}`}
        className="w-14 shrink-0 overflow-hidden rounded-sm transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-gold motion-reduce:transition-none"
      >
        <MoviePoster
          title={top?.title ?? list.title}
          posterPath={top?.posterPath ?? null}
          className="rounded-sm"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold">
          <Link
            href={href}
            className="text-text underline-offset-4 transition-colors hover:text-gold hover:underline focus-visible:outline-2 focus-visible:outline-gold"
          >
            {list.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          {list.posters.length} {list.posters.length === 1 ? "film" : "films"}
          {isDraft ? ", started " : ", finished "}
          {date}
          {list.themeSlug ? ", from a weekly Marquee" : ""}
        </p>
        {list.chips && list.chips.length > 0 && (
          <p className="mt-0.5 truncate text-sm text-muted">
            With <ParticipantChips chips={list.chips} />
          </p>
        )}
        <ListActions
          list={list}
          featured={featured}
          onToggleFeature={onToggleFeature}
          userLevel={userLevel}
          className="mt-2"
          leading={
            <Link
              href={href}
              className="min-h-9 text-sm text-gold underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-gold"
            >
              {isDraft ? "Keep ranking" : "View"}
            </Link>
          }
        />
      </div>
    </article>
  );
}
