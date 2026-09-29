// src/lib/cosmetics/marquee-drops.test.ts
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";
import { drawFrom, droppablePool } from "./marquee-drops";
import * as shim from "./canister";
import type { CosmeticItem } from "./types";

const pool = (ids: string[]): CosmeticItem[] =>
  CATALOGUE.filter((i) => ids.includes(i.id));

describe("droppablePool", () => {
  it("contains only items whose unlock kind is drop — an allowlist", () => {
    for (const item of droppablePool(new Set())) {
      expect(item.unlock.kind, item.id).toBe("drop");
    }
  });

  it("never offers a level, challenge or marquee item", () => {
    const ids = new Set(droppablePool(new Set()).map((i) => i.id));
    for (const item of CATALOGUE) {
      if (item.unlock.kind !== "drop") {
        expect(ids.has(item.id), `${item.id} leaked into the pool`).toBe(false);
      }
    }
  });

  it("excludes what is already owned, so a drop is always a real gain", () => {
    const all = droppablePool(new Set());
    const owned = new Set([all[0].id]);
    expect(droppablePool(owned).map((i) => i.id)).not.toContain(all[0].id);
  });

  it("is ten items after the 2026-09-28 cut: eight lines and two atmospheres", () => {
    // Pinned on purpose. Every drop is positional in `drawFrom`, so a change
    // here is a change to what every user has already drawn — the same
    // reason ownership.test.ts pins the sequence itself.
    const ids = droppablePool(new Set()).map((i) => i.id);
    expect(ids).toEqual([
      "overlay.dust",
      "overlay.flicker",
      "tagline.trailer.one-last-job",
      "tagline.trailer.personal",
      "tagline.trailer.unprepared",
      "tagline.trailer.never-the-same",
      "tagline.print.no-animals",
      "tagline.print.on-location",
      "tagline.print.aspect-ratio",
      "tagline.print.fictitious",
    ]);
  });
});

describe("drawFrom", () => {
  it("is deterministic for the same seed", () => {
    const p = droppablePool(new Set());
    expect(drawFrom(p, "user-1|week-3")?.id).toBe(drawFrom(p, "user-1|week-3")?.id);
  });

  it("differs by user, so two players hold different sets at the same week", () => {
    const p = droppablePool(new Set());
    const picks = new Set(
      Array.from({ length: 40 }, (_, i) => drawFrom(p, `user-${i}|week-3`)?.id),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("returns null once the pool is exhausted, rather than faking a reward", () => {
    expect(drawFrom([], "user-1|week-9")).toBeNull();
  });

  it("only ever returns a member of the pool it was given", () => {
    const p = pool(["overlay.dust", "tagline.print.no-animals"]);
    for (let i = 0; i < 50; i += 1) {
      expect(p).toContain(drawFrom(p, `seed-${i}`));
    }
  });

  it("favours common over rare across many seeds", () => {
    const p = droppablePool(new Set());
    const counts = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 2000; i += 1) {
      const pick = drawFrom(p, `u${i}|w1`);
      if (pick) counts[pick.rarity] += 1;
    }
    expect(counts.common).toBeGreaterThan(counts.rare);
  });
});

describe("the canister.ts shim", () => {
  it("re-exports the same functions, so an old import path still draws the same item", () => {
    // Files outside this module still import "./cosmetics/canister"; the
    // rename must not fork the draw.
    expect(shim.drawFrom).toBe(drawFrom);
    expect(shim.droppablePool).toBe(droppablePool);
  });
});
