"use client";

import { useState } from "react";
import type { EvaluatedAchievement } from "@/lib/gamification";
import { MAX_PINNED_ACHIEVEMENTS, patchShowcase } from "@/lib/public-profile";

// Showcase curation: toggleable chips pinning up to 3 unlocked achievements.
// Locked ones stay dimmed + disabled; persistence is optimistic via PATCH.
export default function ShowcaseCard({
  achievements,
  initialKeys,
}: {
  achievements: EvaluatedAchievement[];
  initialKeys: string[];
}) {
  const [pinned, setPinned] = useState<string[]>(initialKeys);
  const [failed, setFailed] = useState(false);

  function toggle(key: string, unlocked: boolean) {
    if (!unlocked) return;
    const isPinned = pinned.includes(key);
    const next = isPinned
      ? pinned.filter((k) => k !== key)
      : pinned.length >= MAX_PINNED_ACHIEVEMENTS
        ? null // at capacity — ignore extra pins
        : [...pinned, key];
    if (next === null) return;
    const prev = pinned;
    setPinned(next);
    setFailed(false);
    void patchShowcase({ achievementKeys: next }).then((ok) => {
      if (!ok) {
        setPinned(prev);
        setFailed(true);
      }
    });
  }

  return (
    <section aria-labelledby="achv-heading" className="rounded bg-surface p-3 ring-1 ring-white/10">
      <h2 id="achv-heading" className="font-display text-sm uppercase tracking-[0.14em] text-muted">
        Achievements
      </h2>
      <p className="mt-0.5 text-[11px] text-muted">
        Pin up to {MAX_PINNED_ACHIEVEMENTS} to feature on your public profile.
      </p>
      <ul aria-label="Achievements" className="mt-2 flex flex-wrap gap-1.5">
        {achievements.map((a) => {
          const isPinned = pinned.includes(a.key);
          const disabled = !a.unlocked || (!isPinned && pinned.length >= MAX_PINNED_ACHIEVEMENTS);
          return (
            <li key={a.key}>
              <button
                type="button"
                onClick={() => toggle(a.key, a.unlocked)}
                disabled={disabled}
                aria-pressed={isPinned}
                title={
                  !a.unlocked
                    ? a.description
                    : isPinned
                      ? `Pinned — click to unpin (${a.description})`
                      : disabled
                        ? `Pin limit reached (${a.description})`
                        : `Click to pin (${a.description})`
                }
                className={`min-h-9 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none ${
                  isPinned
                    ? "bg-gold/15 text-gold ring-2 ring-gold"
                    : a.unlocked
                      ? "bg-surface-raised text-muted ring-white/15 hover:bg-white/10 hover:text-text"
                      : "bg-surface-raised text-muted ring-white/10 opacity-70"
                }`}
              >
                <span aria-hidden="true" className={`mr-1 ${isPinned ? "" : "text-muted"}`}>
                  {isPinned ? "★" : a.unlocked ? "✓" : "·"}
                </span>
                {a.name}
              </button>
            </li>
          );
        })}
      </ul>
      {failed && (
        <p role="status" className="mt-1 text-[11px] text-accent-red">
          Couldn&apos;t save — try again.
        </p>
      )}
    </section>
  );
}
