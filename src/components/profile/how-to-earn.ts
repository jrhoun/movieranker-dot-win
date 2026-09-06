import { unlockLabel } from "@/lib/cosmetics/labels";
import type { Unlock } from "@/lib/cosmetics/types";
import { ACHIEVEMENTS } from "@/lib/gamification";

/**
 * One sentence saying how a locked item is obtained.
 *
 * `unlockLabel` (lib/cosmetics/labels.ts) is the tested source of the PHRASE —
 * "Level 25", "From a reel canister", an achievement's real name. It is
 * deliberately terse because a chip caption had to fit it. The dressing room
 * and the collection wall both print the line UNDER a locked swatch instead,
 * where a phrase reads as a riddle ("Cryptologist") and a sentence reads as an
 * instruction. Same data, said out loud.
 *
 * It lives in its own module, not in either component, for the reason
 * labels.ts gives for existing at all: the customise dialog is a client
 * component and the collection wall is a server one, so copy they share has to
 * sit outside both or it drifts. This file is plain data — no JSX, no
 * "use client" — so both sides may import it.
 *
 * `purchase` says "Not available yet" and never "Buy": nothing is purchasable
 * and nothing is planned to be, so an item behind that unlock is not a
 * storefront teaser. And nothing here ever says "Coming soon", which is the
 * one thing a collection must not say about a thing it is showing you.
 *
 * Every kind is spelled out rather than left to a fallback, so all six lines
 * end in a full stop and a locked grid does not mix sentences with fragments.
 * The unreachable `default` keeps an `Unlock` variant added later showing its
 * tested phrase instead of nothing.
 */
export function howToEarn(unlock: Unlock): string {
  switch (unlock.kind) {
    case "starter":
      return "Yours from the start.";
    case "level":
      return `Unlocks at level ${unlock.level}.`;
    case "challenge": {
      const name = ACHIEVEMENTS.find((a) => a.key === unlock.key)?.name;
      return name ? `Earned with the ${name} achievement.` : "Earned from an achievement.";
    }
    case "marquee":
      return "Earned by finishing that week's Marquee.";
    case "drop":
      return "Dropped from a reel canister.";
    case "purchase":
      return "Not available yet.";
    default:
      return unlockLabel(unlock);
  }
}
