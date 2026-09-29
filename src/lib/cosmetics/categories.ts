import { itemsForSlot, SLOTS } from "./catalogue";
import type { CosmeticItem, Slot, TaglineItem } from "./types";

/**
 * How the collection is divided for browsing.
 *
 * Extracted from the collection wall so the coverage test can assert the REAL
 * division rather than restate it. The previous test rebuilt the same
 * slot-then-tagline-set expression it was checking, so it agreed with the wall
 * by construction and would have passed just as happily if the wall had stopped
 * rendering a category — which is the one failure it existed to catch. The wall
 * is now the dressing room at /u/profile/customise, whose tagline pane reads
 * its sets from here.
 */
export const SLOT_LABEL: Record<Slot, string> = {
  avatar: "Avatars",
  frame: "Frames",
  background: "Backgrounds",
  // "Atmosphere" is what the dressing room's nav calls this pane, and one
  // thing may not have two names in the product: an overlay is a filmstrip
  // flicker or a haze of dust, not a UI layer.
  overlay: "Atmosphere",
  tagline: "Taglines",
};

export interface CollectionCategory {
  /** Stable React key; also what a test can name a missing category by. */
  key: string;
  title: string;
  items: CosmeticItem[];
}

/**
 * Every catalogue item, grouped into the sets a user browses.
 *
 * Taglines are split by set rather than kept as one category: every weekly
 * theme carries a souvenir line, so there are dozens of them, and a single
 * list of that length is an index, not a collection. Every other slot is one
 * category.
 *
 * `extraAvatars` carries claimed poster avatars, which are per-user and never
 * in CATALOGUE — they are appended to the avatar category so a claim a user
 * spent an allowance on is visible somewhere.
 */
export function collectionCategories(extraAvatars: CosmeticItem[] = []): CollectionCategory[] {
  const taglines = itemsForSlot("tagline") as TaglineItem[];
  const sets = [...new Set(taglines.map((t) => t.set))];

  return [
    ...SLOTS.filter((s) => s !== "tagline").map((slot) => ({
      key: slot as string,
      title: SLOT_LABEL[slot],
      items: slot === "avatar" ? [...itemsForSlot(slot), ...extraAvatars] : itemsForSlot(slot),
    })),
    ...sets.map((set) => ({
      key: `tagline-${set}`,
      title: `${SLOT_LABEL.tagline} · ${set}`,
      items: taglines.filter((t) => t.set === set) as CosmeticItem[],
    })),
  ].filter((c) => c.items.length > 0);
}
