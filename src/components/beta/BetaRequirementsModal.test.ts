import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import BetaRequirementsModal from "./BetaRequirementsModal";

describe("BetaRequirementsModal", () => {
  it("renders an accessible native dialog with correct title and ARIA attributes", () => {
    const html = renderToStaticMarkup(
      h(BetaRequirementsModal, {
        isOpen: true,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("<dialog");
    expect(html).toContain('aria-labelledby="beta-requirements-title"');
    expect(html).toContain('id="beta-requirements-title"');
    expect(html).toContain("Beta Test Screener");
    expect(html).toContain('aria-label="Close beta requirements dialog"');
  });

  it("renders the 3 beta requirements in unauthenticated state with action links", () => {
    const html = renderToStaticMarkup(
      h(BetaRequirementsModal, {
        isOpen: true,
        onClose: vi.fn(),
        stats: {
          isSignedIn: false,
          hasHandle: false,
          publicDoneLists: 0,
        },
      })
    );

    expect(html).toContain("Create an account");
    expect(html).toContain("Claim your handle");
    expect(html).toContain("Contribute a public ranking");

    // Action links
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/#start"');
  });

  it("renders checkmarks for completed requirements and link to profile when all complete", () => {
    const html = renderToStaticMarkup(
      h(BetaRequirementsModal, {
        isOpen: true,
        onClose: vi.fn(),
        stats: {
          isSignedIn: true,
          hasHandle: true,
          handle: "cinephile",
          publicDoneLists: 2,
        },
      })
    );

    expect(html).toContain("@cinephile");
    expect(html).toContain("2 public rankings");
    expect(html).toContain("All 3 Requirements Completed!");
    expect(html).toContain('href="/u/profile#beta"');
  });

  it("displays what the Beta Test Screener wears", () => {
    const html = renderToStaticMarkup(
      h(BetaRequirementsModal, {
        isOpen: true,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("Beta Reel");
    expect(html).toContain("Beta Cassette");
    expect(html).toContain("Betamax was better");
  });
});
