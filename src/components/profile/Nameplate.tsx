import { nameplateTier } from "@/lib/gamification";

/**
 * A handle, dressed by career level.
 *
 * The level unlocks used to be five strings that no code ever read — including
 * an avatar frame for an avatar this site does not have. This is what replaced
 * them: one ornament that visibly upgrades, so reaching a level changes
 * something a person can actually see on their own profile and on everyone
 * else's view of it.
 *
 * The tiers are cumulative and built from the site's existing vocabulary (the
 * gold of the wordmark, the marquee bulbs, the velvet of the stage band):
 *
 *   1 · Lv 25  Gilded — struck in graded gold rather than flat
 *   2 · Lv 50  Velvet — letterpressed, as if set on the stage drape
 *   3 · Lv 75  Marquee — a rule of lit bulbs under the name
 *   4 · Lv 100 Halo — lit from behind by the projector
 *
 * Each tier has to be legible NEXT TO the one below it, which is the part that
 * is easy to get wrong: the first attempt used the wordmark's one-shot shimmer,
 * whose resting state is ordinary gold, so tier 1 was invisible.
 *
 * EVERY TIER IS NOW A TYPE TREATMENT. Tiers 2 and 3 used to be a pill (a
 * velvet band with a border) and a pair of flanking dot clusters, with a ✦ on
 * either side of the handle at every tier below 3 — three badges around a name
 * on a page whose brief is a cinema lobby, not a notification tray. The velvet
 * band also put a second velvet field inside a card that already sits on the
 * page's one velvet stage moment. So: gold graded like struck metal, a velvet
 * letterpress shadow, a bulb rule beneath the word, and the projector's glow.
 * Nothing is added beside the handle; the handle itself changes.
 */

/** Bright at the top, deep at the base — reads as struck metal, not flat fill. */
const GILDED =
  "bg-[linear-gradient(180deg,#fff6d0_0%,#ffe07a_38%,#f5c518_62%,#9a6f06_100%)] bg-clip-text text-transparent";

/**
 * Velvet letterpress, and the projector behind it.
 *
 * A `filter`, NOT a `text-shadow`: with GILDED the glyph fill is transparent
 * and the gold is a background clipped to the text, and a background paints
 * BELOW the text shadow — so a dark velvet text-shadow covered the gold
 * completely and levels 50+ rendered as an unreadable maroon smear. A filter
 * composites behind the element's whole painted result, gradient included.
 *
 * Written out as complete class strings rather than composed at runtime: the
 * Tailwind scanner reads source text, so an interpolated arbitrary value is
 * never generated.
 */
const VELVET_PRESS =
  "[filter:drop-shadow(0_2px_0_#3a0e13)_drop-shadow(0_8px_16px_rgba(58,14,19,0.9))]";

/** Tier 4 keeps the letterpress and adds the projector's glow around it. */
const HALO_GLOW =
  "[filter:drop-shadow(0_0_16px_rgba(245,197,24,0.85))_drop-shadow(0_2px_0_#3a0e13)]";

/** The velvet band, as a rule under the name rather than a pill around it. */
const VELVET_RULE =
  "mt-2 block h-[6px] w-full rounded-full bg-[linear-gradient(180deg,#5e1b25_0%,#3a0e13_60%,#220a0e_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";

/**
 * The hero size steps DOWN for a long handle.
 *
 * Handles run to 20 characters, and 20 characters of Bebas at 48px is wider
 * than a 390px phone or the customise dialog's ~600px mirror — it wrapped
 * mid-word, which for a name is worse than being a size smaller. Whole class
 * strings, so the Tailwind scanner still sees every one of them.
 */
function heroSize(handle: string): string {
  if (handle.length > 14) return "text-3xl @2xl:text-5xl";
  if (handle.length > 10) return "text-4xl @2xl:text-6xl";
  return "text-5xl @2xl:text-6xl";
}

export default function Nameplate({
  handle,
  level,
  size = "hero",
  as: Tag = "p",
  className = "",
}: {
  handle: string;
  /** Career level; decides which tier is worn. */
  level: number;
  /** "hero" is the marquee card's title; "compact" sits inline in dense space. */
  size?: "hero" | "compact";
  /**
   * `h1` where the handle IS the page title (a public profile); `p` where the
   * page already has one (the owner's dashboard, the customise dialog).
   */
  as?: "h1" | "p" | "span";
  className?: string;
}) {
  const tier = nameplateTier(level);
  const gilded = tier >= 1;
  const velvet = tier >= 2;
  const lit = tier >= 3;
  const halo = tier >= 4;

  return (
    <Tag
      className={`font-display uppercase leading-none tracking-[0.06em] ${
        size === "compact" ? "text-3xl" : heroSize(handle)
      } ${className}`}
    >
      <span className="relative inline-block">
        {halo && (
          // A SIBLING of the word, never its parent's background: nested, a
          // background paints straight over the glow and the tier looks like
          // the one below it.
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,197,24,0.45)_0%,rgba(245,197,24,0.12)_45%,transparent_72%)] blur-md"
          />
        )}
        <span
          className={`relative block break-words ${gilded ? GILDED : "text-gold"} ${
            halo ? HALO_GLOW : velvet ? VELVET_PRESS : ""
          }`}
        >
          @{handle}
        </span>
        {velvet && <span aria-hidden="true" className={`relative ${VELVET_RULE}`} />}
        {lit && (
          // Marquee bulbs, as a lit rule under the sign rather than dots
          // flanking it — the same sprocket-hole vocabulary `.cb-holes` uses
          // for the filmstrip background, in gold.
          <span
            aria-hidden="true"
            className="mt-2 block h-[7px] w-full rounded-full bg-[radial-gradient(circle,rgba(245,197,24,0.95)_36%,transparent_37%)] bg-[length:14px_7px] bg-repeat-x [filter:drop-shadow(0_0_5px_rgba(245,197,24,0.8))]"
          />
        )}
      </span>
    </Tag>
  );
}
