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
  "h-11 w-full rounded bg-surface-raised px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-150 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btnPrimary =
  "min-h-11 w-full rounded bg-accent px-5 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const btnAlt =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded bg-surface-raised px-5 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // already signed in? straight to your lists
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace("/u/me");
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
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    setBusy(false);
    if (error) setNote(error.message);
  }

  return (
    <main className="bg-curtain flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded bg-surface p-6 ring-1 ring-white/10">
        <h1 className="text-xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to see your lists.</p>

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
