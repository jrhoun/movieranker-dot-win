import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AVATARS,
  avatarAssetPath,
  CC0_STYLES,
  posterAvatarId,
  posterAvatarTmdbId,
  syntheticPosterAvatar,
} from "./avatars";
import { itemById, SLOTS, starterFor, itemsForSlot } from "./catalogue";

// The SVGs and manifest under public/avatars are COMMITTED output of the
// hand-run scripts/generate-avatars.mjs, which needs DiceBear installed with
// --no-save. This file only verifies what is committed; it must never import
// DiceBear or write to disk, or a clean install (Vercel) fails type checking.

describe("synthetic poster avatars", () => {
  it("round-trips a tmdb id", () => {
    expect(posterAvatarId(155)).toBe("avatar.poster.155");
    expect(posterAvatarTmdbId("avatar.poster.155")).toBe(155);
  });

  it("rejects ids that are not poster avatars", () => {
    for (const id of [
      "frame.brass",
      "avatar.poster.",
      "avatar.poster.abc",
      "avatar.poster.1.5",
      "avatar.poster.-3",
      "avatar.lorelei-01",
      "",
    ]) {
      expect(posterAvatarTmdbId(id), id).toBeNull();
    }
  });

  it("synthesises a catalogue item so existing machinery needs no special case", () => {
    const item = syntheticPosterAvatar("avatar.poster.155");
    expect(item).toMatchObject({ id: "avatar.poster.155", slot: "avatar" });
    expect(syntheticPosterAvatar("frame.brass")).toBeUndefined();
  });

  it("itemById resolves a synthetic poster id", () => {
    // This is the whole point: canEquip() and the slot-correspondence check in
    // validateEquipPatch both go through itemById, so a claimed poster becomes
    // equippable without either of them being modified.
    expect(itemById("avatar.poster.155")?.slot).toBe("avatar");
  });

  it("does not corrupt real catalogue lookups", () => {
    expect(itemById("frame.brass")?.slot).toBe("frame");
    expect(itemById("nope.nothing")).toBeUndefined();
  });

  it("avatar is a real slot", () => {
    expect(SLOTS).toContain("avatar");
  });
});

/** The three styles and six seeds that ship, in generator order. */
const SHIPPED_STYLES = ["lorelei", "notionists", "open-peeps"];
const SHIPPED_SEEDS = ["reel", "usher", "matinee", "double-feature", "spotlight", "celluloid"];

describe("generated avatars", () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "public/avatars/manifest.json"), "utf8"),
  ) as { id: string; style: string; seed: string; license: string }[];

  const generated = AVATARS.filter((a) => a.id.startsWith("avatar.gen."));
  const drawn = generated.filter((a) => a.id !== "avatar.gen.beta-reel");

  it("ships only CC0 styles — the CC BY styles require visible designer credit", () => {
    // A licence breach is invisible at runtime and expensive later, so it is
    // checked here as well as in the generator that writes these files.
    for (const entry of manifest) {
      expect(CC0_STYLES, `${entry.id} uses a non-CC0 style`).toContain(entry.style);
      expect(entry.license, entry.id).toBe("CC0-1.0");
    }
  });

  it("every committed asset has a catalogue entry and vice versa", () => {
    // Catches both directions: an SVG nobody can equip, and a catalogue entry
    // pointing at a file that was never committed.
    const files = readdirSync(join(process.cwd(), "public/avatars"))
      .filter((f) => f.endsWith(".svg"))
      .map((f) => f.replace(/\.svg$/, ""));
    expect(generated.map((a) => a.id.replace("avatar.gen.", "")).sort()).toEqual(files.sort());
  });

  it("asset paths point at real files that contain drawing, not just metadata", () => {
    for (const a of generated) {
      const svg = readFileSync(join(process.cwd(), "public", avatarAssetPath(a.id)), "utf8");
      // A DiceBear SVG always carries an RDF metadata block, so merely being
      // non-empty proves nothing — an avatar that renders as a blank box would
      // still pass that. Require actual geometry.
      expect(svg, `${a.id} has no drawable content`).toMatch(/<(path|circle|rect|polygon|ellipse)\b/);
    }
  });

  it("no generated avatar is droppable", () => {
    // Droppable avatars would rewrite every user's drop history far more
    // violently than the two gradients that already did. catalogue.test.ts
    // enforces this for the whole slot; this states it where the entries are
    // built.
    for (const a of generated) {
      expect(a.unlock.kind, a.id).not.toBe("drop");
    }
  });

  it("ships exactly three styles by six seeds, and every one is a starter", () => {
    // THE CUT OF 2026-09-28. Six styles by twelve seeds was seventy-two
    // interchangeable illustrations, thirty-six of them paced across levels 2
    // to 100 — levelling awarding clutter, which the design spec's §1.1
    // forbids. What is left is a choice a person can make in one look, and
    // none of it is withheld: a face says nothing about the player, so a
    // level has nothing to certify by keeping one back.
    expect(manifest.map((e) => e.style)).toEqual(
      SHIPPED_STYLES.flatMap((s) => SHIPPED_SEEDS.map(() => s)),
    );
    expect(manifest.map((e) => e.seed)).toEqual(SHIPPED_STYLES.flatMap(() => SHIPPED_SEEDS));
    expect(drawn.length).toBe(18);
    for (const a of drawn) {
      expect(a.unlock, a.id).toEqual({ kind: "starter" });
      expect(a.rarity, a.id).toBe("common");
    }
  });

  it("no drawn avatar sits behind a level", () => {
    // The counterweight to "all starters": a future entry that reintroduces a
    // level price on an illustration is the clutter coming back.
    expect(itemsForSlot("avatar").filter((i) => i.unlock.kind === "level")).toEqual([]);
  });

  it("keeps the Beta Reel as the one avatar an achievement earns", () => {
    const beta = generated.find((a) => a.id === "avatar.gen.beta-reel");
    expect(beta?.unlock).toEqual({ kind: "challenge", key: "beta_pioneer" });
    expect(generated.filter((a) => a.unlock.kind !== "starter").map((a) => a.id)).toEqual([
      "avatar.gen.beta-reel",
    ]);
  });

  it("keeps the same default avatar it has always had", () => {
    // `resolveEquipped` and `sanitizeEquipped` both fall back to
    // starterFor("avatar") for an unowned or stale id, and starterFor returns
    // the FIRST POSITIONAL starter in the slot. So this id is the face of
    // every profile that has not picked one, and the array order that decides
    // it is load-bearing rather than cosmetic.
    //
    // Pinned exactly, because the ways it can move are all silent: reordering
    // AVATARS' spreads, regenerating the manifest, or changing which entries
    // count as starters. Changing the default is a fine thing to do
    // deliberately — it should just not happen as a side effect of something
    // else.
    expect(starterFor("avatar").id).toBe("avatar.gen.lorelei-reel");
  });

  it("names read as names, not as filenames", () => {
    // "lorelei reel" is a manifest key; "Lorelei Reel" is a collectible.
    for (const a of generated) {
      expect(a.name, a.id).not.toContain("-");
      expect(a.name[0], a.id).toBe(a.name[0].toUpperCase());
    }
  });

  it("commits exactly the nineteen SVGs the catalogue lists, and none carries a gradient or a script", () => {
    const files = readdirSync(join(process.cwd(), "public/avatars")).filter((f) =>
      f.endsWith(".svg"),
    );
    expect(files.length).toBe(19); // 18 drawn + beta-reel
    for (const f of files) {
      const content = readFileSync(join(process.cwd(), "public/avatars", f), "utf8");
      expect(content.toLowerCase()).not.toContain("<lineargradient");
      expect(content.toLowerCase()).not.toContain("<radialgradient");
      expect(content.toLowerCase()).not.toContain("gradient");
      expect(content).toMatch(/<(path|circle|rect|polygon|ellipse)\b/);
      expect(content).not.toMatch(/\bon[a-z]+\s*=/i);
      expect(content).not.toMatch(/href\s*=\s*["']https?:/i);
      expect(content).not.toMatch(/<!ENTITY/i);
    }
  });
});

describe("gradient avatars", () => {
  const grads = AVATARS.filter((a) => a.id.startsWith("avatar.grad."));

  it("gradient avatar ids are unique and properly namespaced", () => {
    expect(grads.length).toBe(8);
    const ids = grads.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of grads) {
      expect(g.slot).toBe("avatar");
      expect(g.id).toMatch(/^avatar\.grad\.[a-z]+$/);
    }
  });

  it("is eight starters and nothing withheld", () => {
    // The two originals are still in it, and nothing sits behind a level or
    // an achievement: cyan, magenta and nitrate were the level-paced clutter
    // and toxic was a colour nobody associates with a cinema.
    expect(grads.map((g) => g.id)).toEqual([
      "avatar.grad.ember",
      "avatar.grad.velvet",
      "avatar.grad.sepia",
      "avatar.grad.noir",
      "avatar.grad.technicolor",
      "avatar.grad.proscenium",
      "avatar.grad.matinee",
      "avatar.grad.celluloid",
    ]);
    for (const g of grads) {
      expect(g.unlock, g.id).toEqual({ kind: "starter" });
      expect(g.rarity, g.id).toBe("common");
    }
  });

  it("every gradient avatar has a matching .ca-* rule in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    for (const item of grads) {
      const cls = item.id.replace(/^avatar\.grad\./, "ca-");
      expect(css, `${item.id} missing .${cls} rule in globals.css`).toMatch(
        new RegExp(`\\.${cls}\\b`),
      );
    }
  });
});
