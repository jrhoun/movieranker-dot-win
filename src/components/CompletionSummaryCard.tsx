import type { CompletionSummary } from "@/lib/completion";

/**
 * The moment a ranking is finished.
 *
 * Finishing used to show "+N XP Earned" on the play screen and nothing after
 * that — no level, no career rank, and badges that unlocked in silence. This is
 * the one place a first-time ranker decides whether the site is worth coming
 * back to, so it is the one place progression is worth spending space on.
 */
export default function CompletionSummaryCard({
  summary,
  className = "",
}: {
  summary: CompletionSummary;
  className?: string;
}) {
  const pct = Math.round(summary.progress01 * 100);
  const toNext =
    summary.nextLevelXp === null ? null : Math.max(0, summary.nextLevelXp - summary.totalXp);

  return (
    <section
      aria-label="Ranking complete"
      className={`animate-fade-in w-full rounded-2xl border border-gold/30 bg-gradient-to-b from-surface to-surface/80 p-5 shadow-2xl ring-1 ring-gold/20 sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-gold/20 font-display text-sm font-bold text-gold ring-1 ring-gold/40">
            ✓
          </span>
          <h2 className="font-display text-base uppercase tracking-wider text-gold sm:text-lg">
            Ranking settled
          </h2>
        </div>
        {summary.xpEarned > 0 && (
          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 font-mono text-xs font-bold text-gold ring-1 ring-gold/40">
            +{summary.xpEarned} XP
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-lg uppercase tracking-wide text-text">
            {/* A big ranking can still clear more than one level, and late
                levels cost enough that it usually clears none. Showing the jump
                covers both without announcing "level up" every single time. */}
            {summary.leveledUp && (
              <span className="mr-2 text-gold">
                Level {summary.previousLevel} → {summary.level} ·
              </span>
            )}
            {!summary.leveledUp && <>Level {summary.level} · </>}
            <span className="text-gold">{summary.rank}</span>
          </p>
          {toNext !== null && (
            <p className="font-mono text-xs text-muted">
              {toNext} XP to Level {summary.level + 1}
            </p>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress to level ${summary.level + 1}`}
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised ring-1 ring-white/10"
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {summary.newAchievements.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="font-display text-xs uppercase tracking-widest text-gold">
            {summary.newAchievements.length === 1 ? "Achievement unlocked" : "Achievements unlocked"}
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {summary.newAchievements.map((a) => (
              <li
                key={a.key}
                className="flex items-start gap-3 rounded-xl border border-gold/25 bg-gold/5 p-3"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {a.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{a.name}</p>
                  <p className="text-xs leading-relaxed text-muted">{a.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
