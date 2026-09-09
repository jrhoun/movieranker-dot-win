import { describe, expect, it } from "vitest";
import { SITE_UPDATES } from "./updates";

describe("SITE_UPDATES", () => {
  it("prepends the public-beta announcement at the top of updates", () => {
    expect(SITE_UPDATES.length).toBeGreaterThanOrEqual(2);
    const latest = SITE_UPDATES[0];
    expect(latest.id).toBe("public-beta");
    expect(latest.date).toBe("September 2026");
    expect(latest.version).toBe("Beta");
    expect(latest.tag).toBe("Announcement");
    expect(latest.title).toBe("Welcome to the MovieRanker Public Beta!");
    expect(latest.summary).toContain("JR Houn");
    expect(latest.content?.length).toBeGreaterThan(0);
  });

  it("contains all required public beta release highlights", () => {
    const beta = SITE_UPDATES.find((u) => u.id === "public-beta");
    expect(beta).toBeDefined();
    expect(beta?.highlights).toBeDefined();
    const highlights = beta?.highlights ?? [];

    expect(highlights.some((h) => h.includes("Beta Test Screening"))).toBe(true);
    expect(highlights.some((h) => h.includes("Curated Weekly Themes"))).toBe(true);
    expect(highlights.some((h) => h.includes("Community Stats"))).toBe(true);
    expect(highlights.some((h) => h.includes("In-App Feedback") || h.includes("Feedback"))).toBe(true);
  });

  it("preserves initial-launch entry with preview versioning", () => {
    const initial = SITE_UPDATES.find((u) => u.id === "initial-launch");
    expect(initial).toBeDefined();
    expect(initial?.tag).toBe("Milestone");
    expect(initial?.version).toBe("v0.1");
  });
});
