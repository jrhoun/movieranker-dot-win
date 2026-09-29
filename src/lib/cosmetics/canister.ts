// src/lib/cosmetics/canister.ts
//
// Compatibility shim. The module was renamed to marquee-drops.ts on
// 2026-09-28 when "reel canister" left the product's vocabulary; a drop is
// "from a weekly Marquee" everywhere a person reads it. Files outside the
// cosmetics module (the challenger stress tests) still import this path.
// New code imports "./marquee-drops" directly.
export { RARITY_WEIGHT, droppablePool, drawFrom } from "./marquee-drops";
