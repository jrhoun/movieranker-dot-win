"use client";

import { useState } from "react";

// Stored in profiles.visibility ('public'|'private') via PATCH /api/profile.
// Requires a claimed handle — the profiles row is created by the claim flow.
export default function ProfileVisibilityToggle({
  initial,
  claimed,
}: {
  initial: "public" | "private";
  claimed: boolean;
}) {
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
      }
    } catch {
      setValue(previous);
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded bg-surface p-6 ring-1 ring-white/10">
      <p className="text-sm font-medium">Public profile page (coming with handles)</p>
      <p className="mt-1 text-xs text-muted">
        {claimed
          ? "When public, your stats and level can appear on a shareable profile page later."
          : "Claim a handle above to control your visibility."}
      </p>
      <div
        role="radiogroup"
        aria-label="Profile visibility"
        aria-disabled={!claimed}
        className="mt-3 flex overflow-hidden rounded ring-1 ring-white/15"
      >
        {(
          [
            { value: "private", label: "Private", title: "Only you can see your profile." },
            {
              value: "public",
              label: "Public",
              title: "Your profile page will be viewable by anyone.",
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
            className={`min-h-9 flex-1 px-3 text-xs transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
              value === opt.value
                ? "bg-gold/15 font-semibold text-gold"
                : "text-muted hover:bg-white/5"
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
