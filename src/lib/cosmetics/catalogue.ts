// src/lib/cosmetics/catalogue.ts
import { BACKGROUNDS } from "./backgrounds";
import { FRAMES } from "./frames";
import { OVERLAYS } from "./overlays";
import { TAGLINES } from "./taglines";
import type { CosmeticItem, Slot } from "./types";

export const SLOTS: Slot[] = ["frame", "background", "overlay", "tagline"];

/**
 * THE DROP ENTRIES ARE APPEND-ONLY, AND SO IS THIS SPREAD ORDER.
 *
 * `drawFrom` (canister.ts) walks cumulative rarity weights POSITIONALLY over
 * `CATALOGUE.filter(i => i.unlock.kind === "drop" && !owned)`, against a seed
 * derived from (userId, themeSlug). Position in this array is therefore part of
 * the answer, not an implementation detail. Adding, removing, reordering or
 * re-rarity-ing any `drop` item — or reordering the four spreads below —
 * retroactively rewrites what every user drew for every past week.
 *
 * The visible damage is not just "a different item": an item a user has been
 * shown as owned can become unowned, at which point the two profile pages
 * render them differently (/u/profile resolves against a live redraw while
 * /u/[handle] reads the stored equipped snapshot). Append new `drop` items to
 * the END of their slot's list; never renumber what is already there.
 */
export const CATALOGUE: CosmeticItem[] = [...FRAMES, ...BACKGROUNDS, ...OVERLAYS, ...TAGLINES];

const BY_ID = new Map(CATALOGUE.map((i) => [i.id, i]));

export function itemById(id: string): CosmeticItem | undefined {
  return BY_ID.get(id);
}

export function itemsForSlot(slot: Slot): CosmeticItem[] {
  return CATALOGUE.filter((i) => i.slot === slot);
}

/**
 * The fallback for a slot. Render drops back to this when an equipped id turns
 * out to be unowned, so a profile is never left half-dressed.
 */
export function starterFor(slot: Slot): CosmeticItem {
  const starter = itemsForSlot(slot).find((i) => i.unlock.kind === "starter");
  if (!starter) throw new Error(`no starter item for slot "${slot}"`);
  return starter;
}
