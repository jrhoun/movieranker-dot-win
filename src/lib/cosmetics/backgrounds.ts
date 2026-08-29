// src/lib/cosmetics/backgrounds.ts
import type { CosmeticItem } from "./types";

/** Treatments that arrange the user's OWN posters. Never stock artwork. */
export const BACKGROUNDS: CosmeticItem[] = [
  { id: "background.filmstrip", slot: "background", name: "Filmstrip", unlock: { kind: "starter" }, rarity: "common" },
  { id: "background.spotlight", slot: "background", name: "Spotlight", unlock: { kind: "level", level: 10 }, rarity: "common" },
  { id: "background.velvet", slot: "background", name: "Velvet", unlock: { kind: "drop" }, rarity: "rare" },
];
