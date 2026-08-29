// src/lib/cosmetics/ownership.ts
import { drawFrom, droppablePool } from "./canister";
import { CATALOGUE, itemById } from "./catalogue";

/**
 * Ownership is DERIVED, never recorded — the same property XP and achievements
 * already have (see the note atop src/lib/gamification.ts). No awards table
 * means a deleted list cannot leave a phantom item and the whole thing is
 * auditable from rows we already query.
 */
export interface OwnershipStats {
  /** Seeds canister draws, so two players' sequences differ. */
  userId: string;
  level: number;
  unlockedAchievementKeys: string[];
  /** Finished Marquee themes, oldest first — order decides the drop sequence. */
  finishedThemeSlugs: string[];
}

export function ownedItemIds(stats: OwnershipStats, grants: string[] = []): Set<string> {
  const owned = new Set<string>();
  const keys = new Set(stats.unlockedAchievementKeys);

  for (const item of CATALOGUE) {
    const u = item.unlock;
    if (u.kind === "starter") owned.add(item.id);
    else if (u.kind === "level" && stats.level >= u.level) owned.add(item.id);
    else if (u.kind === "challenge" && keys.has(u.key)) owned.add(item.id);
    else if (u.kind === "marquee" && stats.finishedThemeSlugs.includes(u.themeSlug)) {
      owned.add(item.id);
    }
    // "drop" is resolved below; "purchase" only ever arrives via `grants`.
  }

  // Replay canisters in order. Each draw sees what the previous ones gave, which
  // is what makes duplicates impossible and the whole sequence reproducible.
  for (const themeSlug of stats.finishedThemeSlugs) {
    const pick = drawFrom(droppablePool(owned), `${stats.userId}|${themeSlug}`);
    if (pick) owned.add(pick.id);
  }

  for (const id of grants) {
    if (itemById(id)) owned.add(id);
  }
  return owned;
}

/** True when `id` is a real catalogue item the user owns. */
export function canEquip(id: string, owned: Set<string>): boolean {
  return itemById(id) !== undefined && owned.has(id);
}
