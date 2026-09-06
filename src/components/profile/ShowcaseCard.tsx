"use client";

import { useState } from "react";
import { Laurel } from "@/components/Laurel";
import type { EvaluatedAchievement } from "@/lib/gamification";
import { MAX_PINNED_ACHIEVEMENTS, patchShowcase } from "@/lib/public-profile";

/**
 * The owner's achievements, and which three of them go on the public profile.
 *
 * This was a bordered panel of emoji tiles — a 40px tinted square holding 🎟️
 * or 🏛️, a rarity chip, a green "✓ Unlocked" line and a "+ Pin" button, twice
 * per row. Four pieces of chrome around one fact: you won this.
 *
 * Now the laurel IS the control: clicking one pins or unpins it, with the
 * state said in a word underneath and carried properly by `aria-pressed`.
 * Locked ones keep their description, because for those the description is
 * the instruction for earning it — but they are folded away, since the page
 * is about what this person HAS won.
 */
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

  const unlockedList = achievements.filter((a) => a.unlocked);
  const lockedList = achievements.filter((a) => !a.unlocked);

  return (
    <div>
      <p className="max-w-[70ch] text-sm leading-relaxed text-muted">
        Pin up to {MAX_PINNED_ACHIEVEMENTS} to show on your public profile.
      </p>

      {unlockedList.length === 0 ? (
        <p className="mt-5 text-sm text-muted">
          Finish a ranking to win your first laurel.
        </p>
      ) : (
        <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-5">
          {unlockedList.map((a) => {
            const isPinned = pinned.includes(a.key);
            const atPinCapacity = !isPinned && pinned.length >= MAX_PINNED_ACHIEVEMENTS;
            return (
              <li key={a.key}>
                <button
                  type="button"
                  onClick={() => toggle(a.key, a.unlocked)}
                  disabled={atPinCapacity}
                  aria-pressed={isPinned}
                  title={
                    atPinCapacity
                      ? `You can pin ${MAX_PINNED_ACHIEVEMENTS} — unpin one first. ${a.description}`
                      : a.description
                  }
                  className="flex flex-col items-center rounded transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Laurel className="text-base">{a.name}</Laurel>
                  <span
                    className={`mt-1 block text-xs ${isPinned ? "text-gold" : "text-muted"}`}
                  >
                    {isPinned ? "Pinned" : "Pin"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Readable, honest count, closed by default — see the note above: a
          collection that hides its contents cannot make anyone want anything,
          but it should not crowd out the ones already won either. */}
      {lockedList.length > 0 && (
        <details className="mt-8">
          <summary className="inline-block cursor-pointer list-none text-sm text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">
            Still to earn: {lockedList.length}
          </summary>
          <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            {lockedList.map((a) => (
              <li key={a.key}>
                <Laurel tone="muted">{a.name}</Laurel>
                <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-muted">
                  {a.description}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {failed && (
        <p role="status" className="mt-4 text-sm text-accent-red">
          Couldn&apos;t save that change — try again.
        </p>
      )}
    </div>
  );
}
