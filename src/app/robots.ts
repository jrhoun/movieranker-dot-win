import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt. Disallowed paths are owner-only, session-scoped, or non-content:
 * crawling them burns budget and can index auth-gated shells as thin pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/admin", "/settings", "/u/profile", "/r/play"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
