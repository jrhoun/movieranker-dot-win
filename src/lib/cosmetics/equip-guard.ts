// src/lib/cosmetics/equip-guard.ts
import { itemById } from "./catalogue";
import { canEquip } from "./ownership";
import { ID_FIELDS, type Equipped } from "./equipped";

/**
 * The write-time half of the trust boundary. Ownership is recomputed on the
 * server from the user's own record; the client is never believed.
 *
 * `posterPathByTmdbId` is optional only so a caller with nothing to check
 * against (no `avatarPosterPath` in the patch) doesn't need to build one.
 * When `avatarPosterPath` IS present the check is fail-closed: no map, no
 * paired `avatarTmdbId`, or a path that doesn't match the film's real poster
 * all refuse. Without this, `avatarTmdbId` ownership would be cosmetic —
 * `ProfileCanvas` renders `avatarPosterPath` directly (it never reads
 * `avatarTmdbId`), so an unpinned poster string is exactly the "pin any
 * poster" hole the avatar rule exists to close.
 */
export function validateEquipPatch(
  patch: Equipped,
  owned: Set<string>,
  ownedTmdbIds: Set<number>,
  posterPathByTmdbId?: Map<number, string | null>,
): { ok: true } | { ok: false; error: string } {
  for (const field of ID_FIELDS) {
    const id = patch[field];
    if (id === undefined || id === null) continue; // null clears the slot — no unlock needed.
    // canEquip alone doesn't check the item is even FOR this slot, so
    // { frame: "background.velvet" } would otherwise pass for anyone who
    // owns that background.
    if (!canEquip(id, owned) || itemById(id)?.slot !== field) {
      return { ok: false, error: `You have not unlocked "${id}".` };
    }
  }
  if (patch.avatarTmdbId !== undefined && !ownedTmdbIds.has(patch.avatarTmdbId)) {
    return { ok: false, error: "Choose a film from one of your finished rankings." };
  }
  if (patch.avatarPosterPath !== undefined) {
    const realPath =
      patch.avatarTmdbId !== undefined ? posterPathByTmdbId?.get(patch.avatarTmdbId) : undefined;
    if (patch.avatarTmdbId === undefined || !posterPathByTmdbId || realPath !== patch.avatarPosterPath) {
      return { ok: false, error: "That poster does not match the selected film." };
    }
  }
  return { ok: true };
}

/**
 * Claims are the only stored user CHOICE in the cosmetics system, so they get
 * the same treatment as an equip: recomputed on the server against the user's
 * own finished lists and their derived allowance, never believed from the
 * client.
 *
 * Two separate questions, and both have to hold. Ranking a film earns the
 * RIGHT to claim its poster; the allowance limits HOW MANY of those rights can
 * be spent. Checking only the first would make claims free and the scarcity
 * decorative — which is what `parseAvatarClaims` alone would give you, since
 * that is shape validation and explicitly not a trust boundary.
 *
 * `claims` is the FULL post-merge set, not the patch: claims are permanent, so
 * an allowance is spent for good and the total is what must fit.
 */
export function validateClaims(
  claims: number[],
  ownedTmdbIds: Set<number>,
  allowance: number,
): { ok: true } | { ok: false; error: string } {
  if (claims.length > allowance) {
    return {
      ok: false,
      error: `You have ${allowance} avatar claim${allowance === 1 ? "" : "s"}.`,
    };
  }
  for (const tmdbId of claims) {
    if (!ownedTmdbIds.has(tmdbId)) {
      return { ok: false, error: "Choose a film from one of your finished rankings." };
    }
  }
  return { ok: true };
}
