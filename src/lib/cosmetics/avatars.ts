import manifest from "../../../public/avatars/manifest.json";
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
 * DiceBear styles that are CC0. The CC BY 4.0 styles require visible designer
 * credit on every page that shows them, so they must never ship here.
 * `scripts/generate-avatars.mjs` reads each style's own licence metadata and
 * refuses to write a non-CC0 one, so this list is a second lock rather than
 * the only one.
 */
export const CC0_STYLES = [
  "identicon",
  "initials",
  "lorelei",
  "notionists",
  "open-peeps",
  "pixel-art",
  "rings",
  "shapes",
  "thumbs",
];

/** Public URL for a generated avatar's committed SVG. */
export function avatarAssetPath(id: string): string {
  return `/avatars/${id.replace("avatar.gen.", "")}.svg`;
}

const titleCase = (s: string) =>
  s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/**
 * Generated art, committed as SVGs rather than produced at request time — an
 * avatar that could be conjured on demand could not be an unlockable.
 *
 * NONE ARE DROPPABLE, for the reason spelled out above `GRADIENTS`: the
 * canister pool is shared across every slot, so 24 droppable items would
 * rewrite every user's drop history far more violently than the two that
 * already did it once. They pace by level instead.
 *
 * Three starters so a new profile has real choice on day one, then one every
 * three levels to 65 — the last is reachable well inside the level 100 ceiling.
 */
const GENERATED: CosmeticItem[] = manifest.map((entry, i) => ({
  id: `avatar.gen.${entry.id}`,
  slot: "avatar",
  name: `${titleCase(entry.style)} ${titleCase(entry.seed)}`,
  unlock: i < 3 ? { kind: "starter" } : { kind: "level", level: 2 + (i - 2) * 3 },
  rarity: i < 12 ? "common" : "rare",
}));

/**
 * Fixed-catalogue avatars: generated art plus the gradients. Poster avatars are
 * NOT here — they are per-user and synthesised on demand by `itemById`.
 */
export const AVATARS: CosmeticItem[] = [...GENERATED, ...GRADIENTS];
