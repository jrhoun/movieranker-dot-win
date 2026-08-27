"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/redirect";

// ?next= is passed by links to /login; the callback route re-validates it.
function requestedNext(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

function callbackUrl() {
  const next = requestedNext();
  const target = safeNext(next);
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
}

const inputCls =
  "h-11 w-full rounded-lg bg-surface-raised px-3.5 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-150 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const btnPrimary =
  "min-h-11 w-full rounded-full bg-gold px-5 text-sm font-bold uppercase tracking-wider text-bg shadow-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const btnAlt =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-raised px-5 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(() => {
    if (typeof window === "undefined") return "signin";
    return new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "signin";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    // already signed in? straight to intended page or home
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace(safeNext(requestedNext()));
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) {
        setNote({ type: "error", text: error.message });
      } else if (data?.user && !data.session) {
        setNote({
          type: "success",
          text: `Account created! We sent a confirmation link to ${email}. Please check your inbox.`,
        });
      } else {
        router.push(safeNext(requestedNext()));
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setBusy(false);
        setNote({
          type: "error",
          text: error.message.includes("Invalid login credentials")
            ? "Invalid email or password. If you don't have an account yet, click 'Create Account' above or use Magic Link."
            : error.message,
        });
        return;
      }
      router.push(safeNext(requestedNext()));
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setNote({ type: "error", text: "Enter your email above first to receive a magic sign-in link." });
      return;
    }
    setBusy(true);
    setNote(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (error) {
      setNote({ type: "error", text: error.message });
    } else {
      setNote({
        type: "success",
        text: `Magic link sent to ${email}. Click the link in your inbox to sign in or register instantly.`,
      });
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      setNote({
        type: "error",
        text: "Enter your email address above first, then click Forgot Password.",
      });
      return;
    }
    setBusy(true);
    setNote(null);
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings?reset=password`,
    });
    setBusy(false);
    if (error) {
      setNote({ type: "error", text: error.message });
    } else {
      setNote({
        type: "success",
        text: `Password reset instructions sent to ${email}. Please check your inbox.`,
      });
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setBusy(true);
    setNote(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[auth] ${provider} sign-in failed: ${msg}`);
      setBusy(false);
      setNote({
        type: "error",
        text: /not enabled|unsupported provider|invalid provider|provider is not/i.test(msg)
          ? "Google sign-in isn't set up yet — ask the site admin to enable it."
          : `Sign-in error: ${msg}`,
      });
    }
  }

  return (
    <main className="bg-curtain flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-surface/95 p-6 sm:p-8 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
        {/* Mode Selector Tabs */}
        <div className="mb-6 grid grid-cols-2 rounded-lg bg-surface-raised p-1 ring-1 ring-white/10" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => {
              setMode("signin");
              setNote(null);
            }}
            className={`rounded-md py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              mode === "signin"
                ? "bg-gold text-bg shadow-md"
                : "text-muted hover:text-text"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setNote(null);
            }}
            className={`rounded-md py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              mode === "signup"
                ? "bg-gold text-bg shadow-md"
                : "text-muted hover:text-text"
            }`}
          >
            Create Account
          </button>
        </div>

        <h1 className="font-display text-3xl uppercase tracking-wide text-text">
          {mode === "signin" ? "Welcome Back" : "Create Your Account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "signin"
            ? "Sign in to manage and share your movie lists."
            : "Join movieranker to save rankings, claim your @handle, and earn XP."}
        </p>

        {/* 1-Click Instant Providers */}
        <div className="mt-5 space-y-2.5">
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
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.98-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.98 3.1c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            {busy ? "Redirecting to Google..." : "Continue with Google"}
          </button>
          <button type="button" onClick={handleMagicLink} disabled={busy} className={btnAlt}>
            ✉ Email me a passwordless link
          </button>
          <p className="text-center text-[11px] text-muted/80">
            ✦ Google &amp; passwordless links sign in or register instantly with no password needed.
          </p>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted" role="separator">
          <span className="h-px flex-1 bg-white/10" />
          or use email &amp; password
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
          <div className="space-y-1">
            <input
              type="password"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signin" ? "Password" : "Create a password (min 6 characters)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              aria-label="Password"
              minLength={mode === "signup" ? 6 : undefined}
            />
            {mode === "signin" && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={busy}
                  className="text-[11px] text-muted hover:text-gold transition-colors underline underline-offset-2 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : mode === "signin"
                ? "Sign in"
                : "Create Account"}
          </button>
        </form>

        {note && (
          <p
            role="status"
            className={`mt-4 text-xs leading-relaxed ${
              note.type === "success"
                ? "text-gold"
                : note.type === "error"
                  ? "text-accent-red"
                  : "text-accent"
            }`}
          >
            {note.text}
          </p>
        )}

        <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-muted">
          {mode === "signin" ? (
            <p>
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setNote(null);
                }}
                className="font-bold text-gold underline underline-offset-4 hover:text-white cursor-pointer"
              >
                Create one now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setNote(null);
                }}
                className="font-bold text-gold underline underline-offset-4 hover:text-white cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
