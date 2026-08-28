import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Static public routes only. User lists (/l/[id]) and profiles (/u/[handle])
 * are deliberately absent: lists default to visibility 'unlisted' and profiles
 * to 'private', so enumerating them here would publish links their owners never
 * chose to publish. Adding dynamic entries is a separate product decision.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/updates`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
