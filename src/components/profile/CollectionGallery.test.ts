import { describe, expect, it } from "vitest";
import { labelFor, unlockLabel } from "@/lib/cosmetics/labels";
import { isEarnedTagline } from "@/lib/cosmetics/taglines";
import { CATALOGUE, itemsForSlot, SLOTS } from "@/lib/cosmetics/catalogue";
import { collectionCategories } from "@/lib/cosmetics/categories";
import { syntheticPosterAvatar, posterAvatarId } from "@/lib/cosmetics/avatars";
import type { CosmeticItem, TaglineItem } from "@/lib/cosmetics/types";
import { ACHIEVEMENTS } from "@/lib/gamification";

/**
 * These assert the FUNCTION THE GALLERY CALLS, not a copy of its expression.
 * The previous version rebuilt the same slot-then-tagline-set list it was
 * checking and compared it to the catalogue, so it agreed with itself by
 * construction: had the gallery stopped rendering a category, this suite would
 * have stayed green. Now the categories come from the shared builder, and the
 * "every item exactly once" claim is a claim about what actually ships.
 */
describe("collection gallery coverage", () => {
  const categories = collectionCategories();
  const shown = categories.flatMap((c) => c.items.map((i) => i.id));

  it("shows every catalogue item exactly once", () => {
    expect(new Set(shown).size, "an item is rendered twice").toBe(shown.length);
    expect(shown.length, "an item is missing from the gallery").toBe(CATALOGUE.length);
    expect([...shown].sort()).toEqual(CATALOGUE.map((i) => i.id).sort());
  });

  it("gives every slot a category", () => {
    // A new slot added to SLOTS but not to the builder would be invisible in
    // the collection while still being equippable — owned items nobody can
    // find. Taglines are the one slot spread over several categories.
    for (const slot of SLOTS) {
      const covering = categories.filter((c) => c.items.some((i) => i.slot === slot));
      expect(covering.length, `slot "${slot}" has no category`).toBeGreaterThan(0);
    }
  });

  it("gives every category a title and a stable unique key", () => {
    const keys = categories.map((c) => c.key);
    expect(new Set(keys).size, "two categories share a key").toBe(keys.length);
    for (const c of categories) {
      expect(c.title, c.key).toBeTruthy();
      expect(c.items.length, `${c.key} is an empty category`).toBeGreaterThan(0);
    }
  });

  it("puts a claimed poster avatar in the avatars category", () => {
    // Claims are per-user and never in CATALOGUE. A claim costs an allowance,
    // so one that appears nowhere is one the user will forget they spent.
    const claim = syntheticPosterAvatar(posterAvatarId(155)) as CosmeticItem;
    const withClaim = collectionCategories([claim]);
    const avatars = withClaim.find((c) => c.key === "avatar");
    expect(avatars?.items.map((i) => i.id)).toContain("avatar.poster.155");
  });

  it("does not leak a claimed avatar into the base catalogue view", () => {
    // collectionCategories() with no argument must be the pure catalogue —
    // otherwise the coverage assertion above would drift with a user's claims.
    expect(shown).not.toContain("avatar.poster.155");
  });
});

describe("unlockLabel", () => {
  it("names the specific path for every unlock kind", () => {
    // "Coming Soon" and a blur were removed from an earlier build deliberately:
    // a collection that hides its contents cannot make anyone want anything.
    expect(unlockLabel({ kind: "starter" })).toBe("Yours from the start");
    expect(unlockLabel({ kind: "level", level: 25 })).toBe("Level 25");
    expect(unlockLabel({ kind: "marquee", themeSlug: "w1" })).toMatch(/Marquee/);
    expect(unlockLabel({ kind: "drop" })).toMatch(/canister/);
    expect(unlockLabel({ kind: "purchase" })).toMatch(/Not yet/);
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
    // a taglineTexts entry, which turned all 84 static lines into
    // "An earned line" whenever a caller passed an incomplete map.
    for (const t of staticLines) {
      expect(labelFor(t, {}), t.id).not.toBe("An earned line");
      expect(labelFor(t, {}), t.id).toContain(t.name);
    }
  });

  it("leaves non-tagline items as their plain name", () => {
    for (const item of CATALOGUE.filter((i) => i.slot !== "tagline")) {
      expect(labelFor(item, {}), item.id).toBe(item.name);
    }
  });
});
