"use client";

import { useEffect, useState } from "react";
import { CAREER_RANKS, UNLOCKS, rankForLevel } from "@/lib/gamification";

export default function LevelProgressionModal({
  currentLevel,
  currentXp,
}: {
  currentLevel: number;
  currentXp: number;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"earn" | "ranks">("earn");

  // Close modal on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs italic text-muted transition-colors duration-200 ease-out hover:text-gold hover:underline decoration-gold/40 underline-offset-2 focus-visible:outline-2 focus-visible:outline-gold"
      >
        <span aria-hidden="true" className="text-gold text-[10px]">✦</span>
        <span>How leveling &amp; XP work →</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="progression-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
        >
          <div
            className="relative w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4 sm:px-6">
              <div>
                <h2
                  id="progression-modal-title"
                  className="font-display text-xl uppercase tracking-wider text-gold flex items-center gap-2"
                >
                  <span aria-hidden="true">✦</span>
                  <span>Career &amp; XP Guide</span>
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  You are currently <strong className="text-text font-bold">Level {currentLevel}</strong> ({rankForLevel(currentLevel)}) · {currentXp} Lifetime XP
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close guide"
                className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-muted ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 bg-surface-raised/40 px-6 pt-2">
              <button
                type="button"
                onClick={() => setTab("earn")}
                className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  tab === "earn"
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                Ways to Earn XP
              </button>
              <button
                type="button"
                onClick={() => setTab("ranks")}
                className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  tab === "ranks"
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                Career Ranks &amp; Unlocks
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {tab === "earn" ? (
                <div className="space-y-3.5">
                  <div className="rounded-xl border border-white/10 bg-surface-raised/60 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">🎬</span>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-bold text-text">Rank Movies</h3>
                          <span className="font-mono text-xs font-bold text-gold">+1 XP / film</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          Every movie you sort and settle in a completed ranking earns +1 XP (up to a max of +20 XP per list).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 to-surface-raised/60 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">🎟️</span>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-bold text-gold">Friend Referrals &amp; Invites</h3>
                          <span className="font-mono text-xs font-bold text-gold">+15 XP bonus</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          Add friends to your lists (e.g. &ldquo;Sarah, Dave&rdquo;). When they join and claim their name with an account, you automatically receive +15 referral XP.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-surface-raised/60 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">🍿</span>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-bold text-text">Weekly Marquee Premiere</h3>
                          <span className="font-mono text-xs font-bold text-gold">+10 XP bonus</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          Rank this week&apos;s featured curated theme to contribute to community consensus and unlock marquee badges.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-surface-raised/60 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">👥</span>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-bold text-text">Double Feature Group Ranking</h3>
                          <span className="font-mono text-xs font-bold text-gold">+5 XP bonus</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          Rank lists with multiple participants on movie night to unlock group achievements and bonus experience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Unlocks List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gold">
                        Key Milestone Rewards
                      </h3>
                      {UNLOCKS.some((u) => currentLevel < u.atLevel) && (
                        <span className="rounded-full bg-gold/10 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-gold ring-1 ring-gold/30">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {UNLOCKS.map((u) => {
                        const isUnlocked = currentLevel >= u.atLevel;
                        return (
                          <div
                            key={u.name}
                            className={`flex items-center justify-between rounded-lg p-2.5 text-xs ring-1 transition-all ${
                              isUnlocked
                                ? "bg-gold/10 text-gold ring-gold/40 font-semibold"
                                : "bg-surface-raised/40 text-muted/60 ring-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{isUnlocked ? "✓" : "🔒"}</span>
                              <span className={isUnlocked ? "" : "filter blur-[2px] opacity-40 select-none"}>
                                {u.name}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-muted/80">Lv {u.atLevel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Career Ranks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                        All 10 Career Ranks
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {CAREER_RANKS.map((r) => {
                        const isCurrentRank = currentLevel >= r.minLevel && currentLevel <= r.maxLevel;
                        const isPassed = currentLevel > r.maxLevel;
                        const isLocked = !isPassed && !isCurrentRank;
                        return (
                          <div
                            key={r.rank}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ring-1 transition-all ${
                              isCurrentRank
                                ? "bg-gold/15 text-gold ring-gold font-bold shadow-sm"
                                : isPassed
                                  ? "bg-surface-raised/80 text-text ring-white/10"
                                  : "bg-surface text-muted/60 ring-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs w-4">
                                {isPassed ? "✓" : isCurrentRank ? "✦" : "🔒"}
                              </span>
                              <span className={isLocked ? "filter blur-[2px] opacity-40 select-none" : ""}>
                                {r.title}
                              </span>
                              {r.rank === 3 && (isPassed || isCurrentRank) && (
                                <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                                  Proposals Unlocked
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs text-muted/80">
                              Lv {r.minLevel}–{r.maxLevel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 bg-surface-raised/50 p-4 text-center">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-full bg-gold px-6 text-xs font-bold uppercase tracking-wider text-bg shadow-md hover:opacity-90 transition-opacity"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
