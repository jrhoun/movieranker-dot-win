import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import IdentityDropdown from "./IdentityDropdown";

const signOut = vi.fn(async () => {});

describe("IdentityDropdown", () => {
  it("shows no gold dot by default", () => {
    const html = renderToStaticMarkup(h(IdentityDropdown, { handle: "jr", signOut }));
    expect(html).not.toContain("bg-gold ring-2 ring-bg");
  });

  it("shows a gold dot on the trigger while the Beta Test Screener achievement is incomplete", () => {
    const html = renderToStaticMarkup(
      h(IdentityDropdown, { handle: "jr", signOut, betaIncomplete: true }),
    );
    expect(html).toContain("bg-gold ring-2 ring-bg");
  });

  it("hides the dot once the achievement is unlocked", () => {
    const html = renderToStaticMarkup(
      h(IdentityDropdown, { handle: "jr", signOut, betaIncomplete: false }),
    );
    expect(html).not.toContain("bg-gold ring-2 ring-bg");
  });
});
