export const CONTACT_EMAIL = "admin@movieranker.win";

/**
 * Canonical site origin, no trailing slash. The apex (movieranker.win)
 * 308-redirects to the www host, so www is the only origin we ever emit —
 * emitting the apex costs a redirect hop and splits canonical signals.
 * Override per-environment with NEXT_PUBLIC_SITE_URL (e.g. preview deploys).
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.movieranker.win"
).replace(/\/+$/, "");
