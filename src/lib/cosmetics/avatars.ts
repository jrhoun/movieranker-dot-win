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
 * Fixed-catalogue avatars. Gradients arrive in the next task; generated art is
 * spread in later, when its assets exist.
 */
export const AVATARS: CosmeticItem[] = [];
