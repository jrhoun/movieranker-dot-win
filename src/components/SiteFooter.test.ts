import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SiteFooter from "./SiteFooter";

describe("SiteFooter", () => {
  it("renders footer with updated copy", () => {
    const html = renderToStaticMarkup(h(SiteFooter));

    expect(html).toContain("MovieRanker.win");
    expect(html).toContain("hidden connection");
    expect(html).not.toContain("hidden thread");
    expect(html).toContain("About the Project");
    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Terms of Service");
  });
});
