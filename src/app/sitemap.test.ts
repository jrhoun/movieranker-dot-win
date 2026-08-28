import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { SITE_URL } from "@/lib/site";

describe("sitemap", () => {
  const urls = () => sitemap().map((e) => e.url);

  it("includes every static public route", () => {
    const expected = [
      `${SITE_URL}`,
      `${SITE_URL}/about`,
      `${SITE_URL}/compare`,
      `${SITE_URL}/updates`,
      `${SITE_URL}/privacy`,
      `${SITE_URL}/terms`,
    ];
    expect(urls().sort()).toEqual(expected.sort());
  });

  it("excludes private, session-scoped and dynamic routes", () => {
    const joined = urls().join(" ");
    for (const bad of ["/admin", "/settings", "/u/profile", "/r/play", "/login", "/api/", "/auth/"]) {
      expect(joined).not.toContain(bad);
    }
  });

  it("never emits the bare apex host", () => {
    for (const u of urls()) {
      expect(u).not.toMatch(/^https:\/\/movieranker\.win/);
    }
  });

  it("gives every entry a lastModified date and a priority in range", () => {
    for (const e of sitemap()) {
      expect(e.lastModified).toBeInstanceOf(Date);
      expect(typeof e.priority).toBe("number");
      expect(e.priority as number).toBeGreaterThan(0);
      expect(e.priority as number).toBeLessThanOrEqual(1);
    }
  });

  it("ranks the homepage highest", () => {
    const entries = sitemap();
    const home = entries.find((e) => e.url === SITE_URL);
    const others = entries.filter((e) => e.url !== SITE_URL);
    for (const o of others) {
      expect(home!.priority as number).toBeGreaterThanOrEqual(o.priority as number);
    }
  });
});
