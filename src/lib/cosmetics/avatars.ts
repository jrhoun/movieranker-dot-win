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
 * their whole drop history — measured at 38 of 40 users when `cyan` and
 * `magenta` briefly shipped as drops. See the capitalised note in catalogue.ts.
 *
 * Giving avatars a drop path means giving them their OWN pool, drawn from its
 * own seed, so the two sequences cannot perturb each other. Until that exists,
 * avatars are starters or achievement rewards only. `catalogue.test.ts`
 * enforces this.
 */
/**
 * ALL STARTERS, AND EIGHT OF THEM. An avatar says nothing about the player
 * beyond taste, so there is nothing for a level to certify by withholding one;
 * a gradient behind a padlock was a dimmed square in a wardrobe that read as a
 * shop. These are the eight that read as cinema — an ember, a curtain, a
 * sepia print, a noir key light — and a new profile may wear any of them.
 *
 * Each of these needs THREE entries to render everywhere, and only two of them
 * fail loudly:
 *   1. here, the catalogue;
 *   2. a `.ca-<name>` rule in globals.css (asserted by avatars.test.ts);
 *   3. a literal-hex row in og-card.tsx's GRADIENT_AVATAR_BACKGROUND — Satori
 *      reads no stylesheet, so a gradient missing there renders as an empty
 *      avatar on the share card at HTTP 200 (asserted by og-card.test.ts).
 */
const GRADIENTS: CosmeticItem[] = [
  { id: "avatar.grad.ember", slot: "avatar", name: "Ember", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.velvet", slot: "avatar", name: "Velvet", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.sepia", slot: "avatar", name: "Sepia", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.noir", slot: "avatar", name: "Noir", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.technicolor", slot: "avatar", name: "Technicolor", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.proscenium", slot: "avatar", name: "Proscenium", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.matinee", slot: "avatar", name: "Matinee", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.celluloid", slot: "avatar", name: "Celluloid", unlock: { kind: "starter" }, rarity: "common" },
];

/**
 * DiceBear styles that are CC0. The CC BY 4.0 styles require visible designer
 * credit on every page that shows them, so they must never ship here.
 * `scripts/generate-avatars.mjs` reads each style's own licence metadata and
 * refuses to write a non-CC0 one, so this list is a second lock rather than
 * the only one. It is the LICENCE allowlist, not the shipped set: the
 * manifest ships three of these.
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
 * EVERY ONE IS A STARTER. Three styles by six seeds is eighteen faces, which
 * is a choice rather than a wall; the thirty-six that used to sit behind
 * levels 2 through 100 were the same illustrations at a different seed, and a
 * level that pays out an interchangeable face is levelling awarding clutter —
 * exactly what the design spec's §1.1 forbids. What a level or an achievement
 * earns now is a frame, a room or a line, each of which says something.
 *
 * NONE ARE DROPPABLE, for the reason spelled out above `GRADIENTS`.
 *
 * Order follows the manifest, which is grouped style-by-style with the seeds
 * in generator order, so the first entry — lorelei-reel — is the default face
 * of every profile that has not picked one (`starterFor("avatar")` takes the
 * first positional starter). avatars.test.ts pins that id.
 */
function generatedAvatars(): CosmeticItem[] {
  return manifest.map((entry) => ({
    id: `avatar.gen.${entry.id}`,
    slot: "avatar",
    name: `${titleCase(entry.style)} ${titleCase(entry.seed)}`,
    unlock: { kind: "starter" },
    rarity: "common",
  }));
}

const GENERATED: CosmeticItem[] = generatedAvatars();

export const BETA_REEL_AVATAR: CosmeticItem = {
  id: "avatar.gen.beta-reel",
  slot: "avatar",
  name: "Beta Reel",
  unlock: { kind: "challenge", key: "beta_pioneer" },
  rarity: "legendary",
};

/**
 * Fixed-catalogue avatars: generated art plus the gradients. Poster avatars are
 * NOT here — they are per-user and synthesised on demand by `itemById`.
 */
export const AVATARS: CosmeticItem[] = [...GENERATED, BETA_REEL_AVATAR, ...GRADIENTS];
