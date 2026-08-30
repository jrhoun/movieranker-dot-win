"use client";

import { useEffect, useState } from "react";

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

type Response =
  | { available: true; items: ModeratedList[] }
  | { available: false; reason: string };

const btn =
  "min-h-11 rounded px-3 text-xs font-semibold transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";

/**
 * The text this site shows strangers, and one way to stop showing it.
 *
 * Flagged items sort to the top, but EVERY public list is listed — the flag is
 * a blocklist hint written for handles, so on free prose it both misses things
 * and cries wolf. A queue that only showed matches would quietly become the
 * definition of what is objectionable, which a word list is not fit to be.
 */
export default function ModerationQueue() {
  const [data, setData] = useState<Response | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/moderation");
    if (!res.ok) {
      // Same silence as the rest of admin: a non-owner learns nothing.
      setData({ available: false, reason: "" });
      return;
    }
    setData((await res.json()) as Response);
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, []);

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
    void load();
  }

  if (data === null) return <p className="mt-4 text-sm text-muted">Loading…</p>;
  if (!data.available) {
    return (
      <p className="mt-4 rounded bg-surface p-3 text-sm text-muted ring-1 ring-white/10">
        Public content unavailable. {data.reason}
      </p>
    );
  }

  const flagged = data.items.filter((i) => i.flags.length > 0);
  const shown = showAll ? data.items : flagged;

  return (
    <div>
      <p className="mt-2 text-[11px] leading-tight text-muted">
        Finished rankings anyone can open. {flagged.length} of {data.items.length} match the
        blocklist — a hint for sorting, not a verdict.
      </p>

      {error && (
        <p className="mt-3 rounded bg-surface p-3 text-sm text-gold ring-1 ring-gold/30" role="status">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nothing flagged.{" "}
          {data.items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-gold underline underline-offset-2 hover:opacity-80"
            >
              Review all {data.items.length} public rankings
            </button>
          )}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((item) => (
            <li
              key={item.id}
              className={`rounded bg-surface p-3 ring-1 ${
                item.flags.length > 0 ? "ring-gold/40" : "ring-white/10"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted">
                    {item.ownerHandle ? `@${item.ownerHandle}` : "unclaimed handle"} ·{" "}
                    {item.visibility}
                    {item.participants.length > 0 && ` · with ${item.participants.join(", ")}`}
                  </p>
                  {item.flags.length > 0 && (
                    <p className="mt-1 text-[11px] text-gold">
                      Matched: {item.flags.join(", ")}
                    </p>
                  )}
                </div>
                <span className="flex gap-2">
                  <a
                    href={`/l/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${btn} bg-surface-raised text-text ring-1 ring-white/10 hover:bg-white/10`}
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => void hide(item.id)}
                    disabled={busyId === item.id}
                    title="Takes it out of public view. The owner keeps the ranking and their XP."
                    className={`${btn} bg-surface-raised text-text ring-1 ring-white/10 hover:bg-white/10`}
                  >
                    Make private
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!showAll && flagged.length > 0 && data.items.length > flagged.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-[11px] text-gold underline underline-offset-2 hover:opacity-80"
        >
          Show all {data.items.length} public rankings
        </button>
      )}
    </div>
  );
}
