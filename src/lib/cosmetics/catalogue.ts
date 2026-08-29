// src/lib/cosmetics/catalogue.ts
import { BACKGROUNDS } from "./backgrounds";
import { FRAMES } from "./frames";
import { OVERLAYS } from "./overlays";
import { TAGLINES } from "./taglines";
import type { CosmeticItem, Slot } from "./types";

export const SLOTS: Slot[] = ["frame", "background", "overlay", "tagline"];

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
