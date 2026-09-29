// src/lib/cosmetics/backgrounds.ts
import type { CosmeticItem } from "./types";

/**
 * Treatments that arrange the user's OWN posters. Never stock artwork.
 *
 * NONE is a `drop`, and that is deliberate rather than incidental: the draw
 * walks cumulative rarity weights POSITIONALLY over the droppable pool, so a
 * single new `drop` item rewrites what every user drew for every past week
 * (see CATALOGUE in catalogue.ts). Level and challenge unlocks are resolved
 * directly from stats and perturb nothing.
 */
export const BACKGROUNDS: CosmeticItem[] = [
  { id: "background.spotlight", slot: "background", name: "Spotlight", unlock: { kind: "starter" }, rarity: "common" },
  { id: "background.filmstrip", slot: "background", name: "Filmstrip", unlock: { kind: "level", level: 15 }, rarity: "rare", animated: true },

  /**
   * Rooms, not card treatments. These four came in with ProfileBackdrop, which
   * paints the equipped background across the WHOLE page rather than inside a
   * 900px card, so each one has to hold a viewport on its own.
   */
  { id: "background.projector-booth", slot: "background", name: "Projector Booth", unlock: { kind: "level", level: 25 }, rarity: "rare", animated: true },
  { id: "background.marquee-night", slot: "background", name: "Marquee Night", unlock: { kind: "level", level: 40 }, rarity: "rare", animated: true },
  { id: "background.nitrate", slot: "background", name: "Nitrate", unlock: { kind: "challenge", key: "centurion" }, rarity: "legendary", animated: true },
  { id: "background.midnight", slot: "background", name: "Midnight Premiere", unlock: { kind: "level", level: 55 }, rarity: "rare", animated: true },
];
