// src/lib/cosmetics/overlays.ts
import type { CosmeticItem } from "./types";

/**
 * Animated layers over the header. One at a time; all honour reduced motion.
 *
 * APPEND-ONLY where `drop` items are concerned: their order and rarity here
 * feed `drawFrom`'s positional weight walk, so editing an existing one rewrites
 * every user's past canister history. Full explanation on `CATALOGUE` in
 * catalogue.ts. Add at the end; do not reorder, delete, or re-rarity.
 */
export const OVERLAYS: CosmeticItem[] = [
  { id: "overlay.none", slot: "overlay", name: "None", unlock: { kind: "starter" }, rarity: "common" },
  { id: "overlay.grain", slot: "overlay", name: "Film Grain", unlock: { kind: "level", level: 20 }, rarity: "rare", animated: true },
  { id: "overlay.dust", slot: "overlay", name: "Dust & Scratches", unlock: { kind: "drop" }, rarity: "rare", animated: true },
  { id: "overlay.flicker", slot: "overlay", name: "Projector Flicker", unlock: { kind: "drop" }, rarity: "rare", animated: true },
  { id: "overlay.vhs", slot: "overlay", name: "VHS Tracking", unlock: { kind: "purchase" }, rarity: "legendary", animated: true },
];
