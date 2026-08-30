import type { CosmeticItem } from "./types";

/**
 * Avatars come in three kinds. Generated and gradient avatars are a FIXED
 * catalogue, so their ownership is derived like every other cosmetic.
 *
 * Poster avatars are the exception: the pool is whatever films that particular
 * user ranked, so there is no fixed catalogue to derive against. A poster
 * avatar is CLAIMED, and each claim is represented as a synthetic id here.
 * That keeps the unbounded pool inside this module and `ownedItemIds`, instead
 * of leaking a second code path through equip, validation and render.
 */
export const POSTER_AVATAR_PREFIX = "avatar.poster.";

export function posterAvatarId(tmdbId: number): string {
  return `${POSTER_AVATAR_PREFIX}${tmdbId}`;
}

/** The tmdb id inside a synthetic poster-avatar id, or null if it is not one. */
export function posterAvatarTmdbId(id: string): number | null {
  if (!id.startsWith(POSTER_AVATAR_PREFIX)) return null;
  const rest = id.slice(POSTER_AVATAR_PREFIX.length);
  if (!/^\d+$/.test(rest)) return null;
  return Number(rest);
}

/**
 * A catalogue item for a poster avatar, made on demand. `itemById` falls back
 * to this so `canEquip` and the slot-correspondence check keep working with no
 * special case at their call sites.
 */
export function syntheticPosterAvatar(id: string): CosmeticItem | undefined {
  const tmdbId = posterAvatarTmdbId(id);
  if (tmdbId === null) return undefined;
  return {
    id,
    slot: "avatar",
    name: "Film poster",
    // Never consulted: a poster avatar's ownership comes from a stored claim,
    // not from an unlock rule. Present only to satisfy the CosmeticItem shape.
    unlock: { kind: "starter" },
    rarity: "common",
  };
}

/**
 * NO AVATAR IS DROPPABLE, AND THIS IS NOT AN OVERSIGHT.
 *
 * `droppablePool` is a single pool spanning every slot, and `drawFrom` scales
 * its seeded ticket by the pool's TOTAL rarity weight. Adding even one
 * droppable item therefore re-scales every draw for every user and rewrites
 * their whole canister history — measured at 38 of 40 users when `cyan` and
 * `magenta` briefly shipped as drops. See the capitalised note in catalogue.ts.
 *
 * Giving avatars a canister path means giving them their OWN pool, drawn from
 * its own seed, so the two sequences cannot perturb each other. Until that
 * exists, avatars are earned by level and challenge only. `catalogue.test.ts`
 * enforces this.
 */
const GRADIENTS: CosmeticItem[] = [
  { id: "avatar.grad.ember", slot: "avatar", name: "Ember", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.velvet", slot: "avatar", name: "Velvet", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.nitrate", slot: "avatar", name: "Nitrate", unlock: { kind: "level", level: 5 }, rarity: "common" },
  { id: "avatar.grad.cyan", slot: "avatar", name: "Cyan", unlock: { kind: "level", level: 10 }, rarity: "rare" },
  { id: "avatar.grad.magenta", slot: "avatar", name: "Magenta", unlock: { kind: "level", level: 20 }, rarity: "rare" },
  { id: "avatar.grad.toxic", slot: "avatar", name: "Toxic", unlock: { kind: "challenge", key: "cryptologist" }, rarity: "legendary" },
];

/**
 * Fixed-catalogue avatars. Gradients arrive in this task; generated art is
 * spread in later, when its assets exist.
 */
export const AVATARS: CosmeticItem[] = [...GRADIENTS];
