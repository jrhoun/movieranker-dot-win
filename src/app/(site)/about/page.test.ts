import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders about page with tightened AI copy", () => {
    const html = renderToStaticMarkup(h(AboutPage));

    expect(html).toContain("How AI is used here");
    expect(html).toContain("human cognition");
    expect(html).toContain("exploring the limits of what I can put together with an LLM");
    expect(html).not.toContain("typing them with my fingers");
    expect(html).not.toContain("Now, back to the show!");
    expect(html).toContain("Zero Ads");
    expect(html).toContain("Head-to-Head");
    expect(html).toContain("Shareable");
  });
});
