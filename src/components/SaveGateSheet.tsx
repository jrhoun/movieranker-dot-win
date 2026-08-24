"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finalizeRanks } from "@/lib/ranking";
import { clearSession, type PlaySession } from "@/lib/session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const inputCls =
  "h-11 w-full rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-150 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btnPrimary =
  "min-h-11 w-full rounded bg-accent px-5 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const btnAlt =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded bg-surface-raised px-5 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function SaveGateSheet({
  session,
  status,
  existingId,
  onClose,
}: {
  session: PlaySession;
  status: "done" | "draft";
  /** Set when finishing a resumed draft: update the existing list instead of POSTing a new one. */
  existingId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function performSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    const ranks = new Map(finalizeRanks(session.movies).map((r) => [r.tmdbId, r.rank]));
    const payload = {
      status,
      movies: session.movies.map((m) => ({
        ...m,
        finalRank: status === "done" ? (ranks.get(m.tmdbId) ?? null) : null,
      })),
    };
    let res: Response;
    try {
      res = await fetch(existingId ? `/api/lists/${existingId}` : "/api/lists", {
        method: existingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // PATCH is partial: only POST needs title/participants
        body: JSON.stringify(
          existingId ? payload : { ...payload, title: session.title, participants: session.participants },
        ),
      });
    } catch {
      // network throw — release the lock so the user can retry
      savingRef.current = false;
      setBusy(false);
      setNote("Saving failed — check your connection and try again.");
      return;
    }
    if (!res.ok) {
      savingRef.current = false;
      setBusy(false);
      setNote("Saving failed — check your connection and try again.");
      return;
    }
    const id = existingId ?? ((await res.json()) as { id: string }).id;
    clearSession();
    router.push(status === "done" ? `/l/${id}` : "/u/me");
  }

  // Returning from OAuth / magic link: the session cookie is already set.
  useEffect(() => {
    let cancelled = false;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled && data.user && !savingRef.current) void performSave();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // focus trap + Escape to close
  useEffect(() => {
    const panel = panelRef.current!;
    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
    focusables()[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!savingRef.current) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ignore close attempts (overlay click / Escape / ✕) while a save is in flight
  function requestClose() {
    if (!savingRef.current) onClose();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setBusy(false);
      setNote(error.message);
      return;
    }
    // email confirmation off -> immediate session; on -> user must confirm first
    const { data } = await supabase.auth.getUser();
    setBusy(false);
    if (data.user) void performSave();
    else
      setNote(
        "Check your inbox to confirm your account — your ranking stays in this browser until then.",
      );
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setNote("Enter your email above first.");
      return;
    }
    setBusy(true);
    setNote(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    setNote(error ? error.message : `Magic link sent to ${email}.`);
  }

  async function handleOAuth(provider: "google" | "azure") {
    setBusy(true);
    setNote(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setNote(error.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200 ease-out"
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={status === "done" ? "Save your masterpiece" : "Save as draft"}
        className="animate-sheet-up relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface p-5 pb-8 shadow-2xl ring-1 ring-white/10"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Save your masterpiece</h2>
            <p className="mt-0.5 text-xs text-muted">
              {status === "done"
                ? "Create an account to keep this ranking forever."
                : "Park it as a draft — finish voting any time."}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent active:text-text"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            aria-label="Email"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            aria-label="Password"
          />
          <button type="submit" disabled={busy} className={btnPrimary}>
            Sign up &amp; save
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted" role="separator">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-2.5">
          <button type="button" onClick={handleMagicLink} disabled={busy} className={btnAlt}>
            ✉ Email me a magic link
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={busy}
            className={btnAlt}
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("azure")}
            disabled={busy}
            className={btnAlt}
          >
            Continue with Microsoft
          </button>
        </div>

        {note && (
          <p role="status" className="mt-4 text-xs leading-relaxed text-accent">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
