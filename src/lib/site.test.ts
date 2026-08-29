import { describe, expect, it } from "vitest";
import { SITE_URL, canonicalOrigin } from "./site";

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

describe("canonicalOrigin", () => {
  it("rewrites the bare apex to the www host", () => {
    // The real defect this exists to stop: NEXT_PUBLIC_SITE_URL was set to the
    // apex in production, so canonicals, the sitemap and every og:image pointed
    // at a URL that 308-redirects. The old test could never catch it, because it
    // only ever ran with the variable unset.
    expect(canonicalOrigin("https://movieranker.win")).toBe("https://www.movieranker.win");
    expect(canonicalOrigin("https://movieranker.win/")).toBe("https://www.movieranker.win");
  });

  it("leaves the www host alone", () => {
    expect(canonicalOrigin("https://www.movieranker.win")).toBe("https://www.movieranker.win");
  });

  it("leaves a preview host untouched", () => {
    // Preview deploys must resolve to themselves, not to production.
    expect(canonicalOrigin("https://movieranker-dot-abc123-jr-houn.vercel.app")).toBe(
      "https://movieranker-dot-abc123-jr-houn.vercel.app",
    );
  });

  it("does not rewrite a different host that merely starts the same way", () => {
    expect(canonicalOrigin("https://movieranker.win.example.com")).toBe(
      "https://movieranker.win.example.com",
    );
  });

  it("falls back to the canonical origin when unset or blank", () => {
    expect(canonicalOrigin(undefined)).toBe("https://www.movieranker.win");
    expect(canonicalOrigin("   ")).toBe("https://www.movieranker.win");
  });
});
