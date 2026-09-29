"use client";

import { useEffect, useRef, useState } from "react";
import { Laurel } from "@/components/Laurel";
import {
  CAREER_RANKS,
  CO_CURATION_XP,
  CONNECTION_SOLVE_XP,
  MARQUEE_COMPLETION_XP,
  MAX_LEVEL,
  MAX_XP_PER_LIST,
  REFERRAL_XP_BONUS,
  UNLOCKS,
  rankForLevel,
  xpForLevel,
  type XpBreakdown,
} from "@/lib/gamification";

/**
 * Your career.
 *
 * This is the only place a player sees the whole arc of the game, so it is
 * built as a ladder rather than as a settings page: the ten ranks stacked with
 * the top rank at the top, every unlock hanging on the level that hands it
 * over, and the XP prices beside them. It used to be two tabs of emoji rows,
 * which meant the shape of the climb was something you had to reconstruct from
 * lists.
 *
 * Every price here is READ FROM THE CONSTANT that pays it. An earlier version
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
  name: string;
  price: string;
  detail: string;
  earned: number;
};


/**
 * Lower-case the first letter of a name written for a headline, so it can sit
 * mid-sentence. The names live in gamification.ts and are shared with surfaces
 * that use them as titles, so they are cased down here rather than duplicated.
 */
function midSentence(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * The one-sentence standing: where you are, and what the next level costs.
 *
 * Everything is measured against `currentLevel`, the same prop the ladder marks
 * "You are here", rather than against the level implied by `currentXp`. The two
 * agree for every caller today (both come from `levelFor(lifetimeXp)`), and the
 * cost is identical to what `xpProgress` reports — but if they ever drift, this
 * sentence stays coherent instead of reading "Level 18 ... takes you to level
 * 21".
 */
export function careerSummary(currentLevel: number, currentXp: number): string {
  const standing = `Level ${currentLevel}, ${rankForLevel(currentLevel)}, with ${currentXp} XP.`;

  if (currentLevel >= MAX_LEVEL) {
    return `${standing} Cinema Legend is the last rank, so every rung is behind you.`;
  }

  const nextLevel = currentLevel + 1;
  const remaining = xpForLevel(nextLevel) - currentXp;

  return remaining > 0
    ? `${standing} ${remaining} more takes you to level ${nextLevel}.`
    : `${standing} You already have the XP for level ${nextLevel}.`;
}

/**
 * The two panes. Split out from the dialog so the whole body can be rendered
 * and read in a test without a DOM — a `<dialog>` only shows its contents
 * once something has called showModal().
 */
export function CareerPanes({
  currentLevel,
  currentXp,
  breakdown,
  ladderRef,
  earnRef,
}: {
  currentLevel: number;
  /**
   * The XP the header shows: the banked lifetime peak after the ratchet, not
   * `breakdown.total`. The two disagree whenever a list has been deleted, and
   * the footer used to quote the fresh total under a header quoting the banked
   * one — two numbers for "your XP" in the same dialog.
   */
  currentXp: number;
  breakdown: XpBreakdown;
  ladderRef?: React.Ref<HTMLElement>;
  earnRef?: React.Ref<HTMLElement>;
}) {
  const keptXp = Math.max(0, currentXp - breakdown.total);
  const sources: Source[] = [
    {
      name: "Rank a film",
      // "+1 each" rather than "+1 XP each": src/lib/xp-copy.test.ts bans a
      // digit next to "XP" in copy, because every price must be rendered from
      // the constant that pays it. Movie XP has no constant — movieXp() pays
      // one per film — so the number stays out of the units.
      price: "+1 each",
      detail: `Every film you settle in a ranking you finish, up to ${MAX_XP_PER_LIST} per list. Drafts do not count — the XP is for sorting them, not for adding them.`,
      earned: breakdown.movies,
    },
    {
      name: "Finish a weekly Marquee",
      price: `+${MARQUEE_COMPLETION_XP} XP`,
      detail: "On top of the films themselves, for ranking the set everyone else is ranking.",
      earned: breakdown.marquee,
    },
    {
      name: "Crack the connection",
      price: `+${CONNECTION_SOLVE_XP} XP`,
      detail: "Work out the thread running through a weekly set. One guess, so it counts.",
      earned: breakdown.connections,
    },
    {
      name: "Rank with co-curators",
      price: `+${CO_CURATION_XP} XP`,
      detail: "Finish a ranking that credits the people you made it with.",
      earned: breakdown.coCuration,
    },
    {
      name: "A friend finishes their first ranking",
      price: `+${REFERRAL_XP_BONUS} XP`,
      detail: "Someone who joined through your link or a credit on your list finishes a ranking.",
      earned: breakdown.referrals,
    },
  ];

  // Top rank first: you look up at a marquee ladder. Copied before reversing,
  // because CAREER_RANKS is a shared export.
  const ladder = [...CAREER_RANKS].reverse();

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-10">
      <section aria-labelledby="career-ladder-heading" ref={ladderRef}>
        <h3
          id="career-ladder-heading"
          className="font-display text-xl uppercase tracking-wide text-text"
        >
          The ladder
        </h3>
        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted">
          Ten ranks, ten levels each, and every unlock hangs on the level that hands it over.
        </p>

        <ol className="mt-4 list-none border-l border-white/10 pl-4">
          {ladder.map((r) => {
            const isCurrent = currentLevel >= r.minLevel && currentLevel <= r.maxLevel;
            const isEarned = currentLevel > r.maxLevel;
            const unlocks = UNLOCKS.filter(
              (u) => u.atLevel >= r.minLevel && u.atLevel <= r.maxLevel,
            );

            return (
              <li
                key={r.rank}
                aria-current={isCurrent ? "step" : undefined}
                className="pb-5 last:pb-0"
              >
                {isEarned ? (
                  <Laurel tone="gold">{r.title}</Laurel>
                ) : (
                  <span
                    className={`font-display text-base uppercase leading-none tracking-wide sm:text-lg ${
                      isCurrent ? "text-gold" : "text-muted"
                    }`}
                  >
                    {r.title}
                  </span>
                )}

                <p className="mt-1 text-xs text-muted">
                  Levels {r.minLevel}–{r.maxLevel}
                </p>
                {isCurrent && <p className="text-xs text-gold">You are here</p>}

                {unlocks.length > 0 && (
                  <ul className="mt-2 list-none space-y-1">
                    {unlocks.map((u) => (
                      <li
                        key={u.name}
                        className={`max-w-[70ch] text-xs leading-relaxed ${
                          currentLevel >= u.atLevel ? "text-text" : "text-muted"
                        }`}
                      >
                        Level {u.atLevel} — {midSentence(u.name)}: {midSentence(u.effect)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="career-xp-heading" ref={earnRef}>
        <h3
          id="career-xp-heading"
          className="font-display text-xl uppercase tracking-wide text-text"
        >
          How XP is earned
        </h3>
        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted">
          Five sources, and what each has paid you so far.
        </p>

        <table className="mt-4 w-full border-collapse text-sm">
          <caption className="sr-only">
            What each source of XP pays, and what you have earned from it
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Source</th>
              <th scope="col">XP</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s, i) => (
              <tr key={s.name} className={i > 0 ? "border-t border-white/10" : undefined}>
                <th scope="row" className="py-3 pr-4 text-left align-top font-normal">
                  <span className="font-medium text-text">{s.name}</span>
                  <span className="mt-1 block max-w-[70ch] text-xs leading-relaxed text-muted">
                    {s.detail}{" "}
                    {s.earned > 0
                      ? `You have earned ${s.earned} XP this way.`
                      : "Nothing from this one yet."}
                  </span>
                </th>
                <td className="py-3 align-top text-right tabular-nums whitespace-nowrap text-gold">
                  {s.price}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 text-sm text-muted">{currentXp} XP in total.</p>
        {keptXp > 0 && (
          <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-muted">
            Includes {keptXp} XP kept from rankings you have since deleted.
          </p>
        )}
      </section>
    </div>
  );
}

export default function LevelProgressionModal({
  currentLevel,
  currentXp,
  breakdown,
  label = "How XP works",
  initialTab = "earn",
}: {
  currentLevel: number;
  currentXp: number;
  breakdown: XpBreakdown;
  /** Trigger wording, so the same guide can be opened from more than one place. */
  label?: string;
  /**
   * There are no tabs any more: both panes are always on screen. This is kept
   * as a HINT for a phone, where the panes stack — it decides which of the two
   * a small screen opens scrolled to, and is ignored at the desktop breakpoint
   * where both are already visible.
   */
  initialTab?: "earn" | "ranks";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const ladderRef = useRef<HTMLElement>(null);
  const earnRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  // showModal() puts the dialog in the top layer, which brings Escape, a focus
  // trap, focus restoration and ::backdrop with it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // Stacked panes only: on desktop this would scroll the title off the top
      // of a body that already shows both panes. No smooth behaviour — this
      // pass adds no motion.
      if (!window.matchMedia("(min-width: 768px)").matches) {
        const target = initialTab === "ranks" ? ladderRef.current : earnRef.current;
        target?.scrollIntoView({ block: "start", behavior: "auto" });
      }
    }
    if (!open && el.open) el.close();
  }, [open, initialTab]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
      >
        {label}
      </button>

      <dialog
        ref={ref}
        aria-labelledby="progression-modal-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="m-auto w-full max-w-3xl bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        {/* Mounted only while open. The ladder is a few hundred nodes and the
            page offers two ways in — rendering it unconditionally would put two
            hidden copies of it in every profile's DOM. */}
        {open && (
          <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:px-6">
              <div>
                <h2
                  id="progression-modal-title"
                  className="font-display text-3xl uppercase tracking-wide text-gold"
                >
                  Your career
                </h2>
                <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted">
                  {careerSummary(currentLevel, currentXp)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-sm text-sm font-medium text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <CareerPanes
                currentLevel={currentLevel}
                currentXp={currentXp}
                breakdown={breakdown}
                ladderRef={ladderRef}
                earnRef={earnRef}
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
