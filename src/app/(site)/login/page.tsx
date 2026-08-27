"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/redirect";

// ?next= is passed by links to /login; the callback route re-validates it.
function requestedNext(): string | null {
  return new URLSearchParams(window.location.search).get("next");
}

function callbackUrl() {
  const next = requestedNext();
  return `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
}

const inputCls =
  "h-11 w-full rounded-lg bg-surface-raised px-3.5 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-150 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const btnPrimary =
  "min-h-11 w-full rounded-full bg-gold px-5 text-sm font-bold uppercase tracking-wider text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const btnAlt =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-raised px-5 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // already signed in? straight to your profile & lists
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace("/u/profile");
      });
  }, [router]);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // maybe they never had an account — fall back to signup
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      setNote(
        signUpError
          ? signUpError.message
          : "No existing account found — we created one. Check your inbox to confirm.",
      );
      return;
    }
    router.push(safeNext(requestedNext()));
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
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    setNote(error ? error.message : `Magic link sent to ${email}.`);
  }

  async function handleOAuth(provider: "google" | "azure") {
    setBusy(true);
    setNote(null);
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() },
      });
      if (error) throw error;
      // Resolved without navigating away: usually a blocked/closed popup.
      console.warn(`[auth] ${provider} sign-in returned without redirecting`);
      setBusy(false);
      setNote(
        "Couldn't open Google sign-in — allow popups for this site and try again.",
      );
    } catch (err) {
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
    <main className="bg-curtain flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-surface/95 p-6 sm:p-8 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
        <h1 className="font-display text-3xl uppercase tracking-wide text-text">Welcome Back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage and share your movie lists.</p>

        <form onSubmit={handlePassword} className="mt-5 space-y-3">
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
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            aria-label="Password"
          />
          <button type="submit" disabled={busy} className={btnPrimary}>
            Sign in
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
        </div>

        {note && (
          <p role="status" className="mt-4 text-xs leading-relaxed text-accent">
            {note}
          </p>
        )}

        <p className="mt-5 text-center text-xs text-muted">
          New here?{" "}
          <Link
            href="/"
            className="underline underline-offset-4 transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            Start ranking
          </Link>{" "}
          — you&apos;ll save at the end.
        </p>
      </div>
    </main>
  );
}
