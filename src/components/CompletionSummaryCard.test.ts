import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CompletionSummaryCard from "./CompletionSummaryCard";
import type { CompletionSummary } from "@/lib/completion";

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
  };

  it("renders default title 'Ranking settled' when title is omitted", () => {
    const html = renderToStaticMarkup(h(CompletionSummaryCard, { summary: baseSummary }));
    expect(html).toContain("Ranking settled");
    expect(html).toContain("Projectionist");
    expect(html).toContain("25 XP earned.");
  });

  it("renders custom title when provided (e.g. 'Early result')", () => {
    const html = renderToStaticMarkup(
      h(CompletionSummaryCard, { summary: baseSummary, title: "Early result" }),
    );
    expect(html).toContain("Early result");
    expect(html).not.toContain("Ranking settled");
  });

  it("renders level-up state correctly", () => {
    const levelUpSummary: CompletionSummary = {
      ...baseSummary,
      level: 3,
      previousLevel: 2,
      leveledUp: true,
      rank: "Assistant Manager",
    };
    const html = renderToStaticMarkup(h(CompletionSummaryCard, { summary: levelUpSummary }));
    expect(html).toContain("That took you from level 2 to level 3");
    expect(html).toContain("Assistant Manager");
  });

  it("renders newly earned achievements with laurel wrappers", () => {
    const achievementSummary: CompletionSummary = {
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
    };
    const html = renderToStaticMarkup(h(CompletionSummaryCard, { summary: achievementSummary }));
    expect(html).toContain("You also earned an achievement.");
    expect(html).toContain("First Premiere");
    expect(html).toContain("Finished your first head-to-head matchup.");
  });
});
