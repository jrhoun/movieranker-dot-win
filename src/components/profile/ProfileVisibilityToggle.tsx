"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

// Stored in profiles.visibility ('public'|'private') via PATCH /api/profile.
// Requires a claimed handle — the profiles row is created by the claim flow.
// `handle` personalizes the helper copy once claimed.
export default function ProfileVisibilityToggle({
  initial,
  claimed,
  handle,
}: {
  initial: "public" | "private";
  claimed: boolean;
  handle?: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<"public" | "private">(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function set(next: "public" | "private") {
    if (!claimed || next === value || saving) return;
    const previous = value;
    setValue(next);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (res.status === 409) {
        setValue(previous);
        setError("Claim a handle first.");
      } else if (!res.ok) {
        setValue(previous);
        setError("Couldn't save — try again.");
      } else {
        // Sync server-rendered bits that depend on visibility (e.g. the
        // "Preview Profile" link on /u/profile).
        router.refresh();
      }
    } catch {
      setValue(previous);
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg bg-surface p-5 ring-1 ring-white/10 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">Profile Visibility</h3>
        {claimed && handle && (
          <Link
            href={`/u/${handle}`}
            className="text-xs font-semibold text-gold hover:underline flex items-center gap-1"
          >
            Preview Profile (/u/{handle}) ↗
          </Link>
        )}
      </div>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        {claimed
          ? handle
            ? `Your public profile lives at movieranker.win/u/${handle}. Choose whether anyone on the open web can explore it.`
            : "Choose whether anyone on the open web can explore your profile."
          : "Claim a handle above to activate your public profile page."}
      </p>
      <div
        role="radiogroup"
        aria-label="Profile visibility"
        aria-disabled={!claimed}
        className="mt-3 flex overflow-hidden rounded-lg bg-surface-raised ring-1 ring-white/15 p-1 gap-1"
      >
        {(
          [
            {
              value: "private",
              label: "🔒 Private",
              title: "Only you can see your profile.",
              desc: "Hidden from search engines and other users.",
            },
            {
              value: "public",
              label: "🌐 Public",
              title: "Your profile is viewable by anyone at movieranker.win/u/your-handle.",
              desc: "Anyone on the web with your link can view your profile and public rankings.",
            },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            title={opt.title}
            disabled={!claimed}
            onClick={() => void set(opt.value)}
            className={`min-h-10 flex-1 rounded-md px-3 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40 ${
              value === opt.value
                ? "bg-gold/20 text-gold ring-1 ring-gold shadow"
                : "text-muted hover:bg-white/5 hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-accent-red">
          {error}
        </p>
      )}
    </div>
  );
}
