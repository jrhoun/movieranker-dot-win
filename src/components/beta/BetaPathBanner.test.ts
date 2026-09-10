import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BetaPathBanner from "./BetaPathBanner";

describe("BetaPathBanner", () => {
  it("links to the walkthrough card's anchor on the profile page", () => {
    const html = renderToStaticMarkup(h(BetaPathBanner, { remainingSteps: 2 }));
    expect(html).toContain('href="/u/profile#beta"');
  });

  it("uses singular copy when only one step remains", () => {
    const html = renderToStaticMarkup(h(BetaPathBanner, { remainingSteps: 1 }));
    expect(html).toContain("One quick step");
  });

  it("uses plural copy when more than one step remains", () => {
    const html = renderToStaticMarkup(h(BetaPathBanner, { remainingSteps: 2 }));
    expect(html).toContain("A couple quick steps");
  });
});
