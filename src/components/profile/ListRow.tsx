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
  /** When provided, a feature-star is rendered (done + public lists only). */
  onToggleFeature?: () => void;
  /** User's career level to enforce unlock gates. */
  userLevel?: number;
}

const btn =
  "min-h-11 rounded px-2.5 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

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

// Compact single-line list row for /u/me: leading poster, meta, quiet actions.
export default function ListRow({ list, featured, onToggleFeature, userLevel }: ListRowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localVisibility, setLocalVisibility] = useState<(typeof VISIBILITY_OPTIONS)[number]["value"] | null>(null);
  const visibility: (typeof VISIBILITY_OPTIONS)[number]["value"] =
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

  async function changeVisibility(value: (typeof VISIBILITY_OPTIONS)[number]["value"]) {
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
  const href = isDraft ? `/r/play?id=${list.id}` : `/l/${list.id}`;
  const date = new Date(list.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
  });
  const top = list.posters[0];
  const canPropose = !isDraft && !list.themeSlug && (list.movieIds?.length ?? 0) >= 6;
  const hasRankToPropose = (userLevel ?? 1) >= MIN_PROPOSAL_LEVEL;
  const hasRankToFeature = (userLevel ?? 1) >= MIN_PIN_LIST_LEVEL;
  // Featuring requires: finished + public + Level 10 milestone.
  const canFeature = !isDraft && visibility === "public" && hasRankToFeature;

  return (
    <article className="rounded bg-surface ring-1 ring-white/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:ring-gold/40 motion-reduce:transition-none">
      <div className="flex items-center gap-3 p-2 pr-3">
        {/* Leading poster, mandated true 2:3 frame; actions carry all links */}
        <div className="w-11 shrink-0 overflow-hidden rounded-sm" aria-hidden="true">
          <MoviePoster
            title={top?.title ?? list.title}
            posterPath={top?.posterPath ?? null}
            className="rounded-sm"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{list.title}</h2>
          {list.chips && list.chips.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted">
              With <ParticipantChips chips={list.chips} />
            </p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                isDraft ? "bg-accent/15 text-accent" : "bg-surface-raised text-gold ring-1 ring-gold/50"
              }`}
            >
              {isDraft ? "Draft" : "Done"}
            </span>
            {list.themeSlug && (
              <span className="inline-block rounded bg-gold/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-gold">
                ✦ Marquee
              </span>
            )}
            <span>{date}</span>
            {/* Native select keeps visibility wired in one tight control. */}
            <select
              aria-label={`Visibility for ${list.title}`}
              title={VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.title}
              value={visibility}
              onChange={(e) => void changeVisibility(e.target.value as typeof visibility)}
              className="min-h-9 rounded bg-surface-raised px-1.5 py-0 text-xs text-muted ring-1 ring-white/15 transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {onToggleFeature && (
            <button
              type="button"
              onClick={onToggleFeature}
              disabled={!canFeature}
              aria-pressed={featured}
              aria-label={
                !hasRankToFeature
                  ? `Pinning locked (unlocks at Level ${MIN_PIN_LIST_LEVEL})`
                  : featured
                    ? `Unpin ${list.title}`
                    : `Pin ${list.title} as featured ranking`
              }
              title={
                !hasRankToFeature
                  ? `Pinning a featured ranking unlocks at Level ${MIN_PIN_LIST_LEVEL} (Theater Usher). You can pin 1 list at a time to showcase on your profile!`
                  : !canFeature
                    ? "Finish ranking and set visibility to public to feature it (1 pinned list at a time)."
                    : featured
                      ? "Unpin this featured ranking"
                      : "Pin as your featured ranking on your public profile (replaces current)"
              }
              className={`flex size-9 items-center justify-center rounded-full text-sm transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-gold active:scale-95 ${
                featured
                  ? "bg-gold/20 text-gold ring-1 ring-gold"
                  : canFeature
                    ? "bg-surface-raised text-muted ring-1 ring-white/10 hover:bg-gold/15 hover:text-gold hover:ring-gold/40"
                    : "pointer-events-none text-muted/30 opacity-40 ring-1 ring-white/5 cursor-not-allowed"
              }`}
            >
              {!hasRankToFeature ? <span className="text-[11px]" aria-hidden="true">🔒</span> : "★"}
            </button>
          )}
          <Link
            href={href}
            className={`inline-flex min-h-9 items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-gold active:scale-95 ${
              isDraft
                ? "bg-accent/20 text-accent ring-1 ring-accent/40 hover:bg-accent hover:text-bg hover:shadow-md"
                : "bg-surface-raised text-text ring-1 ring-white/10 hover:ring-gold hover:text-gold hover:bg-white/10"
            }`}
          >
            {isDraft ? "▶ Resume" : "View →"}
          </Link>
          {canPropose && (
            hasRankToPropose ? (
              <button
                type="button"
                onClick={() => setProposeOpen((v) => !v)}
                aria-expanded={proposeOpen}
                title="Propose this ranking as a future 'This Week's Marquee' theme for the community to rank"
                aria-label={`Propose ${list.title} as a weekly marquee theme`}
                className="hidden sm:inline-flex min-h-9 items-center rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold ring-1 ring-gold/40 transition-all duration-200 ease-out hover:bg-gold hover:text-bg active:scale-95"
              >
                ✦ Propose
              </button>
            ) : (
              <span
                title={`Theme proposals unlock at Level ${MIN_PROPOSAL_LEVEL} (${rankForLevel(MIN_PROPOSAL_LEVEL)}). Suggest your top picks as a future weekly marquee theme!`}
                aria-label={`Propose locked: unlocks at Level ${MIN_PROPOSAL_LEVEL}`}
                className="hidden sm:inline-flex min-h-9 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted/60 ring-1 ring-white/5 cursor-not-allowed select-none"
              >
                <span aria-hidden="true">🔒</span>
                <span>Propose (Lv {MIN_PROPOSAL_LEVEL})</span>
              </span>
            )
          )}
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            aria-label={`Delete ${list.title}`}
            className="inline-flex min-h-9 items-center rounded-full px-2.5 py-1 text-xs text-muted transition-colors duration-200 ease-out hover:bg-accent-red/10 hover:text-accent-red active:scale-95 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>
      {proposeOpen && (
        <form
          className="mx-2 mb-2 flex flex-col gap-2 rounded bg-surface-raised p-3 ring-1 ring-gold/30"
          onSubmit={(e) => {
            e.preventDefault();
            void propose();
          }}
        >
          <p className="text-xs text-muted">
            Suggest your top picks as a future This Week&apos;s Marquee theme — the owner reviews every proposal.
            Keep titles vague and atmospheric: describe the vibe, never spoil any movie&apos;s plot.
          </p>
          <input
            value={pTitle}
            onChange={(e) => setPTitle(e.target.value)}
            maxLength={80}
            required
            placeholder="Theme name"
            aria-label="Theme name"
            className="h-10 rounded bg-surface px-3 text-sm ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
          <textarea
            value={pBlurb}
            onChange={(e) => setPBlurb(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="One-line pitch (optional)"
            aria-label="One-line pitch (optional)"
            className="rounded bg-surface px-3 py-2 text-sm leading-relaxed ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
          <button type="submit" disabled={!pTitle.trim()} className={`${btn} bg-gold text-bg`}>
            Submit proposal
          </button>
          {pNote && (
            <p role="status" className="text-xs text-accent">{pNote}</p>
          )}
        </form>
      )}
    </article>
  );
}
