// Hand-run developer tool. NOT part of the build and NOT a dependency.
//
//   npm i --no-save @dicebear/core@9 @dicebear/collection@9
//   node scripts/generate-avatars.mjs
//
// Writes public/avatars/*.svg plus a manifest, which the catalogue reads at
// build time. The output is COMMITTED, so this script never runs in CI and the
// site never generates an avatar at request time — an avatar that could be
// conjured on demand could not be an unlockable.
//
// v9 deliberately, not v10: v10 requires Node >= 22 and this project runs
// Node 20, so v9 keeps the script runnable with the repo's own toolchain.
//
// ONLY CC0 STYLES MAY SHIP. The CC BY 4.0 styles (adventurer, big-ears,
// big-smile, croodles, dylan, fun-emoji, micah, miniavs, personas, toon-head)
// require visible designer credit on every page that displays them. Rather
// than trust that list, this script reads each style's own licence metadata
// and refuses to write anything that is not CC0 — a new style added here
// cannot quietly bring an attribution obligation with it.
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { createAvatar } from "@dicebear/core";
import * as collection from "@dicebear/collection";

/** Kebab id (used in filenames and catalogue ids) -> collection export name. */
const STYLES = {
  lorelei: "lorelei",
  notionists: "notionists",
  "open-peeps": "openPeeps",
  "pixel-art": "pixelArt",
  shapes: "shapes",
  thumbs: "thumbs",
};

// Fixed seeds: the same seed always yields the same art, so re-running this
// script reproduces the committed SVGs byte-for-byte instead of quietly
// reshuffling everyone's avatar library.
const SEEDS = ["reel", "usher", "matinee", "double-feature"];

const OUT = new URL("../public/avatars/", import.meta.url);
await mkdir(OUT, { recursive: true });

// Clear stale SVGs so a removed style cannot leave an orphan asset behind that
// the catalogue no longer lists.
for (const f of await readdir(OUT).catch(() => [])) {
  if (f.endsWith(".svg")) await unlink(new URL(f, OUT));
}

const manifest = [];

for (const [id, exportName] of Object.entries(STYLES)) {
  const style = collection[exportName];
  if (!style) throw new Error(`unknown DiceBear style: ${exportName}`);

  const licence = style.meta?.license?.name ?? "UNKNOWN";
  if (!licence.startsWith("CC0")) {
    throw new Error(
      `${id} is "${licence}", not CC0 — it would require visible designer credit. Refusing to write it.`,
    );
  }

  for (const seed of SEEDS) {
    const assetId = `${id}-${seed}`;
    const svg = createAvatar(style, { seed, size: 256 }).toString();
    await writeFile(new URL(`${assetId}.svg`, OUT), svg, "utf8");
    manifest.push({ id: assetId, style: id, seed, license: "CC0-1.0" });
  }
}

await writeFile(
  new URL("manifest.json", OUT),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8",
);
console.log(`wrote ${manifest.length} avatars across ${Object.keys(STYLES).length} CC0 styles`);
