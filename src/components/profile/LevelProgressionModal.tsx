"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAREER_RANKS,
  CO_CURATION_XP,
  CONNECTION_SOLVE_XP,
  MARQUEE_COMPLETION_XP,
  MAX_XP_PER_LIST,
  REFERRAL_XP_BONUS,
  UNLOCKS,
  rankForLevel,
  type XpBreakdown,
} from "@/lib/gamification";

/**
 * The career guide.
 *
 * Every price here is READ FROM THE CONSTANT that pays it. The previous version
 * restated the numbers in prose and drifted: it advertised a "+10 XP" marquee
 * bonus and a "+5 XP" group bonus that no code ever paid, next to a promise
 * that theme proposals unlocked at Level 3 when the API rejected anything under
 * 20. A guide that quotes a price the system will not honour is worse than no
 * guide, so the copy cannot state a number the code does not.
 *
 * Each row also shows what this person has actually earned from that source,
 * which is the part that makes the economy legible rather than merely stated.
 */
type Source = {
  icon: string;
  name: string;
  price: string;
  detail: string;
  earned: number;
};

export default function LevelProgressionModal({
  currentLevel,
  currentXp,
  breakdown,
  challenges = [],
  label = "How leveling & XP work →",
  initialTab = "earn",
}: {
  currentLevel: number;
  currentXp: number;
  breakdown: XpBreakdown;
  challenges?: { name: string; description: string; icon: string; unlocked: boolean }[];
  /** Trigger wording, so the same guide can be opened from more than one place. */
  label?: string;
  /** Which tab to land on. The unlocks card opens straight to the list it summarises. */
  initialTab?: "earn" | "ranks";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"earn" | "ranks">(initialTab);
  const [open, setOpen] = useState(false);

  // showModal() puts the dialog in the top layer, which brings Escape, a focus
  // trap, focus restoration and ::backdrop with it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const sources: Source[] = [
    {
      icon: "🎬",
      name: "Rank a film",
      price: "+1 each",
      detail: `Every film you settle in a ranking you finish, up to ${MAX_XP_PER_LIST} per list. Drafts do not count — the XP is for sorting them, not for adding them.`,
      earned: breakdown.movies,
    },
    {
      icon: "🍿",
      name: "Finish a weekly Marquee",
      price: `+${MARQUEE_COMPLETION_XP}`,
      detail: "On top of the films themselves, for ranking the set everyone else is ranking.",
      earned: breakdown.marquee,
    },
    {
      icon: "🔍",
      name: "Crack the connection",
      price: `+${CONNECTION_SOLVE_XP}`,
      detail: "Work out the thread running through a weekly set. One guess, so it counts.",
      earned: breakdown.connections,
    },
    {
      icon: "👥",
      name: "Rank with co-curators",
      price: `+${CO_CURATION_XP}`,
      detail: "Finish a ranking that credits the people you made it with.",
      earned: breakdown.coCuration,
    },
    {
      icon: "🎟️",
      name: "A friend claims their spot",
      price: `+${REFERRAL_XP_BONUS}`,
      detail: "Someone you credited on a list joins and takes their name.",
      earned: breakdown.referrals,
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 text-xs italic text-muted transition-colors duration-200 ease-out hover:text-gold hover:underline decoration-gold/40 underline-offset-2 focus-visible:outline-2 focus-visible:outline-gold"
      >
        <span aria-hidden="true" className="text-gold text-[10px]">✦</span>
        <span>{label}</span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="progression-modal-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="m-auto w-full max-w-xl bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        {/* Mounted only while open. The guide is a few hundred nodes and the
            page now offers two ways in — rendering it unconditionally would
            have put two hidden copies of it in every profile's DOM. */}
        {open && (
        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-2xl ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:px-6">
            <div>
              <h2
                id="progression-modal-title"
                className="flex items-center gap-2 font-display text-xl uppercase tracking-wider text-gold"
              >
                <span aria-hidden="true">✦</span>
                <span>Career &amp; XP Guide</span>
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Level <strong className="font-bold text-text">{currentLevel}</strong> ·{" "}
                {rankForLevel(currentLevel)} · {currentXp} XP earned
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close guide"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-muted ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
            >
              ✕
            </button>
          </div>

          <div className="flex border-b border-white/10 bg-surface-raised/40 px-4 pt-2 sm:px-6">
            {(
              [
                ["earn", "Ways to earn XP"],
                ["ranks", "Ranks & unlocks"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-current={tab === key}
                className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  tab === key
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            {tab === "earn" ? (
              <>
                {sources.map((s) => (
                  <div
                    key={s.name}
                    className="rounded-xl border border-white/10 bg-surface-raised/60 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl" aria-hidden="true">
                        {s.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-bold text-text">{s.name}</h3>
                          <span className="shrink-0 font-mono text-xs font-bold text-gold">
                            {s.price} XP
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{s.detail}</p>
                        <p className="mt-1.5 font-mono text-[11px] tabular-nums text-gold/80">
                          {s.earned > 0 ? `${s.earned} XP earned so far` : "Nothing earned yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-center font-mono text-[11px] text-muted">
                  {breakdown.total} XP earned in total
                </p>
              </>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
                    What levels unlock
                  </h3>
                  <ul className="space-y-1.5">
                    {UNLOCKS.map((u) => {
                      const has = currentLevel >= u.atLevel;
                      return (
                        <li
                          key={u.name}
                          className={`flex items-start gap-2.5 rounded-lg p-2.5 text-xs ring-1 ${
                            has ? "bg-gold/10 ring-gold/30" : "bg-surface-raised/40 ring-white/5"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={has ? "text-gold" : "text-muted/60"}
                          >
                            {has ? "✓" : "○"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={`font-semibold ${has ? "text-gold" : "text-text/70"}`}
                              >
                                {u.name}
                              </span>
                              <span className="shrink-0 font-mono text-[10px] text-muted">
                                Lv {u.atLevel}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted">{u.effect}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {challenges.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-gold">
                      Challenges
                    </h3>
                    <p className="mb-2 text-[11px] leading-snug text-muted">
                      Earned by doing something hard rather than by being early. No level will
                      hand you these.
                    </p>
                    <ul className="space-y-1.5">
                      {challenges.map((c) => (
                        <li
                          key={c.name}
                          className={`flex items-start gap-2.5 rounded-lg p-2.5 text-xs ring-1 ${
                            c.unlocked
                              ? "bg-gold/10 ring-gold/30"
                              : "bg-surface-raised/40 ring-white/5"
                          }`}
                        >
                          <span aria-hidden="true">{c.icon}</span>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`font-semibold ${
                                c.unlocked ? "text-gold" : "text-text/70"
                              }`}
                            >
                              {c.name}
                            </span>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted">
                              {c.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                    All ten career ranks
                  </h3>
                  <ul className="space-y-1">
                    {CAREER_RANKS.map((r) => {
                      const isCurrent = currentLevel >= r.minLevel && currentLevel <= r.maxLevel;
                      const isPassed = currentLevel > r.maxLevel;
                      return (
                        <li
                          key={r.rank}
                          aria-current={isCurrent}
                          className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ring-1 ${
                            isCurrent
                              ? "bg-gold/15 text-gold ring-gold/40"
                              : isPassed
                                ? "bg-surface-raised/60 text-text/70 ring-white/5"
                                : "bg-surface-raised/30 text-muted ring-white/5"
                          }`}
                        >
                          <span className="font-semibold">
                            {isPassed && (
                              <span aria-hidden="true" className="mr-1.5 text-gold/70">
                                ✓
                              </span>
                            )}
                            {r.title}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums">
                            Lv {r.minLevel}–{r.maxLevel}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </dialog>
    </>
  );
}
