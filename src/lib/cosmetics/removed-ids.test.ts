// src/lib/cosmetics/removed-ids.test.ts
import { describe, expect, it } from "vitest";
import { itemById, starterFor } from "./catalogue";
import { resolveEquipped, sanitizeEquipped, type Equipped } from "./equipped";
import { validateEquipPatch } from "./equip-guard";
import { canEquip, ownedItemIds } from "./ownership";
import { labelFor } from "./labels";
import { howToEarn } from "@/components/profile/how-to-earn";
import { unlockGroups } from "@/app/(site)/u/profile/customise/panes";
import type { Slot } from "./types";

/**
 * EVERY ID THE 2026-09-28 CATALOGUE CUT REMOVED.
 *
 * Any of these may still sit in a real account's stored `showcase.equipped`,
 * in a grant, or in a share-card URL. Nothing that reads one may throw, and
 * nothing may render it: a profile wearing a removed frame falls back to the
 * slot's starter, silently, on both profile pages. This list is the contract
 * — add to it when the catalogue loses an id, never prune it.
 */
const REMOVED: Record<Slot, string[]> = {
  frame: ["frame.toxic", "frame.neon-cyan", "frame.neon-magenta", "frame.vhs"],
  background: ["background.velvet"],
  overlay: ["overlay.vhs"],
  tagline: [
    "tagline.print.live-audience",
    "tagline.80s.rewind",
    "tagline.80s.tracking",
    "tagline.80s.sp-mode",
    "tagline.80s.videocassette",
    "tagline.80s.taped-over",
    "tagline.90s.new-release",
    "tagline.90s.widescreen",
    "tagline.90s.two-discs",
    "tagline.90s.staff-pick",
    "tagline.90s.last-copy",
    "tagline.00s.unrated",
    "tagline.00s.remastered",
    "tagline.00s.commentary",
    "tagline.00s.deleted-scenes",
    "tagline.00s.explain",
    "tagline.10s.skip-intro",
    "tagline.10s.because-you-watched",
    "tagline.10s.exclusive",
    "tagline.10s.leaving",
    "tagline.10s.still-watching",
  ],
  avatar: [
    "avatar.grad.chroma",
    "avatar.grad.popcorn",
    "avatar.grad.midnight",
    "avatar.grad.dusk",
    "avatar.grad.aurora",
    "avatar.grad.ultraviolet",
    "avatar.grad.nitrate",
    "avatar.grad.cyan",
    "avatar.grad.magenta",
    "avatar.grad.toxic",
    // The six seeds dropped from each of the three kept styles.
    ...["lorelei", "notionists", "open-peeps"].flatMap((style) =>
      ["marquee", "curtain", "premiere", "noir", "technicolor", "director"].map(
        (seed) => `avatar.gen.${style}-${seed}`,
      ),
    ),
    // The three styles dropped wholesale.
    ...["pixel-art", "shapes", "thumbs"].flatMap((style) =>
      [
        "reel",
        "usher",
        "matinee",
        "double-feature",
        "spotlight",
        "celluloid",
        "marquee",
        "curtain",
        "premiere",
        "noir",
        "technicolor",
        "director",
      ].map((seed) => `avatar.gen.${style}-${seed}`),
    ),
  ],
};

const ALL_REMOVED = (Object.keys(REMOVED) as Slot[]).flatMap((slot) =>
  REMOVED[slot].map((id) => [slot, id] as const),
);

/**
 * The ids real accounts had equipped when the cut was made. Every one of them
 * survived it; this pins that, so a later cut that removes one has to come
 * here and argue with the list.
 */
const EQUIPPED_IN_PRODUCTION = [
  "avatar.gen.beta-reel",
  "frame.beta",
  "tagline.earned.pioneer",
  "background.spotlight",
  "avatar.gen.lorelei-reel",
  "frame.perforation",
  "background.filmstrip",
  "overlay.none",
];

const richOwner = ownedItemIds({
  userId: "long-timer",
  level: 100,
  unlockedAchievementKeys: ["cryptologist", "beta_pioneer", "centurion", "season_ticket"],
  finishedThemeSlugs: Array.from({ length: 30 }, (_, i) => `w${i}`),
  avatarClaims: [155],
});

describe("removed catalogue ids", () => {
  it("names a real removal — none of these is in the catalogue", () => {
    expect(ALL_REMOVED.length).toBeGreaterThan(80);
    for (const [, id] of ALL_REMOVED) {
      expect(itemById(id), `${id} is still in the catalogue`).toBeUndefined();
    }
  });

  it("every id a real account had equipped survived the cut", () => {
    for (const id of EQUIPPED_IN_PRODUCTION) {
      expect(itemById(id), `${id} was removed but is equipped in production`).toBeDefined();
    }
  });

  it("resolveEquipped falls back to the slot's starter, never throws", () => {
    for (const [slot, id] of ALL_REMOVED) {
      const equipped = { [slot]: id } as Equipped;
      let r: ReturnType<typeof resolveEquipped> | undefined;
      expect(() => {
        r = resolveEquipped(equipped, richOwner);
      }, id).not.toThrow();
      if (slot === "tagline") {
        expect(r?.tagline, id).toBeUndefined();
      } else {
        expect(r?.[slot], id).toBe(starterFor(slot).id);
      }
    }
  });

  it("sanitizeEquipped (the RLS-limited public page) does the same with no owned set", () => {
    for (const [slot, id] of ALL_REMOVED) {
      const equipped = { [slot]: id } as Equipped;
      let r: ReturnType<typeof sanitizeEquipped> | undefined;
      expect(() => {
        r = sanitizeEquipped(equipped);
      }, id).not.toThrow();
      if (slot === "tagline") {
        expect(r?.tagline, id).toBeUndefined();
      } else {
        expect(r?.[slot], id).toBe(starterFor(slot).id);
      }
    }
  });

  it("never becomes owned, even through a grant, and cannot be equipped", () => {
    const owned = ownedItemIds(
      {
        userId: "granted",
        level: 100,
        unlockedAchievementKeys: ["cryptologist", "beta_pioneer"],
        finishedThemeSlugs: ["w1", "w2", "w3"],
      },
      ALL_REMOVED.map(([, id]) => id),
    );
    for (const [slot, id] of ALL_REMOVED) {
      expect(owned.has(id), id).toBe(false);
      expect(canEquip(id, richOwner), id).toBe(false);
      const patch = { [slot]: id } as Equipped;
      const r = validateEquipPatch(patch, richOwner, new Set([155]));
      expect(r.ok, id).toBe(false);
    }
  });

  it("a stored id from every removed slot, all at once, still dresses a profile", () => {
    const worst: Equipped = {
      frame: "frame.vhs",
      background: "background.velvet",
      overlay: "overlay.vhs",
      tagline: "tagline.10s.still-watching",
      avatar: "avatar.gen.thumbs-director",
    };
    for (const r of [resolveEquipped(worst, richOwner), sanitizeEquipped(worst)]) {
      expect(r.frame).toBe("frame.brass");
      expect(r.background).toBe("background.spotlight");
      expect(r.overlay).toBe("overlay.none");
      expect(r.avatar).toBe("avatar.gen.lorelei-reel");
      expect(r.tagline).toBeUndefined();
    }
  });

  it("the display helpers do not know the removed ids either — no orphan copy remains", () => {
    // labelFor and howToEarn take an item, not an id, so a removed id can only
    // reach them through a catalogue lookup that now returns nothing. Assert
    // the lookup, and that grouping a removed id into a pane is a no-op rather
    // than a crash.
    for (const [slot, id] of ALL_REMOVED) {
      const item = itemById(id);
      expect(item, id).toBeUndefined();
      expect(() => unlockGroups([], new Set([id])), id).not.toThrow();
      expect(unlockGroups([], new Set([id]))).toEqual([]);
      void slot;
    }
    // And the survivors still label and price normally.
    for (const id of EQUIPPED_IN_PRODUCTION) {
      const item = itemById(id)!;
      expect(labelFor(item, {}, true)).toBeTruthy();
      expect(howToEarn(item.unlock)).toMatch(/\.$/);
    }
  });
});
