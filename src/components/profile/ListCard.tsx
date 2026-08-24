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
}

const btn =
  "min-h-11 flex-1 rounded px-3 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function ListCard({ list }: { list: ListCardData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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
                isDraft ? "bg-accent/15 text-accent" : "bg-surface-raised text-muted"
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
      </div>
    </article>
  );
}
