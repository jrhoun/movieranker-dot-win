"use client";

import { useState } from "react";
import type { EvaluatedAchievement } from "@/lib/gamification";
import { MAX_PINNED_ACHIEVEMENTS, patchShowcase } from "@/lib/public-profile";

// Showcase curation: Trophy Case with unlocked badges and locked milestones.
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
    <section aria-labelledby="achv-heading" className="rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <h2 id="achv-heading" className="font-display text-base uppercase tracking-[0.14em] text-gold flex items-center gap-2">
            <span>🏆</span>
            <span>Trophy Case</span>
          </h2>
          <p className="mt-1 text-xs text-muted">
            Pin up to {MAX_PINNED_ACHIEVEMENTS} trophies to showcase on your public profile.
          </p>
        </div>
        <span className="rounded-full bg-gold/10 px-3 py-1 font-mono text-xs font-semibold text-gold ring-1 ring-gold/30">
          {unlockedList.length} / {achievements.length} Unlocked
        </span>
      </div>

      {/* Unlocked Trophies Container */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text/80 mb-2.5">
          Unlocked Trophies
        </h3>
        {unlockedList.length === 0 ? (
          <p className="rounded-lg bg-surface-raised/40 p-4 text-xs italic text-muted/80 ring-1 ring-white/5">
            Complete your first ranking to unlock your opening night trophy!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {unlockedList.map((a) => {
              const isPinned = pinned.includes(a.key);
              const atPinCapacity = !isPinned && pinned.length >= MAX_PINNED_ACHIEVEMENTS;
              return (
                <div
                  key={a.key}
                  className={`group relative flex items-start gap-3 rounded-xl p-3 ring-1 transition-all duration-200 ${
                    isPinned
                      ? "bg-gold/10 ring-gold/60 shadow-md shadow-gold/5"
                      : "bg-surface-raised ring-white/10 hover:ring-white/20"
                  }`}
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner ring-1 ${
                      a.rarity === "legendary"
                        ? "bg-gold/20 text-gold ring-gold/50 shadow-gold/20"
                        : a.rarity === "rare"
                          ? "bg-purple-500/20 text-purple-300 ring-purple-500/30"
                          : "bg-white/10 text-text ring-white/15"
                    }`}
                  >
                    {a.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-text truncate">{a.name}</h4>
                      {a.rarity === "legendary" && (
                        <span className="rounded bg-gold/20 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider text-gold">
                          Legendary
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted">{a.description}</p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        <span>✓</span> Unlocked
                      </span>

                      <button
                        type="button"
                        onClick={() => toggle(a.key, a.unlocked)}
                        disabled={atPinCapacity}
                        aria-pressed={isPinned}
                        title={
                          isPinned
                            ? "Unpin from public showcase"
                            : atPinCapacity
                              ? `Pin capacity reached (${MAX_PINNED_ACHIEVEMENTS})`
                              : "Pin to public showcase"
                        }
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                          isPinned
                            ? "bg-gold text-bg font-bold shadow"
                            : atPinCapacity
                              ? "bg-white/5 text-muted/40 cursor-not-allowed"
                              : "bg-white/10 text-muted hover:bg-gold/20 hover:text-gold"
                        }`}
                      >
                        {isPinned ? "★ Pinned" : "+ Pin"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Locked Trophies Container */}
      {lockedList.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted/70 flex items-center gap-2">
              <span>Locked Milestones</span>
              <span className="rounded-full bg-gold/10 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-gold ring-1 ring-gold/30">
                Coming Soon
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {lockedList.map((a) => (
              <div
                key={a.key}
                className="relative overflow-hidden flex items-start gap-3 rounded-xl bg-surface-raised/30 p-3 ring-1 ring-white/5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/40 text-sm text-muted ring-1 ring-white/5 z-10">
                  🔒
                </div>
                <div className="min-w-0 flex-1 filter blur-[2.5px] opacity-35 select-none">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-muted truncate">{a.name}</h4>
                    {a.rarity === "legendary" && (
                      <span className="rounded bg-white/5 px-1 py-0.2 text-[9px] font-medium uppercase tracking-wider text-muted">
                        Legendary
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted/80">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {failed && (
        <p role="status" className="mt-3 text-xs text-accent-red">
          Couldn&apos;t save showcase changes — try again.
        </p>
      )}
    </section>
  );
}
