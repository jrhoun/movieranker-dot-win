import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import BetaWalkthroughCard from "./BetaWalkthroughCard";
import BetaWalkthroughCardReExport from "../BetaWalkthroughCard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("BetaWalkthroughCard", () => {
  it("renders 1/3 progress for newly signed in user without handle or public lists", () => {
    const html = renderToStaticMarkup(
      h(BetaWalkthroughCard, {
        isSignedIn: true,
        hasHandle: false,
        publicDoneLists: 0,
      }),
    );
    expect(html).toContain("1 / 3");
    expect(html).toContain("Claim your handle");
    expect(html).toContain("Finish one ranking and publish it");
    expect(html).not.toContain("Claim Beta Canister");
  });

  it("renders 2/3 progress when user has signed in and claimed handle", () => {
    const html = renderToStaticMarkup(
      h(BetaWalkthroughCard, {
        isSignedIn: true,
        hasHandle: true,
        publicDoneLists: 0,
      }),
    );
    expect(html).toContain("2 / 3");
    expect(html).toContain("Curator handle claimed");
    expect(html).toContain("Finish one ranking and publish it");
    expect(html).toContain("The weekly Marquee counts");
    expect(html).not.toContain("Claim Beta Canister");
  });

  it("step 3's Start Ranking link goes straight into the weekly ranking builder, not the homepage root", () => {
    const html = renderToStaticMarkup(
      h(BetaWalkthroughCard, {
        isSignedIn: true,
        hasHandle: true,
        publicDoneLists: 0,
      }),
    );
    expect(html).toContain('href="/#start"');
  });

  it("renders 3/3 and reveals Claim Beta Canister button when all 3 steps are complete", () => {
    const html = renderToStaticMarkup(
      h(BetaWalkthroughCard, {
        isSignedIn: true,
        hasHandle: true,
        publicDoneLists: 1,
      }),
    );
    expect(html).toContain("3 / 3");
    expect(html).toContain("Challenge Complete!");
    expect(html).toContain("Claim Beta Canister");
  });

  it("renders unveiled cosmetic rewards with equip buttons when beta cosmetics are equipped", () => {
    const html = renderToStaticMarkup(
      h(BetaWalkthroughCard, {
        isSignedIn: true,
        hasHandle: true,
        publicDoneLists: 2,
        equipped: {
          frame: "frame.beta",
        },
      }),
    );
    expect(html).toContain("Beta Canister Cosmetics Unlocked");
    expect(html).toContain("Beta Reel");
    expect(html).toContain("Beta Cassette");
    expect(html).toContain("Betamax");
    expect(html).toContain("Equipped ✓");
  });

  it("re-export from src/components/BetaWalkthroughCard matches default export", () => {
    expect(BetaWalkthroughCardReExport).toBe(BetaWalkthroughCard);
  });
});
