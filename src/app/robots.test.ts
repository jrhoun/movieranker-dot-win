import { describe, expect, it } from "vitest";
import robots from "./robots";
import { SITE_URL } from "@/lib/site";

describe("robots", () => {
  it("allows crawling the site root", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules?.userAgent).toBe("*");
    expect(rules?.allow).toBe("/");
  });

  it("disallows private and non-content routes", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    const disallow = rules?.disallow;
    const list = Array.isArray(disallow) ? disallow : [disallow];
    for (const path of ["/api/", "/auth/", "/admin", "/settings", "/u/profile", "/r/play"]) {
      expect(list).toContain(path);
    }
  });

  it("points at the absolute sitemap URL", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
