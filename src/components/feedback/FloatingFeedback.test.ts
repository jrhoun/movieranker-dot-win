import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import FloatingFeedback from "./FloatingFeedback";

let mockPathname = "/";
const mockOpenFeedback = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("./FeedbackContext", () => ({
  useFeedback: () => ({
    isOpen: false,
    openFeedback: mockOpenFeedback,
    closeFeedback: vi.fn(),
  }),
}));

describe("FloatingFeedback", () => {
  beforeEach(() => {
    mockPathname = "/";
    mockOpenFeedback.mockClear();
  });

  it("renders on regular routes with mobile 44px icon-only button and safe-area inset", () => {
    mockPathname = "/";
    const html = renderToStaticMarkup(h(FloatingFeedback));

    expect(html).toContain("aria-label=\"Open feedback dialog\"");
    expect(html).toContain("h-11 w-11");
    expect(html).toContain("bottom-[calc(env(safe-area-inset-bottom)+12px)]");
    expect(html).toContain("hidden sm:inline");
    expect(html).toContain("Feedback");
    expect(html).toContain("✦");
  });

  it("renders on list detail routes /l/[id]", () => {
    mockPathname = "/l/some-list-id";
    const html = renderToStaticMarkup(h(FloatingFeedback));

    expect(html).toContain("aria-label=\"Open feedback dialog\"");
    expect(html).toContain("h-11 w-11");
  });

  it("returns null and does not render on /r/play", () => {
    mockPathname = "/r/play";
    const html = renderToStaticMarkup(h(FloatingFeedback));
    expect(html).toBe("");
  });

  it("returns null on /r/play subpaths or query variants", () => {
    mockPathname = "/r/play/duel";
    const html = renderToStaticMarkup(h(FloatingFeedback));
    expect(html).toBe("");
  });
});
