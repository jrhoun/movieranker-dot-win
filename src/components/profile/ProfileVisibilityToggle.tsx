"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Stored in auth user_metadata.profile_visibility ('public'|'private').
export default function ProfileVisibilityToggle({
  initial,
}: {
  initial: "public" | "private";
}) {
  const [value, setValue] = useState<"public" | "private">(initial);
  const [error, setError] = useState(false);

  async function set(next: "public" | "private") {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setError(false);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.updateUser({
      data: { profile_visibility: next },
    });
    if (err) {
      setValue(previous);
      setError(true);
    }
  }

  return (
    <div className="rounded bg-surface p-6 ring-1 ring-white/10">
      <p className="text-sm font-medium">Public profile page (coming with handles)</p>
      <p className="mt-1 text-xs text-muted">
        When public, your stats and level can appear on a shareable profile page later.
      </p>
      <div
        role="radiogroup"
        aria-label="Profile visibility"
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
            onClick={() => void set(opt.value)}
            className={`min-h-9 flex-1 px-3 text-xs transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
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
          Couldn&apos;t save — try again.
        </p>
      )}
    </div>
  );
}
