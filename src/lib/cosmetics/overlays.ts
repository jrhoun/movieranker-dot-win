// src/lib/cosmetics/overlays.ts
import type { CosmeticItem } from "./types";

/** Animated layers over the header. One at a time; all honour reduced motion. */
export const OVERLAYS: CosmeticItem[] = [
  { id: "overlay.none", slot: "overlay", name: "None", unlock: { kind: "starter" }, rarity: "common" },
  { id: "overlay.grain", slot: "overlay", name: "Film Grain", unlock: { kind: "level", level: 20 }, rarity: "rare", animated: true },
  { id: "overlay.dust", slot: "overlay", name: "Dust & Scratches", unlock: { kind: "drop" }, rarity: "rare", animated: true },
  { id: "overlay.flicker", slot: "overlay", name: "Projector Flicker", unlock: { kind: "drop" }, rarity: "rare", animated: true },
  { id: "overlay.vhs", slot: "overlay", name: "VHS Tracking", unlock: { kind: "purchase" }, rarity: "legendary", animated: true },
];
