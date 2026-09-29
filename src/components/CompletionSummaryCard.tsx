import Link from "next/link";
import { Laurel } from "@/components/Laurel";
import type { CompletionSummary } from "@/lib/completion";
import type { NewCosmetic, NewCosmeticGroup } from "@/lib/cosmetics/unlock-diff";
import type { Slot } from "@/lib/cosmetics/types";

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
 *
 * THE UNLOCKED BLOCK. Rewards on this site are derived on read, so nothing
 * announced them: a frame that dropped from a Marquee, a level that opened the
 * featured-list ability, the Beta Test Screener laurel — all of it appeared on
 * the profile without a word. This block is the one announcement. It renders
 * only when something is genuinely new, and it names each thing plainly
 * ("Sprocket frame", a tagline in quotes) with a single link to go and wear
 * it; the dressing room does the showing off.
 */

/** How a new item is said aloud: the name, then what kind of thing it is. */
const SLOT_NOUN: Record<Exclude<Slot, "tagline">, string> = {
  frame: "frame",
  background: "background",
  overlay: "atmosphere",
  avatar: "avatar",
};

function cosmeticPhrase(item: NewCosmetic): string {
  // A tagline's label is already the quoted line; naming its slot would read
  // "“In a world…” tagline", which nobody says.
  if (item.slot === "tagline") return item.label;
  return `${item.label} ${SLOT_NOUN[item.slot]}`;
}

/** A canister draw or a theme souvenir: something the Marquee handed over. */
const fromMarquee = (item: NewCosmetic) => item.unlock === "drop" || item.unlock === "marquee";

/**
 * Everything new, as one list of phrases. Taglines are capped at one: the line
 * is what you want, and two quotations in a row read as a poem.
 */
function cosmeticPhrases(items: NewCosmetic[]): string[] {
  const out: string[] = [];
  const lines = items.filter((i) => i.slot === "tagline");
  for (const item of items) if (item.slot !== "tagline") out.push(cosmeticPhrase(item));
  if (lines[0]) out.push(cosmeticPhrase(lines[0]));
  const extra = lines.length - 1;
  if (extra > 0) out.push(extra === 1 ? "one more line" : `${extra} more lines`);
  return out;
}

/**
 * Two sentences at most: what a level or an achievement handed you, and what
 * this week's Marquee did. Neither names a rarity or a container — a drop is
 * "from this week's Marquee", full stop.
 */
function cosmeticSentences(groups: NewCosmeticGroup[]): string[] {
  const all = groups.flatMap((g) => g.items);
  const earned = cosmeticPhrases(all.filter((i) => !fromMarquee(i)));
  const dropped = cosmeticPhrases(all.filter(fromMarquee));
  const out: string[] = [];
  if (earned.length > 0) out.push(`Yours now: ${earned.join(", ")}.`);
  if (dropped.length > 0) out.push(`From this week’s Marquee: ${dropped.join(", ")}.`);
  return out;
}

export default function CompletionSummaryCard({
  summary,
  className = "",
  title = "Ranking settled",
}: {
  summary: CompletionSummary;
  className?: string;
  title?: string;
}) {
  const pct = Math.round(summary.progress01 * 100);
  const toNext =
    summary.nextLevelXp === null ? null : Math.max(0, summary.nextLevelXp - summary.totalXp);

  const sentences = cosmeticSentences(summary.newCosmetics);
  const hasUnlocked =
    summary.newAchievements.length > 0 || summary.leveledUp || sentences.length > 0;
  const abilities = summary.levelUnlocks.filter((u) => u.kind === "ability");

  return (
    <section
      aria-label="Ranking complete"
      className={`animate-fade-in w-full rounded-2xl border border-gold/30 bg-surface p-5 sm:p-6 ${className}`}
    >
      <h2 className="font-display text-2xl uppercase leading-none tracking-wide text-gold sm:text-3xl">
        {title}
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

      {hasUnlocked && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="font-display text-lg uppercase leading-none tracking-wide text-text sm:text-xl">
            Unlocked
          </h3>

          {summary.newAchievements.length > 0 && (
            <ul className="mt-3 flex flex-col gap-3">
              {summary.newAchievements.map((a) => (
                <li key={a.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Laurel>{a.name}</Laurel>
                  <span className="text-sm text-muted">{a.description}</span>
                </li>
              ))}
            </ul>
          )}

          {summary.leveledUp && (
            <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-text/90">
              Level {summary.level}, <span className="text-gold">{summary.rank}</span>.
              {abilities.map((u) => (
                <span key={u.atLevel}>
                  {" "}
                  {u.name}: {u.effect.charAt(0).toLowerCase()}
                  {u.effect.slice(1)}.
                </span>
              ))}
            </p>
          )}

          {sentences.length > 0 && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="max-w-[60ch] text-base leading-relaxed text-text/90">
                {sentences.join(" ")}
              </p>
              <Link
                href="/u/profile/customise"
                className="text-base text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
              >
                Wear it
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
