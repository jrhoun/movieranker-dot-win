// src/lib/cosmetics/canister.ts
import { hashString, mulberry32 } from "@/lib/seeded-random";
import { CATALOGUE } from "./catalogue";
import type { CosmeticItem, Rarity } from "./types";

/**
 * Reel canisters: one per Marquee week finished, containing one cosmetic.
 *
 * PAID RANDOMNESS IS RULED OUT and this module must never be reached from a
 * purchase path. Belgium criminalises paid loot boxes; the EU's expected
 * Digital Fairness Act bans them where minors have access and mandates odds
 * disclosure. This site has no age gate.
 *
 * The draw is SEEDED rather than random so the outcome is re-derivable. That is
 * what lets random rewards exist with no database table, and it also removes
 * rerolling — the compulsion loop — as a possibility rather than discouraging it.
 */
export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 12,
  rare: 4,
  legendary: 1,
};

/**
 * Eligibility is an ALLOWLIST: only `drop` items, minus what is already owned.
 * Stated this way so that forgetting to exclude a new prestige item cannot leak
 * it into the pool — the unsafe case has to be written deliberately.
 */
export function droppablePool(owned: Set<string>): CosmeticItem[] {
  return CATALOGUE.filter((i) => i.unlock.kind === "drop" && !owned.has(i.id));
}

/** Weighted pick. Returns null for an empty pool — the collection is complete. */
export function drawFrom(pool: CosmeticItem[], seed: string): CosmeticItem | null {
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, i) => sum + RARITY_WEIGHT[i.rarity], 0);
  let ticket = mulberry32(hashString(seed))() * total;
  for (const item of pool) {
    ticket -= RARITY_WEIGHT[item.rarity];
    if (ticket <= 0) return item;
  }
  return pool[pool.length - 1];
}
