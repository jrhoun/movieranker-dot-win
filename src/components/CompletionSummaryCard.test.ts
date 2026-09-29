import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CompletionSummaryCard from "./CompletionSummaryCard";
import type { CompletionSummary } from "@/lib/completion";
import type { NewCosmeticGroup } from "@/lib/cosmetics/unlock-diff";
import { MIN_PIN_LIST_LEVEL, UNLOCKS } from "@/lib/gamification";

describe("CompletionSummaryCard", () => {
  const baseSummary: CompletionSummary = {
    xpEarned: 25,
    totalXp: 150,
    level: 2,
    rank: "Projectionist",
    progress01: 0.6,
    nextLevelXp: 200,
    leveledUp: false,
    previousLevel: 2,
    newAchievements: [],
    levelUnlocks: [],
    newCosmetics: [],
  };

  const render = (summary: CompletionSummary, title?: string) =>
    renderToStaticMarkup(h(CompletionSummaryCard, { summary, title }));

  it("renders default title 'Ranking settled' when title is omitted", () => {
    const html = render(baseSummary);
    expect(html).toContain("Ranking settled");
    expect(html).toContain("Projectionist");
    expect(html).toContain("25 XP earned.");
  });

  it("renders custom title when provided (e.g. 'Early result')", () => {
    const html = render(baseSummary, "Early result");
    expect(html).toContain("Early result");
    expect(html).not.toContain("Ranking settled");
  });

  it("renders nothing extra when nothing is new", () => {
    const html = render(baseSummary);
    expect(html).not.toContain("Unlocked");
    expect(html).not.toContain("Wear it");
    expect(html).not.toContain("/u/profile/customise");
  });

  it("renders level-up state correctly, and repeats the level in the Unlocked block", () => {
    const html = render({
      ...baseSummary,
      level: 3,
      previousLevel: 2,
      leveledUp: true,
      rank: "Assistant Manager",
    });
    expect(html).toContain("That took you from level 2 to level 3");
    expect(html).toContain("Assistant Manager");
    expect(html).toContain("Unlocked");
    expect(html).toContain("Level 3, ");
  });

  it("names the ability a level-up opened, in the reader's words", () => {
    const featured = UNLOCKS.find((u) => u.atLevel === MIN_PIN_LIST_LEVEL)!;
    const html = render({
      ...baseSummary,
      level: MIN_PIN_LIST_LEVEL,
      previousLevel: MIN_PIN_LIST_LEVEL - 1,
      leveledUp: true,
      levelUnlocks: [featured],
    });
    expect(html).toContain(`${featured.name}: ${featured.effect.charAt(0).toLowerCase()}`);
    expect(html).toContain(`${featured.effect.slice(1)}.`);
  });

  it("does not describe a nameplate as an ability", () => {
    const nameplate = UNLOCKS.find((u) => u.kind === "nameplate")!;
    const html = render({
      ...baseSummary,
      level: nameplate.atLevel,
      previousLevel: nameplate.atLevel - 1,
      leveledUp: true,
      levelUnlocks: [nameplate],
    });
    expect(html).not.toContain(nameplate.effect.slice(1));
  });

  it("renders newly earned achievements with laurel wrappers under Unlocked", () => {
    const html = render({
      ...baseSummary,
      newAchievements: [
        {
          key: "first_premiere",
          name: "First Premiere",
          description: "Finished your first head-to-head matchup.",
          icon: "🎟️",
          rarity: "common",
          unlocked: true,
        },
      ],
    });
    expect(html).toContain("Unlocked");
    expect(html).toContain("First Premiere");
    expect(html).toContain("Finished your first head-to-head matchup.");
    expect(html).not.toContain("🎟️");
  });

  it("names cosmetics plainly, quotes one tagline, and links once to the dressing room", () => {
    const newCosmetics: NewCosmeticGroup[] = [
      {
        slot: "frame",
        title: "Frames",
        items: [{ id: "frame.x", slot: "frame", name: "Sprocket", label: "Sprocket", unlock: "level" }],
      },
      {
        slot: "overlay",
        title: "Atmosphere",
        items: [
          { id: "overlay.x", slot: "overlay", name: "Film Grain", label: "Film Grain", unlock: "drop" },
        ],
      },
      {
        slot: "tagline",
        title: "Taglines",
        items: [
          { id: "tagline.a", slot: "tagline", name: "In a world…", label: "“In a world…”", unlock: "drop" },
          { id: "tagline.b", slot: "tagline", name: "Coming soon.", label: "“Coming soon.”", unlock: "drop" },
        ],
      },
    ];
    const html = render({ ...baseSummary, newCosmetics });
    expect(html).toContain("Yours now: Sprocket frame.");
    expect(html).toContain("From this week’s Marquee: Film Grain atmosphere, “In a world…”, one more line.");
    expect(html).not.toContain("“Coming soon.”");
    expect(html).toContain("Wear it");
    expect((html.match(/\/u\/profile\/customise/g) ?? []).length).toBe(1);
  });

  it("never uses the retired vocabulary", () => {
    const html = render({
      ...baseSummary,
      leveledUp: true,
      level: 3,
      previousLevel: 2,
      newCosmetics: [
        {
          slot: "frame",
          title: "Frames",
          items: [{ id: "frame.x", slot: "frame", name: "Sprocket", label: "Sprocket", unlock: "drop" }],
        },
      ],
    });
    for (const word of ["canister", "bundle", "legendary", "rare", "Premiere Pass"]) {
      expect(html.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});
