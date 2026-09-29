import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { labelFor, unlockLabel } from "@/lib/cosmetics/labels";
import { isEarnedTagline } from "@/lib/cosmetics/taglines";
import { isLiveMarqueeTheme } from "@/lib/marquee-title";
import { CATALOGUE, itemsForSlot, SLOTS } from "@/lib/cosmetics/catalogue";
import { collectionCategories } from "@/lib/cosmetics/categories";
import { posterAvatarId, syntheticPosterAvatar } from "@/lib/cosmetics/avatars";
import type { CosmeticItem, TaglineItem } from "@/lib/cosmetics/types";
import { ACHIEVEMENTS } from "@/lib/gamification";
import {
  avatarGroups,
  isSectionId,
  SECTIONS,
  taglineGroups,
  unlockGroups,
  type ItemGroup,
} from "./panes";

/**
 * THE WARDROBE'S ONE CLAIM: everything in the game is on this page, exactly
 * once, and every locked piece says what it asks for.
 *
 * These assert the FUNCTIONS THE PANES CALL, not a copy of their expressions —
 * the suite this replaced (CollectionGallery.test.ts) rebuilt the same
 * slot-then-set list it was checking, so it agreed with itself by construction
 * and would have stayed green had a whole category stopped rendering. The
 * gallery is gone; the customise page is the collection now, and the claim it
 * inherited is checked here against the real grouping.
 *
 * `vitest.config.ts` runs in `node` and collects only `src/**\/*.test.ts`, so
 * copy and structure are what can be tested — and copy is what would rot.
 */

/** Every item the five cosmetic panes draw, in the rows they draw them in. */
function paneRows(owned: ReadonlySet<string>, claimed: CosmeticItem[] = []): ItemGroup[] {
  return [
    ...avatarGroups(claimed),
    ...unlockGroups(itemsForSlot("frame"), owned),
    ...unlockGroups(itemsForSlot("background"), owned),
    ...unlockGroups(itemsForSlot("overlay"), owned),
    ...taglineGroups(),
  ];
}

const NOTHING_OWNED = new Set<string>();
const EVERYTHING_OWNED = new Set(CATALOGUE.map((i) => i.id));

describe("dressing room panes", () => {
  it("has one nav entry per pane, with unique ids", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SECTIONS) {
      expect(s.label, s.id).toBeTruthy();
      expect(isSectionId(s.id)).toBe(true);
    }
    expect(isSectionId("not-a-pane")).toBe(false);
  });

  it("names the two panes the profile page links into", () => {
    // /u/profile deep-links "Choose featured achievements" at this fragment.
    expect(SECTIONS.map((s) => s.id)).toContain("featured-achievements");
    expect(SECTIONS.map((s) => s.id)).toContain("featured-ranking");
  });

  // Both directions matter: ownership decides which ROW an item lands in, so a
  // grouping bug could hide an item from someone who owns it, or from someone
  // who does not, without ever hiding it from both.
  for (const [name, owned] of [
    ["nothing owned", NOTHING_OWNED],
    ["everything owned", EVERYTHING_OWNED],
  ] as const) {
    it(`shows every catalogue item exactly once (${name})`, () => {
      const shown = paneRows(owned).flatMap((g) => g.items.map((i) => i.id));
      expect(new Set(shown).size, "an item is shown twice").toBe(shown.length);
      expect([...shown].sort()).toEqual(CATALOGUE.map((i) => i.id).sort());
    });
  }

  it("gives every slot at least one row", () => {
    // A new slot added to SLOTS but not to a pane would be invisible in the
    // dressing room while still being equippable — owned items nobody can find.
    const rows = paneRows(NOTHING_OWNED);
    for (const slot of SLOTS) {
      const covering = rows.filter((g) => g.items.some((i) => i.slot === slot));
      expect(covering.length, `slot "${slot}" has no row`).toBeGreaterThan(0);
    }
  });

  it("gives every row a title, a unique key and at least one item", () => {
    const rows = paneRows(NOTHING_OWNED, [
      syntheticPosterAvatar(posterAvatarId(155)) as CosmeticItem,
    ]);
    const keys = rows.map((g) => g.key);
    expect(new Set(keys).size, "two rows share a key").toBe(keys.length);
    for (const g of rows) {
      expect(g.title, g.key).toBeTruthy();
      // An empty row is a heading over nothing — the "Yours" row on a brand
      // new profile, before it was filtered out.
      expect(g.items.length, `${g.key} is an empty row`).toBeGreaterThan(0);
    }
  });

  it("leads the frame pane with what you already own", () => {
    const owned = new Set(["frame.brass"]);
    const rows = unlockGroups(itemsForSlot("frame"), owned);
    expect(rows[0].title).toBe("Yours");
    expect(rows[0].items.map((i) => i.id)).toEqual(["frame.brass"]);
  });

  it("orders the level row by what it costs, cheapest first", () => {
    const rows = unlockGroups(itemsForSlot("frame"), NOTHING_OWNED);
    const levels = rows
      .find((g) => g.key === "frame-by-level")!
      .items.map((i) => (i.unlock.kind === "level" ? i.unlock.level : 0));
    expect(levels.length).toBeGreaterThan(1);
    expect([...levels]).toEqual([...levels].sort((a, b) => a - b));
  });

  it("files a locked item under the act that earns it, never nowhere", () => {
    // A real new profile: the starters are owned (unlockGroups files an
    // unowned starter under "Still to earn", which no real account can hit).
    const newProfile = new Set(CATALOGUE.filter((i) => i.unlock.kind === "starter").map((i) => i.id));
    const frames = unlockGroups(itemsForSlot("frame"), newProfile);
    const byKey = new Map(frames.map((g) => [g.key, g.items.map((i) => i.id)]));
    expect(byKey.get("frame-by-level")).toContain("frame.projector"); // level 15
    expect(byKey.get("frame-by-achievement")).toContain("frame.prism"); // cryptologist
    // No frame is a drop any more, so the frame pane has no "Still to earn"
    // row at all — a heading over nothing is worse than no heading.
    expect(byKey.has("frame-other")).toBe(false);
    // Drops (the atmospheres) still get the last row, without a heading each.
    const overlays = unlockGroups(itemsForSlot("overlay"), newProfile);
    const other = overlays.find((g) => g.key === "overlay-other")!.items.map((i) => i.id);
    expect(other).toEqual(["overlay.dust", "overlay.flicker"]);
  });

  it("no avatar needs a level, so the avatar pane files nothing under one", () => {
    // Spec §1.1: levelling does not award cosmetic clutter. Thirty-six
    // level-paced illustrations were exactly that, and they are gone.
    const rows = unlockGroups(itemsForSlot("avatar"), NOTHING_OWNED);
    expect(rows.find((g) => g.key === "avatar-by-level")).toBeUndefined();
    expect(rows.find((g) => g.key === "avatar-by-achievement")!.items.map((i) => i.id)).toEqual([
      "avatar.gen.beta-reel",
    ]);
  });

  it("puts a claimed poster avatar first, in its own row", () => {
    // Claims are per-user and never in CATALOGUE. A claim costs an allowance,
    // so one that appears nowhere is one the user will forget they spent.
    const claim = syntheticPosterAvatar(posterAvatarId(155)) as CosmeticItem;
    const rows = avatarGroups([claim]);
    expect(rows[0].title).toBe("Your posters");
    expect(rows[0].items.map((i) => i.id)).toContain("avatar.poster.155");
  });

  it("does not leak a claimed avatar into the base wardrobe", () => {
    // avatarGroups() with no claims must be the pure catalogue — otherwise the
    // coverage assertions above would drift with a user's claims.
    const shown = avatarGroups().flatMap((g) => g.items.map((i) => i.id));
    expect(shown).not.toContain("avatar.poster.155");
  });

  it("keeps every drawn avatar under a style row", () => {
    const rows = avatarGroups();
    const illustrated = rows.filter((g) => g.section === "Illustrated");
    const shown = illustrated.flatMap((g) => g.items.map((i) => i.id));
    const drawn = itemsForSlot("avatar")
      .filter((i) => i.id.startsWith("avatar.gen."))
      .map((i) => i.id);
    expect([...shown].sort()).toEqual([...drawn].sort());
    // One heading over the run, not one per row: the section repeats on every
    // group that belongs to it and the page prints it once.
    expect(illustrated.length).toBeGreaterThan(1);
    expect(new Set(illustrated.map((g) => g.section)).size).toBe(1);
  });

  it("splits taglines by set, reading the division from the shared builder", () => {
    const rows = taglineGroups();
    const sets = new Set((itemsForSlot("tagline") as TaglineItem[]).map((t) => t.set));
    expect(rows.length).toBe(sets.size);
    for (const row of rows) {
      // The builder titles these "Taglines · The 80s" for a tab strip; the pane
      // keeps the set name only. A dot-chained prefix on eight headings is a
      // prefix, not a heading.
      expect(sets.has(row.title), row.key).toBe(true);
      expect(row.title).not.toContain("·");
    }
  });

  it("still reads its tagline division from collectionCategories", () => {
    // The one thing panes.ts must not do is hand-write the set list (spec §7).
    const fromBuilder = collectionCategories()
      .filter((c) => c.items[0]?.slot === "tagline")
      .map((c) => c.items.length);
    expect(taglineGroups().map((g) => g.items.length)).toEqual(fromBuilder);
  });
});

describe("unlockLabel", () => {
  it("names the specific path for every unlock kind", () => {
    // "Coming Soon" and a blur were removed from an earlier build deliberately:
    // a collection that hides its contents cannot make anyone want anything.
    expect(unlockLabel({ kind: "starter" })).toBe("Yours from the start");
    expect(unlockLabel({ kind: "level", level: 25 })).toBe("Level 25");
    expect(unlockLabel({ kind: "marquee", themeSlug: "w1" })).toMatch(/Marquee/);
    expect(unlockLabel({ kind: "drop" })).toBe("From a weekly Marquee");
  });

  it("never says canister, legendary or rare — the wardrobe is not a shop", () => {
    for (const item of CATALOGUE) {
      const label = unlockLabel(item.unlock).toLowerCase();
      expect(label, item.id).not.toContain("canister");
      expect(label, item.id).not.toMatch(/\b(legendary|rare)\b/);
      expect(label, item.id).not.toMatch(/not (yet )?available/);
    }
  });

  it("resolves a challenge to the achievement's real name", () => {
    const achievement = ACHIEVEMENTS[0];
    expect(unlockLabel({ kind: "challenge", key: achievement.key })).toBe(achievement.name);
  });

  it("falls back rather than throwing on an unknown achievement key", () => {
    expect(unlockLabel({ kind: "challenge", key: "no-such-key" })).toBe("An achievement");
  });

  it("gives every catalogue item a non-empty label", () => {
    // A slot whose unlock kind gained a variant would otherwise render blank.
    for (const item of CATALOGUE) {
      expect(unlockLabel(item.unlock), item.id).toBeTruthy();
    }
  });
});

describe("labelFor", () => {
  const taglines = itemsForSlot("tagline") as TaglineItem[];
  const earned = taglines.filter((t) => isEarnedTagline(t.id));
  const staticLines = taglines.filter((t) => !isEarnedTagline(t.id));

  it("never leaks a raw {count} template, whatever the caller passes", () => {
    // All four earned lines carry "{count}" in BOTH name and text, so any
    // fallback to `name` would print the placeholder on a real page.
    for (const t of taglines) {
      expect(labelFor(t, {}), t.id).not.toContain("{count}");
      expect(labelFor(t, {}), t.id).not.toContain("{");
    }
  });

  it("withholds an unresolved earned line rather than showing its words", () => {
    // tagline.earned.pioneer has NO placeholder — its text is simply the line
    // a user who hasn't earned it is not shown. Sniffing for "{" missed it
    // once; membership is the test.
    for (const t of earned) {
      expect(labelFor(t, {}), t.id).toBe("An earned line");
    }
    expect(earned.length, "no earned taglines to check").toBeGreaterThan(0);
  });

  it("shows a resolved earned line once the viewer qualifies", () => {
    const t = earned[0];
    expect(labelFor(t, { [t.id]: "3 Marquees, and counting." })).toBe(
      "“3 Marquees, and counting.”",
    );
  });

  it("still shows a locked STATIC line's words — that is the point of a collection", () => {
    // Regression guard: an earlier draft keyed withholding off the absence of
    // a taglineTexts entry, which turned every static line into "An earned
    // line" whenever a caller passed an incomplete map.
    //
    // `now` is pinned to a fixed instant so the one live-week souvenir (masked
    // below, on purpose) is a known line rather than whichever theme happens
    // to be running on the day the suite is run.
    const now = new Date("2026-09-28T12:00:00Z");
    const live = staticLines.filter(
      (t) => t.unlock.kind === "marquee" && isLiveMarqueeTheme(t.unlock.themeSlug, now),
    );
    expect(live.length, "exactly one souvenir line is this week's").toBe(1);
    for (const t of staticLines) {
      if (live.includes(t)) continue;
      expect(labelFor(t, {}, false, now), t.id).not.toBe("An earned line");
      expect(labelFor(t, {}, false, now), t.id).toContain(t.name);
    }
  });

  it("masks the live week's Marquee souvenir until it is earned — the title is the quiz answer", () => {
    // THE SPOILER RULE (marquee-title.ts), applied to the wardrobe. A souvenir
    // line IS the theme title, and the theme title paraphrases the answer to
    // that week's connection quiz. Listing it as a locked line put the answer
    // in front of everyone who had not finished yet.
    const now = new Date("2026-09-28T12:00:00Z");
    const live = staticLines.find(
      (t) => t.unlock.kind === "marquee" && isLiveMarqueeTheme(t.unlock.themeSlug, now),
    )!;
    const masked = labelFor(live, { [live.id]: live.text }, false, now);
    expect(masked).toMatch(/^Weekly Marquee #\d+$/);
    expect(masked).not.toContain(live.text);
    // Finishing the week lifts the mask: the player has seen the title.
    expect(labelFor(live, { [live.id]: live.text }, true, now)).toBe(`“${live.text}”`);
    // And the same line, viewed after its week is over, reads in full —
    // browsing surfaces reveal past weeks (the NYT Games rule).
    const nextWeek = new Date("2026-10-05T12:00:00Z");
    expect(labelFor(live, { [live.id]: live.text }, false, nextWeek)).toBe(`“${live.text}”`);
    // The default is the safe one: a caller that forgets `owned` masks.
    expect(labelFor(live, {}, undefined, now)).toMatch(/^Weekly Marquee #/);
  });

  it("leaves non-tagline items as their plain name", () => {
    for (const item of CATALOGUE.filter((i) => i.slot !== "tagline")) {
      expect(labelFor(item, {})).toBe(item.name);
    }
  });
});

describe("collapsible customise groups", () => {
  it("renders collapsible group containers with aria-expanded attributes in customise client", () => {
    const code = readFileSync(
      resolve(__dirname, "customise-client.tsx"),
      "utf8",
    );
    expect(code).toMatch(/aria-expanded/);
    expect(code).toMatch(/Expand all/);
    expect(code).toMatch(/Collapse all/);
  });
});
