"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ProfileVisibilityToggle from "@/components/profile/ProfileVisibilityToggle";
import ClaimHandleCard from "@/components/profile/ClaimHandleCard";

interface SettingsClientProps {
  initialEmail: string;
  provider: string;
  handle: string | null;
  initialVisibility: "public" | "private";
  claimed: boolean;
}

export default function SettingsClient({
  initialEmail,
  provider,
  handle,
  initialVisibility,
  claimed,
}: SettingsClientProps) {
  const router = useRouter();
  const isGoogle = provider === "google";

  // Email update state (for email/password users)
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Deletion state
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const REQUIRED_PHRASE = "DELETE MY ACCOUNT";
  const isPhraseMatched = confirmPhrase.trim() === REQUIRED_PHRASE;

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || newEmail === initialEmail) return;
    setEmailBusy(true);
    setEmailMsg(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });

    setEmailBusy(false);
    if (error) {
      setEmailMsg({ type: "error", text: error.message });
    } else {
      setEmailMsg({
        type: "success",
        text: `Confirmation link sent to ${newEmail}. Please check your inbox to finalize the change.`,
      });
      setNewEmail("");
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export request failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movieranker-${handle || "backup"}-lists.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Could not export data. Please try again in a moment.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!isPhraseMatched) return;
    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Account deletion failed");
      }
      router.push("/?bye=1");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed");
      setDeleteBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      {/* 1. Identity & Profile Section */}
      <section aria-labelledby="identity-heading" className="rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h2 id="identity-heading" className="font-display text-lg uppercase tracking-wider text-text flex items-center gap-2">
            <span className="text-gold">✦</span> Identity &amp; Profile
          </h2>
          {claimed && handle && (
            <span className="font-mono text-xs text-gold font-medium bg-gold/10 px-2.5 py-0.5 rounded-full ring-1 ring-gold/30">
              @{handle}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {!claimed && (
            <div className="mb-2">
              <ClaimHandleCard />
            </div>
          )}

          <ProfileVisibilityToggle
            initial={initialVisibility}
            claimed={claimed}
            handle={handle}
          />
        </div>
      </section>

      {/* 2. Authentication & Sign-in */}
      <section aria-labelledby="auth-heading" className="rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg">
        <h2 id="auth-heading" className="font-display text-lg uppercase tracking-wider text-text flex items-center gap-2 pb-3 border-b border-white/5">
          <span className="text-gold">✉</span> Authentication &amp; Sign-In
        </h2>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-surface-raised p-3.5 ring-1 ring-white/5">
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-muted font-medium">
                Current Account Email
              </span>
              <span className="font-mono text-sm text-text font-medium mt-0.5 block">
                {initialEmail}
              </span>
            </div>
            {isGoogle && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-muted ring-1 ring-white/10 self-start sm:self-auto">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
                </svg>
                <span>Google OAuth</span>
              </div>
            )}
          </div>

          {isGoogle ? (
            <p className="text-xs text-muted leading-relaxed px-1">
              Your login authentication is managed securely by Google. To change your security credentials, update your Google Account.
            </p>
          ) : (
            <form onSubmit={handleEmailUpdate} className="space-y-2.5 pt-1">
              <label htmlFor="new-email" className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Change Email Address
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="new-email"
                  type="email"
                  required
                  placeholder="new-email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-10 flex-1 rounded-lg bg-surface-raised px-3.5 text-xs text-text placeholder:text-muted ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-gold"
                />
                <button
                  type="submit"
                  disabled={emailBusy || !newEmail}
                  className="min-h-10 shrink-0 rounded-lg bg-gold px-4 text-xs font-bold uppercase tracking-wider text-bg hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {emailBusy ? "Updating…" : "Update Email"}
                </button>
              </div>
              {emailMsg && (
                <p
                  role="status"
                  className={`text-xs ${emailMsg.type === "success" ? "text-accent-emerald font-medium" : "text-accent-red"}`}
                >
                  {emailMsg.text}
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* 3. Data & Backup Section */}
      <section aria-labelledby="export-heading" className="rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="export-heading" className="font-display text-lg uppercase tracking-wider text-text flex items-center gap-2">
              <span className="text-gold">💾</span> Data Export &amp; Backup
            </h2>
            <p className="mt-1 text-xs text-muted">
              Download an offline JSON copy of all your rankings and list records.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-gold/40 bg-surface-raised px-4 text-xs font-semibold uppercase tracking-wider text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
          >
            <span>↓</span>
            {exporting ? "Preparing Backup…" : "Export JSON"}
          </button>
        </div>
        {exportError && (
          <p role="alert" className="mt-2 text-xs text-accent-red">
            {exportError}
          </p>
        )}
      </section>

      {/* 4. Danger Zone (Collapsible Accordion to prevent accidental clicks) */}
      <details className="group rounded-xl border border-accent-red/30 bg-surface-raised/20 overflow-hidden shadow-lg transition-all duration-200">
        <summary className="flex cursor-pointer select-none items-center justify-between p-4 text-xs font-semibold uppercase tracking-wider text-accent-red hover:bg-accent-red/5 focus-visible:outline-none transition-colors">
          <div className="flex items-center gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>Danger Zone · Account Deletion</span>
          </div>
          <span className="text-xs text-muted group-open:rotate-180 transition-transform duration-200">
            ▼
          </span>
        </summary>

        <div className="border-t border-accent-red/20 p-5 space-y-4 bg-bg/40">
          <div className="rounded-lg bg-accent-red/10 border border-accent-red/30 p-3.5 text-xs text-text leading-relaxed">
            <p className="font-bold text-accent-red uppercase tracking-wider mb-1">
              Warning: Permanent &amp; Irreversible
            </p>
            <p className="text-muted">
              Deleting your account erases your profile, claimed handle, all created lists, matchup history, and level stats. This action cannot be undone.
            </p>
          </div>

          <div className="space-y-3">
            <label htmlFor="delete-confirm-input" className="block text-xs font-semibold uppercase tracking-wider text-muted">
              To confirm, type <span className="font-mono text-accent-red font-bold">{REQUIRED_PHRASE}</span> below:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmPhrase}
              onChange={(e) => {
                setConfirmPhrase(e.target.value);
                setDeleteError(null);
              }}
              placeholder={`Type "${REQUIRED_PHRASE}"`}
              autoComplete="off"
              className="h-10 w-full rounded-lg bg-surface-raised px-3 text-xs font-mono text-text placeholder:text-muted ring-1 ring-white/15 focus-visible:outline-2 focus-visible:outline-accent-red"
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={!isPhraseMatched || deleteBusy}
                className="min-h-10 rounded-full bg-accent-red px-5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-30 active:scale-[0.98]"
              >
                {deleteBusy ? "Deleting Account…" : "Permanently Delete Account"}
              </button>
              {deleteError && (
                <p role="alert" className="text-xs text-accent-red font-medium">
                  {deleteError}
                </p>
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
