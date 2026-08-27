"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { extractListId } from "@/lib/versus";

export interface UserListOption {
  id: string;
  title: string;
}

export default function CompareHubClient({
  myLists,
}: {
  myLists: UserListOption[];
}) {
  const router = useRouter();
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const idA = extractListId(urlA);
    const idB = extractListId(urlB);

    if (!idA) {
      setError("Please provide a valid first list link or ID.");
      return;
    }
    if (!idB) {
      setError("Please provide a valid second list link or ID.");
      return;
    }
    if (idA === idB) {
      setError("Both links point to the same ranking — choose two different lists.");
      return;
    }

    router.push(`/compare/${idA}/${idB}`);
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Direct link comparison form */}
      <form onSubmit={handleSubmit} className="rounded-xl bg-surface p-6 ring-1 ring-white/10 sm:p-8 shadow-2xl">
        <h3 className="font-display text-2xl uppercase tracking-wide text-text">
          Compare Two Rankings
        </h3>
        <p className="mt-1 text-xs text-muted">
          Paste any two public or shared movieranker.win list links to compare their head-to-head compatibility.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="list-a" className="block text-xs font-semibold uppercase tracking-wider text-gold mb-1.5">
              First Ranking (Link or ID)
            </label>
            <input
              id="list-a"
              type="text"
              value={urlA}
              onChange={(e) => {
                setUrlA(e.target.value);
                setError(null);
              }}
              placeholder="e.g. movieranker.win/l/abc123 or list ID"
              className="h-11 w-full rounded-lg bg-surface-raised px-3.5 text-sm text-text placeholder:text-muted ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-gold"
            />
          </div>

          <div>
            <label htmlFor="list-b" className="block text-xs font-semibold uppercase tracking-wider text-gold mb-1.5">
              Second Ranking (Link or ID)
            </label>
            <input
              id="list-b"
              type="text"
              value={urlB}
              onChange={(e) => {
                setUrlB(e.target.value);
                setError(null);
              }}
              placeholder="e.g. movieranker.win/l/xyz789 or list ID"
              className="h-11 w-full rounded-lg bg-surface-raised px-3.5 text-sm text-text placeholder:text-muted ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-gold"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-accent-red font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="min-h-11 w-full rounded-full bg-gold px-6 text-sm font-bold uppercase tracking-wider text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold active:scale-[0.98]"
          >
            Launch Head-to-Head Comparison →
          </button>
        </div>
      </form>

      {/* If logged in, quick pick from your lists */}
      {myLists.length > 0 && (
        <div className="rounded-xl bg-surface p-6 ring-1 ring-white/10 sm:p-8">
          <h3 className="font-display text-xl uppercase tracking-wide text-text">
            Compare Against Your Lists
          </h3>
          <p className="mt-1 text-xs text-muted">
            Pick one of your settled lists as the starting anchor:
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {myLists.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/compare/${l.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-surface-raised p-3 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-gold group"
                >
                  <span className="truncate text-sm font-medium text-text group-hover:text-gold">
                    {l.title}
                  </span>
                  <span className="shrink-0 text-xs text-gold">
                    Pick →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
