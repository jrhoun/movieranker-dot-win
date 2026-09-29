import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ClaimHandleCard, { VISIBILITY_OPTIONS } from "./ClaimHandleCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("ClaimHandleCard visibility choice", () => {
  it("offers public first, preselected, and private second", () => {
    expect(VISIBILITY_OPTIONS.map((o) => o.value)).toEqual(["public", "private"]);
    expect(VISIBILITY_OPTIONS[0]).toEqual({
      value: "public",
      label: "Public",
      description: "Anyone with the link can see your rankings.",
    });
    expect(VISIBILITY_OPTIONS[1]).toEqual({
      value: "private",
      label: "Private",
      description: "Only you.",
    });
  });

  it("renders the claim step before any handle is typed", () => {
    // The confirm panel (with the radios) only opens after a live
    // availability check, which needs a browser; the idle card is what a
    // static render can verify.
    const html = renderToStaticMarkup(h(ClaimHandleCard));
    expect(html).toContain("Claim your handle");
    expect(html).toContain("3 to 20 characters");
    expect(html).not.toContain("Who can see your profile");
  });
});
