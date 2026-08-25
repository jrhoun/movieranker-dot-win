"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Quiet pill buttons; this is a secondary section, not a primary action.
const btnCls =
  "min-h-11 rounded-full border border-white/15 px-4 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export default function AccountSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportLists() {
    setError(null);
    const res = await fetch("/api/account/export");
    if (!res.ok) {
      setError("Export failed — try again.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movieranker-lists.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Deletion failed — try again.");
      setBusy(false);
      return;
    }
    router.push("/?bye=1");
  }

  return (
    <section aria-labelledby="account-heading" className="mt-8">
      {/* Native details disclosure: account care is rare, keep it collapsed. */}
      <details className="rounded bg-surface ring-1 ring-white/10">
        <summary
          id="account-heading"
          className="flex min-h-11 cursor-pointer select-none items-center justify-between px-4 font-display text-xl uppercase tracking-[0.12em] transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold [&::-webkit-details-marker]:hidden"
        >
          Account
          <span aria-hidden="true" className="text-muted">
            ▾
          </span>
        </summary>
        <div className="border-t border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={exportLists} disabled={busy} className={`${btnCls} hover:border-white/30 hover:text-text`}>
            Export my lists
          </button>
          {!confirming && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirming(true);
                setTyped("");
              }}
              className={`${btnCls} text-accent-red hover:border-accent-red`}
            >
              Delete my account
            </button>
          )}
        </div>

        {confirming && (
          <div className="mt-4 rounded bg-surface-raised p-4 ring-1 ring-accent-red/40">
            {/* Prominent warning: this action is immediate and irreversible. */}
            <p className="text-sm font-medium text-accent-red">
              This permanently erases your account and every list you&apos;ve made.
            </p>
            <label htmlFor="delete-confirm" className="mt-2 block text-sm text-muted">
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="mt-1 min-h-11 w-full max-w-48 rounded bg-bg px-3 text-sm text-text ring-1 ring-white/15 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={btnCls}>
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={typed !== "DELETE" || busy}
                className={`${btnCls} border-accent-red text-accent-red enabled:hover:bg-accent-red/10 disabled:opacity-40`}
              >
                {busy ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-accent-red">
            {error}
          </p>
        )}
        </div>
      </details>
    </section>
  );
}
