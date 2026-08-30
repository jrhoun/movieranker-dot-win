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
import { itemById, SLOTS } from "./catalogue";

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

describe("generated avatars", () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "public/avatars/manifest.json"), "utf8"),
  ) as { id: string; style: string; license: string }[];

  const generated = AVATARS.filter((a) => a.id.startsWith("avatar.gen."));

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
    // 24 droppable items would rewrite every user's canister history far more
    // violently than the two that already did. catalogue.test.ts enforces this
    // for the whole slot; this states it where the entries are built.
    for (const a of generated) {
      expect(a.unlock.kind, a.id).not.toBe("drop");
    }
  });

  it("gives a new profile real choice, and paces the rest inside the level ceiling", () => {
    expect(generated.filter((a) => a.unlock.kind === "starter").length).toBeGreaterThanOrEqual(3);
    for (const a of generated) {
      if (a.unlock.kind === "level") {
        expect(a.unlock.level, a.id).toBeGreaterThan(1);
        expect(a.unlock.level, a.id).toBeLessThanOrEqual(100);
      }
    }
  });

  it("opens with a choice that spans every style, not every seed of a few", () => {
    // The whole reason the starter split counts within each style instead of
    // slicing the first N: the manifest is grouped style-by-style, so a slice
    // hands over four complete styles and none of the other two. This fails
    // for a positional slice and passes for the per-style count, which is
    // exactly the distinction worth pinning.
    const styles = new Set(manifest.map((e) => e.style));
    const starterStyles = new Set(
      generated
        .filter((a) => a.unlock.kind === "starter")
        .map((a) => manifest.find((e) => `avatar.gen.${e.id}` === a.id)!.style),
    );
    expect(starterStyles).toEqual(styles);
  });

  it("leaves something to earn at every stage, and nothing at level 1", () => {
    const gated = generated.filter((a) => a.unlock.kind === "level");
    expect(gated.length).toBeGreaterThan(0);

    // Spread, not bunched. If every gated avatar landed inside the first few
    // levels the tail of the career would have no face left to unlock.
    const levels = gated
      .map((a) => (a.unlock.kind === "level" ? a.unlock.level : 0))
      .sort((x, y) => x - y);
    expect(new Set(levels).size, "two avatars unlock at the same level").toBe(levels.length);
    expect(levels[levels.length - 1]).toBeGreaterThanOrEqual(30);
  });

  it("never calls a starter rare", () => {
    // Rarity is the word printed on the tile. An item every profile owns on
    // day one cannot carry it.
    for (const a of generated) {
      if (a.unlock.kind === "starter") expect(a.rarity, a.id).toBe("common");
    }
  });

  it("names read as names, not as filenames", () => {
    // "lorelei reel" is a manifest key; "Lorelei Reel" is a collectible.
    for (const a of generated) {
      expect(a.name, a.id).not.toContain("-");
      expect(a.name[0], a.id).toBe(a.name[0].toUpperCase());
    }
  });
});

describe("gradient avatars", () => {
  it("gradient avatar ids are unique and properly namespaced", () => {
    const grads = AVATARS.filter((a) => a.id.startsWith("avatar.grad."));
    expect(grads.length).toBe(18);
    const ids = grads.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of grads) {
      expect(g.slot).toBe("avatar");
      expect(g.id).toMatch(/^avatar\.grad\.[a-z]+$/);
    }
  });

  it("starter invariant: a new profile opens with a wardrobe, not two options", () => {
    // Scoped to gradients, as the name says. It previously filtered ALL of
    // AVATARS, which only matched because gradients were the only entries;
    // adding generated starters made the unscoped version fail for no real
    // reason.
    //
    // The exact list is deliberately NOT pinned — naming fourteen ids here
    // would turn "add a gradient" into "edit a test that asserts nothing about
    // behaviour". What matters is that the opening set is genuinely a set, and
    // that the two originals are still in it.
    const starters = AVATARS.filter(
      (a) => a.id.startsWith("avatar.grad.") && a.unlock.kind === "starter",
    ).map((s) => s.id);

    expect(starters.length).toBeGreaterThanOrEqual(10);
    expect(starters).toContain("avatar.grad.ember");
    expect(starters).toContain("avatar.grad.velvet");
  });

  it("keeps the earned gradients earned", () => {
    // The counterweight to the test above: opening the wardrobe must not have
    // quietly handed over the items that are supposed to cost something. These
    // four are the whole gated set, and cyan/magenta in particular are the
    // pair that once shipped as canister drops and rewrote 38 of 40 users'
    // histories — they stay level-gated.
    const gated = AVATARS.filter(
      (a) => a.id.startsWith("avatar.grad.") && a.unlock.kind !== "starter",
    ).map((g) => g.id);

    expect(gated.sort()).toEqual(
      [
        "avatar.grad.cyan",
        "avatar.grad.magenta",
        "avatar.grad.nitrate",
        "avatar.grad.toxic",
      ].sort(),
    );
  });

  it("unlock rules cover level and challenge requirements", () => {
    const nitrate = AVATARS.find((a) => a.id === "avatar.grad.nitrate");
    expect(nitrate?.unlock).toEqual({ kind: "level", level: 5 });
    expect(nitrate?.rarity).toBe("common");

    const cyan = AVATARS.find((a) => a.id === "avatar.grad.cyan");
    expect(cyan?.unlock).toEqual({ kind: "level", level: 10 });
    expect(cyan?.rarity).toBe("rare");

    const magenta = AVATARS.find((a) => a.id === "avatar.grad.magenta");
    expect(magenta?.unlock).toEqual({ kind: "level", level: 20 });
    expect(magenta?.rarity).toBe("rare");

    const toxic = AVATARS.find((a) => a.id === "avatar.grad.toxic");
    expect(toxic?.unlock).toEqual({ kind: "challenge", key: "cryptologist" });
    expect(toxic?.rarity).toBe("legendary");
  });

  it("every gradient avatar has a matching .ca-* rule in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const grads = AVATARS.filter((a) => a.id.startsWith("avatar.grad."));
    for (const item of grads) {
      const cls = item.id.replace(/^avatar\.grad\./, "ca-");
      expect(css, `${item.id} missing .${cls} rule in globals.css`).toMatch(
        new RegExp(`\\.${cls}\\b`),
      );
    }
  });
});
