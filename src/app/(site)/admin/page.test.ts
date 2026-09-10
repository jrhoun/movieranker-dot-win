import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

vi.mock("@/components/MarqueeHeading", () => ({
  default: ({ children }: { children: React.ReactNode }) => h("h1", null, children),
}));

vi.mock("@/components/admin/ModerationQueue", () => ({
  default: () => h("div", { "data-testid": "moderation-queue" }, "Moderation Queue"),
}));

describe("AdminPage", () => {
  it("renders the Feedback section heading and loading state", () => {
    const html = renderToStaticMarkup(h(AdminPage));
    expect(html).toContain("Feedback");
    expect(html).toContain("The site right now");
  });
});
