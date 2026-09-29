// src/lib/cosmetics/types.ts
export type Slot = "frame" | "background" | "overlay" | "tagline" | "avatar";

/**
 * How an item is obtained. `drop` items come ONLY from finishing a weekly
 * Marquee — an allowlist, so a new prestige item cannot leak into the drop
 * pool by omission. Nothing is purchasable and nothing is planned to be, so
 * there is no purchase kind: an item that cannot be earned does not belong in
 * the catalogue at all.
 */
export type Unlock =
  | { kind: "starter" }
  | { kind: "level"; level: number }
  | { kind: "challenge"; key: string }
  | { kind: "marquee"; themeSlug: string }
  | { kind: "drop" };

/**
 * Weights the drop draw and nothing else. Never printed: a wardrobe that
 * calls its own contents "legendary" is a shop, and the word on a tile a
 * profile starts with contradicts itself.
 */
export type Rarity = "common" | "rare" | "legendary";

export interface CosmeticItem {
  /** Stable and namespaced, e.g. "frame.brass". Never an array index. */
  id: string;
  slot: Slot;
  name: string;
  unlock: Unlock;
  rarity: Rarity;
  /** Gates the reduced-motion rule and the one-overlay-per-profile cap. */
  animated?: boolean;
}

export type Rights = "owned" | "referential";

export interface TaglineItem extends CosmeticItem {
  slot: "tagline";
  text: string;
  /**
   * "referential" means recognisably lifted from a third-party work. Such an
   * item may be earned or free, never sold — charging is the aggravating fact.
   */
  rights: Rights;
  set: string;
}
