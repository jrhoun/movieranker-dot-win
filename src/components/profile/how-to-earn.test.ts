import { describe, expect, it } from "vitest";
import { CATALOGUE } from "@/lib/cosmetics/catalogue";
import { ACHIEVEMENTS } from "@/lib/gamification";
import { howToEarn } from "./how-to-earn";

/**
 * The dressing room and the collection wall print this under every locked
 * swatch, so it is the whole persuasive force of both surfaces: a legible thing
 * you do not have yet, and the specific price of it. There is no jsdom project
 * in this repo (`vitest.config.ts` collects only `src/**` + `*.test.ts`), so
 * the copy is what can be tested — and the copy is what would rot.
 */
describe("howToEarn", () => {
  it("gives every catalogue item a sentence", () => {
    for (const item of CATALOGUE) {
      const line = howToEarn(item.unlock);
      expect(line, item.id).toBeTruthy();
      // A grid that mixes "Dropped by a weekly Marquee you finished." with
      // "Level 25" reads as two different writers. Every kind is a full
      // sentence.
      expect(line, item.id).toMatch(/\.$/);
      expect(line[0], item.id).toBe(line[0].toUpperCase());
    }
  });

  it("never leaks a template placeholder, a promise, or the old vocabulary", () => {
    for (const item of CATALOGUE) {
      const line = howToEarn(item.unlock);
      // "{count}" lives in the earned taglines' name/text, never in an unlock.
      expect(line, item.id).not.toContain("{");
      // Removed from an earlier build deliberately: a collection that says
      // "Coming Soon" about a thing it is showing you has told you nothing.
      expect(line.toLowerCase(), item.id).not.toContain("coming soon");
      // Nothing is purchasable and nothing is planned to be (spec §5.4).
      expect(line.toLowerCase(), item.id).not.toContain("buy");
      // "Reel canister" left the vocabulary on 2026-09-28; a drop is from a
      // weekly Marquee, which is a thing the player has actually done.
      expect(line.toLowerCase(), item.id).not.toContain("canister");
      expect(line.toLowerCase(), item.id).not.toMatch(/\b(legendary|rare)\b/);
    }
  });

  it("names the specific path for each kind", () => {
    expect(howToEarn({ kind: "starter" })).toBe("Yours from the start.");
    expect(howToEarn({ kind: "level", level: 25 })).toBe("Unlocks at level 25.");
    expect(howToEarn({ kind: "drop" })).toBe("Dropped by a weekly Marquee you finished.");
    expect(howToEarn({ kind: "marquee", themeSlug: "w1" })).toMatch(/Marquee\.$/);
  });

  it("says which achievement, by its real name", () => {
    const achievement = ACHIEVEMENTS[0];
    expect(howToEarn({ kind: "challenge", key: achievement.key })).toBe(
      `Earned with the ${achievement.name} achievement.`,
    );
  });

  it("does not stutter on an unknown achievement key", () => {
    // unlockLabel's own fallback is the noun phrase "An achievement", which
    // interpolated into this sentence would read "the An achievement
    // achievement". Hence the separate lookup rather than wrapping it.
    expect(howToEarn({ kind: "challenge", key: "no-such-key" })).toBe(
      "Earned from an achievement.",
    );
  });
});
