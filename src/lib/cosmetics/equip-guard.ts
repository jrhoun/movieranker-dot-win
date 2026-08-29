// src/lib/cosmetics/equip-guard.ts
import { canEquip } from "./ownership";
import type { Equipped } from "./equipped";

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
  for (const field of ["frame", "background", "overlay", "tagline"] as const) {
    const id = patch[field];
    if (id === undefined) continue;
    if (!canEquip(id, owned)) {
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
