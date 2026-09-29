import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BetaWalkthroughCard from "./BetaWalkthroughCard";
import BetaWalkthroughCardReExport from "../BetaWalkthroughCard";

const render = (props: Parameters<typeof BetaWalkthroughCard>[0]) =>
  renderToStaticMarkup(h(BetaWalkthroughCard, props));

describe("BetaWalkthroughCard", () => {
  it("renders 1/3 progress for a signed-in user without handle or public lists", () => {
    const html = render({ isSignedIn: true, hasHandle: false, publicDoneLists: 0 });
    expect(html).toContain("1 / 3");
    expect(html).toContain("Claim your handle");
    expect(html).toContain("Finish one ranking and publish it");
    expect(html).not.toContain("Wear them");
  });

  it("renders 2/3 progress when the user has signed in and claimed a handle", () => {
    const html = render({ isSignedIn: true, hasHandle: true, publicDoneLists: 0 });
    expect(html).toContain("2 / 3");
    expect(html).toContain("Handle claimed");
    expect(html).toContain("The weekly Marquee counts");
    expect(html).not.toContain("Wear them");
  });

  it("renders 0/3 with every step's link when signed out", () => {
    const html = render({ isSignedIn: false, hasHandle: false, publicDoneLists: 0 });
    expect(html).toContain("0 / 3");
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="#claim-heading"');
    expect(html).toContain('href="/#start"');
  });

  it("step 3 goes straight into the weekly ranking builder, not the homepage root", () => {
    const html = render({ isSignedIn: true, hasHandle: true, publicDoneLists: 0 });
    expect(html).toContain('href="/#start"');
  });

  it("shows the laurel, what it came with, and one link to wear it when all three steps are done", () => {
    const html = render({ isSignedIn: true, hasHandle: true, publicDoneLists: 1 });
    expect(html).toContain("3 / 3");
    expect(html).toContain("1 public ranking settled");
    expect(html).toContain("Beta Test Screener");
    expect(html).toContain(
      "Yours: the Beta Reel avatar, the Beta Cassette frame, and one tagline.",
    );
    expect(html).toContain("Wear them");
    expect((html.match(/\/u\/profile\/customise/g) ?? []).length).toBe(1);
    // The dismiss control appears only once the achievement is earned.
    expect(html).toContain("Dismiss");
  });

  it("pluralises settled public rankings", () => {
    const html = render({ isSignedIn: true, hasHandle: true, publicDoneLists: 7 });
    expect(html).toContain("7 public rankings settled");
  });

  it("no longer claims, equips, or celebrates with a fake ceremony", () => {
    const html = render({
      isSignedIn: true,
      hasHandle: true,
      publicDoneLists: 2,
      equipped: { frame: "frame.beta" },
    });
    for (const word of [
      "canister",
      "bundle",
      "legendary",
      "rare",
      "challenge complete",
      "conquered",
      "claim beta",
      "equip",
      "beta event",
      "beta test screening",
    ]) {
      expect(html.toLowerCase()).not.toContain(word);
    }
    expect(html).not.toContain("<canvas");
  });

  it("renders without props", () => {
    const html = render({});
    expect(html).toContain("Beta Test Screener");
  });

  it("re-export from src/components/BetaWalkthroughCard matches default export", () => {
    expect(BetaWalkthroughCardReExport).toBe(BetaWalkthroughCard);
  });
});
