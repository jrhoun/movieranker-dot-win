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
  onAuthRedirect,
}: {
  session: PlaySession;
  status: "done" | "draft";
  /** Set when finishing a resumed draft: update the existing list instead of POSTing a new one. */
  existingId?: string;
  onClose: () => void;
  /** Called when an OAuth redirect away from the page begins (leave-warning must disarm). */
  onAuthRedirect?: () => void;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [showDesc, setShowDesc] = useState(false);
  const [description, setDescription] = useState("");

  async function performSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    const ranks = new Map(finalizeRanks(session.movies).map((r) => [r.tmdbId, r.rank]));
    const desc = description.trim();
    const payload = {
      status,
      movies: session.movies.map((m) => ({
        ...m,
        finalRank: status === "done" ? (ranks.get(m.tmdbId) ?? null) : null,
      })),
      // PATCH is partial: only send description when the user wrote one
      ...(desc ? { description: desc } : {}),
    };
    let res: Response;
    try {
      res = await fetch(existingId ? `/api/lists/${existingId}` : "/api/lists", {
        method: existingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // PATCH is partial: only POST needs title/participants (+ theme metadata);
        // themeSlug/curated only ride along when the session came from a theme
        body: JSON.stringify(
          existingId
            ? payload
            : {
                ...payload,
                title: session.title,
                participants: session.participants,
                ...(session.themeSlug
                  ? {
                      themeSlug: session.themeSlug,
                      curated: !!session.curated,
                      visibility: "public",
                    }
                  : {}),
              },
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
      const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
      savingRef.current = false;
      setBusy(false);
      setNote(
        errJson?.error
          ? `Saving failed: ${errJson.error}`
          : `Saving failed (${res.status}) — check your connection and try again.`
      );
      return;
    }
    const id = existingId ?? ((await res.json()) as { id: string }).id;
    clearSession();
    router.push(status === "done" ? `/l/${id}` : "/u/profile");
  }

  const [signedInUser, setSignedInUser] = useState(false);

  // Returning from OAuth / magic link: the session cookie is already set.
  useEffect(() => {
    let cancelled = false;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled && data.user) {
          setSignedInUser(true);
          if (!savingRef.current) void performSave();
        }
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
    if (data.user) {
      setSignedInUser(true);
      void performSave();
    } else {
      setNote(
        "Check your inbox to confirm your account — your ranking stays in this browser until then.",
      );
    }
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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/r/play")}`,
      },
    });
    setBusy(false);
    setNote(error ? error.message : `Magic link sent to ${email}.`);
  }

  async function handleOAuth(provider: "google" | "azure") {
    setBusy(true);
    setNote(null);
    try {
      sessionStorage.setItem("mr_pending_auth_save", status);
    } catch {}
    // page is about to navigate away — host must disarm its leave-warning
    onAuthRedirect?.();
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/r/play")}`,
        },
      });
      if (error) throw error;
      // Resolved without navigating away: usually a blocked/closed popup.
      console.warn(`[auth] ${provider} sign-in returned without redirecting`);
      try {
        sessionStorage.removeItem("mr_pending_auth_save");
      } catch {}
      setBusy(false);
      setNote(
        "Couldn't open Google sign-in — allow popups for this site and try again.",
      );
    } catch (err) {
      try {
        sessionStorage.removeItem("mr_pending_auth_save");
      } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[auth] ${provider} sign-in failed: ${msg}`);
      setBusy(false);
      setNote(
        /not enabled|unsupported provider|invalid provider|provider is not/i.test(
          msg,
        )
          ? "Google sign-in isn't set up yet — ask the site admin to enable it."
          : "Couldn't start Google sign-in — please try again.",
      );
    }
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
        aria-label={status === "done" ? "Save your list" : "Save as draft"}
        className="animate-sheet-up relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface p-5 pb-8 shadow-2xl ring-1 ring-white/10"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Save your ranking</h2>
            <p className="mt-0.5 text-xs text-muted">
              {signedInUser
                ? "Saving directly to your account…"
                : status === "done"
                  ? "Create an account to keep this ranking forever."
                  : "Park it as a draft — finish voting any time."}
            </p>
          </div>
          {!signedInUser && (
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="-mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent active:text-text"
            >
              ✕
            </button>
          )}
        </div>

        {signedInUser ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
            <span className="text-2xl text-gold animate-spin">✦</span>
            <p className="text-sm font-semibold text-text">Saving your ranking…</p>
          </div>
        ) : (
          <>
            {session.themeSlug && (
              <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-gold/10 p-3 text-xs text-gold ring-1 ring-gold/30">
                <span className="text-sm shrink-0" aria-hidden="true">✦</span>
                <p className="leading-snug text-gold">
                  <strong>Weekly Marquee:</strong> Rankings for weekly themes are public by default to power collective community stats and consensus.
                </p>
              </div>
            )}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={busy}
                className={btnAlt}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                  />
                </svg>
                Continue with Google
              </button>
              <button type="button" onClick={handleMagicLink} disabled={busy} className={btnAlt}>
                ✉ Email me a magic link
              </button>
            </div>

            <div className="my-4 flex items-center gap-3 text-xs text-muted" role="separator">
              <span className="h-px flex-1 bg-white/10" />
              or with email &amp; password
              <span className="h-px flex-1 bg-white/10" />
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

            <div className="mt-4 border-t border-white/10 pt-3">
              {!showDesc ? (
                <button
                  type="button"
                  onClick={() => setShowDesc(true)}
                  className="min-h-10 w-full rounded px-2 text-xs sm:text-sm text-muted underline-offset-4 transition-colors duration-200 ease-out hover:text-gold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  + Add the story behind this ranking (optional)
                </button>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="save-ranking-desc" className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Story behind this ranking (optional)
                  </label>
                  <textarea
                    id="save-ranking-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="What inspired this list or debate?"
                    className={`${inputCls} h-auto py-2.5 leading-relaxed`}
                  />
                </div>
              )}
            </div>

            {note && (
              <p role="status" className="mt-3 text-xs leading-relaxed text-accent">
                {note}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
