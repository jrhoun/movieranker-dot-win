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
    expect(latest.title).toBe("MovieRanker Enters Public Beta");
    expect(latest.summary).toBe(
      "We are officially in public beta! Complete the new Beta Pioneer Challenge to claim an exclusive Beta Canister.",
    );
  });

  it("contains all required public beta release highlights", () => {
    const beta = SITE_UPDATES.find((u) => u.id === "public-beta");
    expect(beta).toBeDefined();
    expect(beta?.highlights).toBeDefined();
    const highlights = beta?.highlights ?? [];

    expect(highlights.some((h) => h.includes("Pioneer"))).toBe(true);
    expect(highlights.some((h) => h.includes("Curator Roulette"))).toBe(true);
    expect(highlights.some((h) => h.includes("Community Spotlight"))).toBe(true);
    expect(highlights.some((h) => h.includes("Cinema Lighting") || h.includes("Dim Lights"))).toBe(true);
    expect(highlights.some((h) => h.includes("In-App Feedback") || h.includes("Feedback"))).toBe(true);
  });

  it("preserves initial-launch entry", () => {
    const initial = SITE_UPDATES.find((u) => u.id === "initial-launch");
    expect(initial).toBeDefined();
    expect(initial?.tag).toBe("Milestone");
  });
});
