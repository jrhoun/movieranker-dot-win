"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MoviePoster from "@/components/list/MoviePoster";
import { triptychSlots } from "@/lib/triptych";

export interface ListCardData {
  id: string;
  title: string;
  status: "draft" | "done";
  createdAt: string;
  /** Top-ranked posters, best first. */
  posters: { title: string; posterPath: string | null }[];
  /** TMDB ids, best first (proposals submit the top 8). */
  movieIds?: number[];
}

const btn =
  "min-h-11 flex-1 rounded px-3 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function ListCard({ list }: { list: ListCardData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [pTitle, setPTitle] = useState(list.title.slice(0, 80));
  const [pBlurb, setPBlurb] = useState("");
  const [pNote, setPNote] = useState<string | null>(null);

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

  // Propose this ranking as a future "Tonight's Shortlist" theme.
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

  const isDraft = list.status === "draft";
  const href = isDraft ? `/r/play?id=${list.id}` : `/l/${list.id}`;
  const date = new Date(list.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
  });

  return (
    <article className="flex flex-col overflow-hidden rounded bg-surface ring-1 ring-white/10 transition-transform duration-200 ease-out hover:-translate-y-0.5">
      {/* Triptych art: up to three top posters, surface-colored filler panels */}
      <Link
        href={href}
        aria-label={isDraft ? `Resume ranking ${list.title}` : `View ${list.title}`}
        className="grid grid-cols-3 gap-px rounded-t bg-surface-raised transition-opacity duration-200 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {triptychSlots(list.posters).map(
          (slot, i) =>
            slot ? (
              <MoviePoster key={i} title={slot.title} posterPath={slot.posterPath} className="rounded-none ring-0" />
            ) : (
              <div key={i} className="aspect-[2/3] w-full bg-surface" aria-hidden="true" />
            ),
        )}
      </Link>

      <div className="flex flex-col gap-3 p-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{list.title}</h2>
          <p className="mt-1 text-xs text-muted">
            <span
              className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                isDraft
                  ? "bg-accent/15 text-accent"
                  : "bg-surface-raised text-muted ring-1 ring-gold/50"
              }`}
            >
              {isDraft ? "Draft" : "Done"}
            </span>
            {date}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={href}
            className={`${btn} bg-surface-raised hover:bg-white/10 ${isDraft ? "font-semibold text-accent" : ""}`}
          >
            {isDraft ? "Resume ranking" : "View"}
          </Link>
          {!isDraft && (list.movieIds?.length ?? 0) >= 6 && (
            <button
              type="button"
              onClick={() => setProposeOpen((v) => !v)}
              aria-expanded={proposeOpen}
              className={`${btn} bg-surface-raised text-gold ring-1 ring-gold/40 hover:bg-white/10`}
            >
              Propose theme
            </button>
          )}
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            aria-label={`Delete ${list.title}`}
            className={`${btn} max-w-11 bg-surface-raised px-0 text-accent-red hover:bg-accent-red/10`}
          >
            Delete
          </button>
        </div>
        {proposeOpen && (
          <form
            className="flex flex-col gap-2 rounded bg-surface-raised p-3 ring-1 ring-gold/30"
            onSubmit={(e) => {
              e.preventDefault();
              void propose();
            }}
          >
            <p className="text-xs text-muted">
              Suggest your top picks as a future Tonight&apos;s Shortlist theme — the owner reviews every proposal.
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
      </div>
    </article>
  );
}
