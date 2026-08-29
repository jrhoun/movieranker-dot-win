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

  // The unlock kinds seeded here are all MUTUALLY EXCLUSIVE with `drop` — an
  // item's `unlock` is one discriminated value, and no level/challenge/marquee
  // item is also droppable. That is exactly what keeps `droppablePool` stable
  // as a user levels up: nothing added to `owned` by this loop can ever be
  // subtracted from the pool the replay below walks, so a user's whole drop
  // history stays the same on the day they hit level 20 as it was the day
  // before. Introducing an item that is both level-gated and droppable would
  // silently rewrite every past draw for everyone who crosses that level.
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

  // MUST STAY BELOW THE REPLAY LOOP. `droppablePool` subtracts what is already
  // owned, so seeding a granted item before the replay changes the pool every
  // subsequent draw walks — one purchase would retroactively rewrite that
  // user's entire drop history, handing them a different set of items than the
  // ones their profile has been showing. Applying grants after the replay
  // leaves the derived sequence untouched, which is the whole point of
  // deriving it. Hoisting this for tidiness is not a refactor.
  for (const id of grants) {
    if (itemById(id)) owned.add(id);
  }
  return owned;
}

/** True when `id` is a real catalogue item the user owns. */
export function canEquip(id: string, owned: Set<string>): boolean {
  return itemById(id) !== undefined && owned.has(id);
}
