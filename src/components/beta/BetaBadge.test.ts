import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BetaBadge from "./BetaBadge";
import BetaBadgeReExport from "../BetaBadge";

describe("BetaBadge", () => {
  it("renders a vintage cinema-styled gold pill with text Beta", () => {
    const html = renderToStaticMarkup(h(BetaBadge));
    expect(html).toContain("Beta");
    expect(html).toContain("bg-gold/15");
    expect(html).toContain("text-gold");
    expect(html).toContain("ring-gold/40");
    expect(html).toContain("text-[10px]");
    expect(html).toContain("font-display");
    expect(html).toContain("tracking-widest");
  });

  it("appends custom className when provided", () => {
    const html = renderToStaticMarkup(h(BetaBadge, { className: "custom-class" }));
    expect(html).toContain("custom-class");
  });

  it("re-export from src/components/BetaBadge matches default export", () => {
    expect(BetaBadgeReExport).toBe(BetaBadge);
  });

  it("renders with interactive button semantics, cursor-pointer, and accessible title", () => {
    const html = renderToStaticMarkup(h(BetaBadge));
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("cursor-pointer");
    expect(html).toContain('title="View beta requirements"');
    expect(html).toContain('aria-label="View beta requirements"');
  });
});
