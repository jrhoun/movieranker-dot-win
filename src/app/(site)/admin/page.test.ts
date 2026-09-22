import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminPage, { FeedbackSection } from "./page";

vi.mock("@/components/MarqueeHeading", () => ({
  default: ({ children }: { children: React.ReactNode }) => h("h1", null, children),
}));

vi.mock("@/components/admin/ModerationQueue", () => ({
  default: () => h("div", { "data-testid": "moderation-queue" }, "Moderation Queue"),
}));

describe("AdminPage", () => {
  it("renders the navigation tabs: Overview, Feedback, Moderation, Proposals", () => {
    const html = renderToStaticMarkup(h(AdminPage));
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Overview");
    expect(html).toContain("Feedback");
    expect(html).toContain("Moderation");
    expect(html).toContain("Proposals");
  });

  it("defaults to the Overview tab and shows Stats", () => {
    const html = renderToStaticMarkup(h(AdminPage));
    expect(html).toContain("The site right now");
  });
});

describe("FeedbackSection", () => {
  it("renders empty message when feedback list is empty", () => {
    const html = renderToStaticMarkup(
      h(FeedbackSection, {
        data: { available: true, feedback: [] },
        onDelete: vi.fn(),
      }),
    );
    expect(html).toContain("No feedback submitted yet.");
  });

  it("renders feedback cards with category, message, delete button, and filters", () => {
    const html = renderToStaticMarkup(
      h(FeedbackSection, {
        data: {
          available: true,
          feedback: [
            {
              id: "fb-1",
              created_at: "2026-09-09T20:00:00Z",
              category: "bug",
              message: "Poster clipped on mobile",
              email: "test@example.com",
              user_id: "user-12345678",
              page_url: "/r/play",
              user_agent: "Mozilla/5.0",
            },
          ],
        },
        onDelete: vi.fn(),
      }),
    );
    expect(html).toContain("🐛 Bug");
    expect(html).toContain("Poster clipped on mobile");
    expect(html).toContain("test@example.com");
    expect(html).toContain("Delete");
    expect(html).toContain("Search feedback…");
    expect(html).toContain("🐛 Bugs");
    expect(html).toContain("💡 Ideas");
    expect(html).toContain("💬 Other");
  });
});


