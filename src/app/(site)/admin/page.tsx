"use client";

import { useEffect, useState } from "react";
import MarqueeHeading from "@/components/MarqueeHeading";

interface Proposal {
  id: string;
  title: string;
  blurb: string | null;
  movie_ids: number[];
  status: string;
}

const btn =
  "min-h-11 rounded px-4 text-sm font-semibold transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";

export default function AdminPage() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/proposals");
    if (!res.ok) {
      // Not the owner (or OWNER_EMAIL unset): show nothing, reveal nothing.
      setProposals([]);
      return;
    }
    const json = (await res.json()) as { proposals?: Proposal[] };
    setProposals(json.proposals ?? []);
  }

  useEffect(() => {
    // async hop so pre-hydration markup matches first client render (same as home)
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, []);

  async function decide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    await fetch("/api/admin/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusyId(null);
    void load();
  }

  const pending = (proposals ?? []).filter((p) => p.status === "pending");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <MarqueeHeading as="h2">Proposals</MarqueeHeading>
      {proposals === null ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No pending proposals.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {pending.map((p) => (
            <li key={p.id} className="rounded bg-surface p-4 ring-1 ring-white/10">
              <h3 className="font-semibold">{p.title}</h3>
              {p.blurb && <p className="mt-0.5 text-sm text-muted">{p.blurb}</p>}
              <p className="mt-1 font-mono text-xs text-muted">
                {p.movie_ids.join(", ")}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void decide(p.id, "approved")}
                  disabled={busyId === p.id}
                  className={`${btn} bg-gold text-bg`}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void decide(p.id, "rejected")}
                  disabled={busyId === p.id}
                  className={`${btn} bg-surface-raised text-text ring-1 ring-white/10 hover:bg-white/10`}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
