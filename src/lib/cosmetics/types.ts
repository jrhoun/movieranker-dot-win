// src/lib/cosmetics/types.ts
export type Slot = "frame" | "background" | "overlay" | "tagline";

/**
 * How an item is obtained. `purchase` yields nothing until payments exist, and
 * `drop` items come ONLY from canisters — an allowlist, so a new prestige item
 * cannot leak into the drop pool by omission.
 */
export type Unlock =
  | { kind: "starter" }
  | { kind: "level"; level: number }
  | { kind: "challenge"; key: string }
  | { kind: "marquee"; themeSlug: string }
  | { kind: "drop" }
  | { kind: "purchase" };

export type Rarity = "common" | "rare" | "legendary";

export interface CosmeticItem {
  /** Stable and namespaced, e.g. "frame.neon-cyan". Never an array index. */
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
   * item may never be purchasable — charging is the aggravating fact.
   */
  rights: Rights;
  set: string;
}
