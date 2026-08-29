// src/lib/cosmetics/frames.ts
import type { CosmeticItem } from "./types";

/** Rings around the poster avatar. All CSS — see globals.css `.cf-*`. */
export const FRAMES: CosmeticItem[] = [
  { id: "frame.brass", slot: "frame", name: "Brass", unlock: { kind: "starter" }, rarity: "common" },
  { id: "frame.perforation", slot: "frame", name: "Perforation", unlock: { kind: "starter" }, rarity: "common" },
  { id: "frame.projector", slot: "frame", name: "Projector", unlock: { kind: "level", level: 15 }, rarity: "common" },
  { id: "frame.toxic", slot: "frame", name: "Toxic", unlock: { kind: "drop" }, rarity: "common" },
  { id: "frame.neon-cyan", slot: "frame", name: "Neon Cyan", unlock: { kind: "drop" }, rarity: "rare" },
  { id: "frame.neon-magenta", slot: "frame", name: "Neon Magenta", unlock: { kind: "drop" }, rarity: "rare" },
  { id: "frame.vhs", slot: "frame", name: "VHS Tracking", unlock: { kind: "purchase" }, rarity: "rare" },
  { id: "frame.prism", slot: "frame", name: "Prism", unlock: { kind: "challenge", key: "cryptologist" }, rarity: "legendary", animated: true },
];
