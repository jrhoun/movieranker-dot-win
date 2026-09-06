import { Laurel } from "@/components/Laurel";
import type { CompletionSummary } from "@/lib/completion";

/**
 * The moment a ranking is finished.
 *
 * Finishing used to show "+N XP Earned" on the play screen and nothing after
 * that — no level, no career rank, and badges that unlocked in silence. This is
 * the one place a first-time ranker decides whether the site is worth coming
 * back to, so it is the one place progression is worth spending space on.
 *
 * WHAT IT LOOKS LIKE, AND WHY. The first version of this card was a status
 * panel: a tracked-caps "RANKING SETTLED" eyebrow, a monospace "+17 XP" pill,
 * "LEVEL 1 → 2 · THEATER USHER", and each achievement as an emoji in a tinted
 * square. Every one of those is the vocabulary of a notification tray. What
 * happened here is that somebody finished a ranking and won something, so it
 * is written the way a person would say it — one sentence about the level, one
 * bar, and the achievements worn as laurels — in the same type as the rest of
 * the lobby. The emoji in `Achievement.icon` is deliberately not rendered.
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
  const one = summary.newAchievements.length === 1;

  return (
    <section
      aria-label="Ranking complete"
      className={`animate-fade-in w-full rounded-2xl border border-gold/30 bg-surface p-5 sm:p-6 ${className}`}
    >
      <h2 className="font-display text-2xl uppercase leading-none tracking-wide text-gold sm:text-3xl">
        Ranking settled
      </h2>

      {/* One sentence carries level, rank and the XP this ranking paid. A
          big ranking can clear more than one level and late levels usually
          clear none, so the sentence covers both without a "level up" banner. */}
      <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-text/90">
        {summary.leveledUp ? (
          <>
            That took you from level {summary.previousLevel} to level {summary.level},{" "}
            <span className="text-gold">{summary.rank}</span>
            {summary.xpEarned > 0 ? `, with ${summary.xpEarned} XP earned.` : "."}
          </>
        ) : (
          <>
            {summary.xpEarned > 0 ? `${summary.xpEarned} XP earned. ` : ""}
            You are level {summary.level}, <span className="text-gold">{summary.rank}</span>
            {toNext !== null ? `, ${toNext} XP short of level ${summary.level + 1}.` : "."}
          </>
        )}
        {summary.leveledUp && toNext !== null && ` ${toNext} XP to level ${summary.level + 1}.`}
      </p>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress to level ${summary.level + 1}`}
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>

      {summary.newAchievements.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-sm text-muted">
            {one ? "You also earned an achievement." : "You also earned achievements."}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {summary.newAchievements.map((a) => (
              <li key={a.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Laurel>{a.name}</Laurel>
                <span className="text-sm text-muted">{a.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
