import { describe, expect, it } from "vitest";
import { SITE_URL } from "./site";

describe("SITE_URL", () => {
  it("is an absolute https origin", () => {
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });

  it("has no trailing slash", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("uses the www host, never the apex", () => {
    // The apex 308-redirects to www; emitting the apex costs an extra hop
    // and splits canonical signals across two hosts.
    expect(SITE_URL).toContain("www.movieranker.win");
  });

  it("is parseable as a URL with an empty path", () => {
    const u = new URL(SITE_URL);
    expect(u.pathname).toBe("/");
  });
});
