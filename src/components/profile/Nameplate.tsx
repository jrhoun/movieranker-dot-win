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
 * The tiers are cumulative and deliberately built from the site's existing
 * vocabulary (the gold sweep, the marquee bulbs, the velvet of the stage band)
 * rather than new decoration invented for the occasion:
 *
 *   1 · Lv 25  Gilded — the wordmark's gold sweep, clipped to the glyphs
 *   2 · Lv 50  Velvet — set on a velvet band
 *   3 · Lv 75  Marquee — flanked by lit bulbs instead of dots
 *   4 · Lv 100 Halo — lit from behind by the projector
 */
const VELVET_BAND =
  "rounded-full border border-gold/25 bg-[linear-gradient(180deg,#3a0e13_0%,#220a0e_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";

function Bulbs() {
  return (
    <span aria-hidden="true" className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(245,197,24,0.9)]"
        />
      ))}
    </span>
  );
}

export default function Nameplate({
  handle,
  level,
  size = "hero",
  className = "",
}: {
  handle: string;
  /** Career level; decides which tier is worn. */
  level: number;
  /** "hero" is the page title treatment; "compact" sits inline under a heading. */
  size?: "hero" | "compact";
  className?: string;
}) {
  const tier = nameplateTier(level);
  const gilded = tier >= 1;
  const velvet = tier >= 2;
  const lit = tier >= 3;
  const halo = tier >= 4;

  const ornament = lit ? <Bulbs /> : <span aria-hidden="true" className="text-gold">✦</span>;

  const plate = (
    <span
      className={`relative inline-flex items-center gap-2.5 ${
        velvet ? `${VELVET_BAND} ${size === "hero" ? "px-5 py-2" : "px-3 py-1"}` : ""
      }`}
    >
      {halo && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,197,24,0.30),transparent_72%)] blur-[6px]"
        />
      )}
      {ornament}
      <span className={`break-words ${gilded ? "marquee-gold" : "text-gold"}`}>@{handle}</span>
      {ornament}
    </span>
  );

  if (size === "compact") {
    return (
      <span className={`inline-flex font-display text-lg uppercase tracking-wider ${className}`}>
        {plate}
      </span>
    );
  }

  return (
    <h1
      className={`flex items-center gap-3 font-display text-3xl uppercase leading-none tracking-[0.12em] ${className}`}
    >
      <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-gold/60" />
      {plate}
      <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-gold/60" />
    </h1>
  );
}
