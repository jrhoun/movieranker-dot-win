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
/**
 * ORDERED STARTERS FIRST, THEN BY UNLOCK COST. This array is the display order
 * in the collection gallery and the customise picker, so a new profile opening
 * the avatar list sees what it can wear before what it cannot.
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
  { id: "avatar.grad.chroma", slot: "avatar", name: "Chroma", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.popcorn", slot: "avatar", name: "Popcorn", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.proscenium", slot: "avatar", name: "Proscenium", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.matinee", slot: "avatar", name: "Matinee", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.midnight", slot: "avatar", name: "Midnight", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.dusk", slot: "avatar", name: "Dusk", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.celluloid", slot: "avatar", name: "Celluloid", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.aurora", slot: "avatar", name: "Aurora", unlock: { kind: "starter" }, rarity: "common" },
  { id: "avatar.grad.ultraviolet", slot: "avatar", name: "Ultraviolet", unlock: { kind: "starter" }, rarity: "common" },
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
 * MOST OF THESE START UNLOCKED, and the split is BY STYLE rather than by
 * position. Three starters meant a new profile chose between three faces and a
 * wall of padlocks, and the wall was the first thing it saw — the collection
 * read as a list of things withheld rather than as a wardrobe.
 *
 * Taking the first N of the array instead would have been simpler and wrong:
 * `manifest.json` is grouped style-by-style, so "the first 16 of 24" is every
 * seed of the first four styles and none of the last two. The opening choice
 * would have spanned four looks while claiming to span six. Counting within
 * each style means every style is represented on day one, whatever the
 * manifest's length or order turns out to be.
 *
 * What is left over is one seed per style, priced across the level range
 * rather than bunched at the bottom, so something is still worth reaching for
 * after the gradients have run out. All of it sits inside the level 100
 * ceiling; `avatars.test.ts` holds that bound.
 *
 * NONE ARE DROPPABLE, for the reason spelled out above `GRADIENTS`.
 */
const FREE_SEEDS_PER_STYLE = 3;
const GATED_LEVEL_STEP = 10;

function generatedAvatars(): CosmeticItem[] {
  const out: CosmeticItem[] = [];
  const seenInStyle = new Map<string, number>();
  let gated = 0;

  for (const entry of manifest) {
    const nth = seenInStyle.get(entry.style) ?? 0;
    seenInStyle.set(entry.style, nth + 1);
    const isStarter = nth < FREE_SEEDS_PER_STYLE;
    if (!isStarter) gated += 1;

    out.push({
      id: `avatar.gen.${entry.id}`,
      slot: "avatar",
      name: `${titleCase(entry.style)} ${titleCase(entry.seed)}`,
      unlock: isStarter
        ? { kind: "starter" }
        : { kind: "level", level: gated * GATED_LEVEL_STEP },
      // Keyed off the unlock, not the index. Calling an avatar that every
      // profile starts with "rare" contradicted the word on its own tile.
      rarity: isStarter ? "common" : "rare",
    });
  }
  return out;
}

const GENERATED: CosmeticItem[] = generatedAvatars();

/**
 * Fixed-catalogue avatars: generated art plus the gradients. Poster avatars are
 * NOT here — they are per-user and synthesised on demand by `itemById`.
 */
export const AVATARS: CosmeticItem[] = [...GENERATED, ...GRADIENTS];
