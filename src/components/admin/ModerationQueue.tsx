"use client";

import { useCallback, useEffect, useState } from "react";

interface ModeratedList {
  id: string;
  title: string;
  description: string | null;
  participants: string[];
  visibility: string | null;
  createdAt: string;
  ownerHandle: string | null;
  flags: string[];
}

type Page =
  | { available: true; items: ModeratedList[]; hasMore: boolean; nextCursor: string | null }
  | { available: false; reason: string };

/**
 * The text this site shows strangers, and one way to stop showing it.
 *
 * EVERY public list is listed, not only flagged ones — the flag is a blocklist
 * hint written for handles, so on free prose it both misses things and cries
 * wolf. A queue that only showed matches would quietly become the definition of
 * what is objectionable, which a word list is not fit to be.
 *
 * WHAT THE COUNTS MEAN. The server returns one page, newest first, and computes
 * flags in Node over that page — it cannot order the query by them. So every
 * number here is scoped to what has been loaded and says so. The old copy read
 * "N of M match the blocklist" over a silent `.limit(200)`, which stated a
 * total it had never seen.
 */
const btn =
  "inline-flex min-h-9 items-center rounded px-2.5 text-[11px] font-semibold transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";

/**
 * At module scope because it closes over nothing. Defined in the component it
 * would be a new function every render, which drags the effect's dependency
 * list along with it — the kind of thing that ends in an eslint-disable rather
 * than a fix.
 */
async function fetchPage(before: string | null): Promise<Page> {
  const url = before
    ? `/api/admin/moderation?before=${encodeURIComponent(before)}`
    : "/api/admin/moderation";
  const res = await fetch(url);
  // Same silence as the rest of admin: a non-owner learns nothing.
  if (!res.ok) return { available: false, reason: "" };
  return (await res.json()) as Page;
}

export default function ModerationQueue() {
  const [items, setItems] = useState<ModeratedList[] | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  /** Load the newest page, discarding anything already paged in. */
  const reload = useCallback(async () => {
    const page = await fetchPage(null);
    if (!page.available) {
      setUnavailable(page.reason);
      setItems([]);
      return;
    }
    setUnavailable(null);
    setItems(page.items);
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
  }, []);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const page = await fetchPage(cursor);
    setLoadingMore(false);
    if (!page.available) return;
    setItems((prev) => [...(prev ?? []), ...page.items]);
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
  }

  useEffect(() => {
    const t = setTimeout(() => void reload(), 0);
    return () => clearTimeout(t);
  }, [reload]);

  async function hide(listId: string) {
    setBusyId(listId);
    setError(null);
    const res = await fetch("/api/admin/moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, visibility: "private" }),
    });
    setBusyId(null);
    if (!res.ok) {
      const msg = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(msg?.error ?? `Could not hide that list (${res.status}).`);
      return;
    }
    // Drop it here rather than refetching: a reload would discard every page
    // already loaded and drop the reader back to the top of the queue.
    setItems((prev) => (prev ?? []).filter((i) => i.id !== listId));
  }

  if (items === null) return <p className="mt-4 text-sm text-muted">Loading…</p>;
  if (unavailable !== null) {
    return (
      <p className="mt-4 rounded bg-surface p-3 text-sm text-muted ring-1 ring-white/10">
        Public content unavailable. {unavailable}
      </p>
    );
  }

  const flagged = items.filter((i) => i.flags.length > 0);
  // Flagged first WITHIN WHAT IS LOADED. The server cannot do this (see the
  // note on the route), so the promise here is only ever about loaded rows.
  const shown = (flaggedOnly ? flagged : items)
    .slice()
    .sort((a, b) =>
      a.flags.length === b.flags.length ? 0 : b.flags.length - a.flags.length,
    );

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] leading-tight text-muted">
          Finished rankings anyone can open.{" "}
          <span className="font-mono tabular-nums text-text">{flagged.length}</span> of the{" "}
          <span className="font-mono tabular-nums text-text">{items.length}</span> loaded match
          the blocklist{hasMore && ", and there are more to load"} — a hint for sorting, not a
          verdict.
        </p>
        {flagged.length > 0 && (
          <button
            type="button"
            onClick={() => setFlaggedOnly((v) => !v)}
            className="shrink-0 text-[11px] text-gold underline underline-offset-2 hover:opacity-80"
          >
            {flaggedOnly ? "Show all loaded" : `Show flagged only (${flagged.length})`}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded bg-surface p-3 text-sm text-gold ring-1 ring-gold/30" role="status">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {flaggedOnly ? "Nothing flagged in what is loaded." : "No public rankings yet."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-white/5 overflow-hidden rounded ring-1 ring-white/10">
          {shown.map((item) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 ${
                item.flags.length > 0 ? "bg-gold/[0.06]" : "bg-surface"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                  {item.flags.length > 0 && (
                    <span
                      aria-hidden="true"
                      title={`Matched: ${item.flags.join(", ")}`}
                      className="shrink-0 text-[10px] text-gold"
                    >
                      ●
                    </span>
                  )}
                  <span className="truncate">{item.title}</span>
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {item.ownerHandle ? `@${item.ownerHandle}` : "unclaimed handle"} ·{" "}
                  {item.visibility}
                  {item.participants.length > 0 && ` · with ${item.participants.join(", ")}`}
                  {item.flags.length > 0 && (
                    <span className="text-gold"> · matched {item.flags.join(", ")}</span>
                  )}
                </p>
                {item.description && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted/80">
                    {item.description}
                  </p>
                )}
              </div>

              {/* The two actions are deliberately NOT twins. They were
                  identically styled, and one of them changes what strangers
                  can see. Reading a list is the quiet default; hiding it
                  carries the weight. */}
              <span className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`/l/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${btn} text-muted hover:bg-white/10 hover:text-text`}
                >
                  Open ↗
                </a>
                <button
                  type="button"
                  onClick={() => void hide(item.id)}
                  disabled={busyId === item.id}
                  title="Takes it out of public view. The owner keeps the ranking and their XP."
                  className={`${btn} bg-accent-red/10 text-accent-red ring-1 ring-accent-red/30 hover:bg-accent-red/20`}
                >
                  {busyId === item.id ? "Hiding…" : "Make private"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasMore && !flaggedOnly && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="mt-3 min-h-9 rounded px-3 text-[11px] font-semibold text-gold ring-1 ring-gold/30 transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load older rankings"}
        </button>
      )}
    </div>
  );
}
