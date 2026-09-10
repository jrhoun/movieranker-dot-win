// src/lib/cosmetics/frames.ts
import type { CosmeticItem } from "./types";

/**
 * Frames around the poster avatar. The early ones are CSS rings (globals.css
 * `.cf-*`); the illustrated ones below are inline SVG in FrameArt.tsx.
 *
 * APPEND-ONLY where `drop` items are concerned: their order and rarity here
 * feed `drawFrom`'s positional weight walk, so editing an existing one rewrites
 * every user's past canister history. Full explanation on `CATALOGUE` in
 * catalogue.ts. Add at the end; do not reorder, delete, or re-rarity.
 */
export const FRAMES: CosmeticItem[] = [
  { id: "frame.brass", slot: "frame", name: "Brass", unlock: { kind: "starter" }, rarity: "common" },
  { id: "frame.perforation", slot: "frame", name: "Perforation", unlock: { kind: "starter" }, rarity: "common" },
  { id: "frame.projector", slot: "frame", name: "Projector", unlock: { kind: "level", level: 15 }, rarity: "common" },
  { id: "frame.toxic", slot: "frame", name: "Toxic", unlock: { kind: "drop" }, rarity: "common" },
  { id: "frame.neon-cyan", slot: "frame", name: "Neon Cyan", unlock: { kind: "drop" }, rarity: "rare" },
  { id: "frame.neon-magenta", slot: "frame", name: "Neon Magenta", unlock: { kind: "drop" }, rarity: "rare" },
  { id: "frame.vhs", slot: "frame", name: "VHS Tracking", unlock: { kind: "purchase" }, rarity: "rare" },
  { id: "frame.prism", slot: "frame", name: "Prism", unlock: { kind: "challenge", key: "cryptologist" }, rarity: "legendary", animated: true },

  /**
   * ILLUSTRATED FRAMES — drawn objects rather than rings. Their art lives in
   * FRAME_ART (src/components/profile/FrameArt.tsx), not in a `.cf-*` class,
   * and every one of them still needs a static twin in og-card.tsx's
   * FRAME_STYLE or the share card silently renders brass instead.
   *
   * None of these is a `drop`, deliberately: appending to the drop pool
   * rewrites every past canister draw (see catalogue.ts). They unlock on the
   * level curve and on achievements, spread from level 5 to level 90 so the
   * frame slot keeps giving something back for the whole career.
   */
  { id: "frame.deco", slot: "frame", name: "Art Deco", unlock: { kind: "level", level: 5 }, rarity: "common" },
  { id: "frame.sprocket", slot: "frame", name: "Sprocket", unlock: { kind: "level", level: 12 }, rarity: "common" },
  { id: "frame.marquee", slot: "frame", name: "Marquee", unlock: { kind: "level", level: 30 }, rarity: "rare", animated: true },
  { id: "frame.spotlit", slot: "frame", name: "Spotlit", unlock: { kind: "level", level: 45 }, rarity: "rare" },
  { id: "frame.premiere", slot: "frame", name: "Premiere", unlock: { kind: "level", level: 90 }, rarity: "legendary", animated: true },
  { id: "frame.laurel", slot: "frame", name: "Laurel", unlock: { kind: "challenge", key: "master_curator" }, rarity: "rare" },
  { id: "frame.velvet-rope", slot: "frame", name: "Velvet Rope", unlock: { kind: "challenge", key: "season_ticket" }, rarity: "legendary" },
  { id: "frame.nitrate", slot: "frame", name: "Nitrate", unlock: { kind: "challenge", key: "the_long_take" }, rarity: "legendary" },
  { id: "frame.beta", slot: "frame", name: "Beta Cassette", unlock: { kind: "challenge", key: "beta_pioneer" }, rarity: "legendary", animated: true },
];
