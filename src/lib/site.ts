export const CONTACT_EMAIL = "admin@movieranker.win";

const CANONICAL_ORIGIN = "https://www.movieranker.win";

/**
 * Resolves the canonical site origin, with no trailing slash.
 *
 * The apex (movieranker.win) 308-redirects to the www host, so www is the only
 * origin we should ever emit: the apex costs a redirect hop and splits
 * canonical signals across two hosts.
 *
 * This used to be a comment and a default value, which was not enough. In
 * production NEXT_PUBLIC_SITE_URL was set to the apex, so every canonical tag,
 * every sitemap entry and every og:image URL pointed at a URL that immediately
 * redirects — Google reports those as "page with redirect" and will not index
 * them as given, and some crawlers do not follow redirects for og:image at all.
 * The rule is now enforced in code rather than trusted to configuration.
 *
 * Only the bare apex is rewritten. Preview deploys set this to a vercel.app
 * host and must be left exactly as they are.
 */
export function canonicalOrigin(raw: string | undefined): string {
  const trimmed = (raw || CANONICAL_ORIGIN).trim().replace(/\/+$/, "");
  if (!trimmed) return CANONICAL_ORIGIN;
  // The lookahead matters: \b would also match inside movieranker.win.example.com
  // and rewrite an unrelated host. The apex must end where the host ends.
  return trimmed.replace(
    /^(https?:\/\/)movieranker\.win(?=$|[/:?#])/i,
    "$1www.movieranker.win",
  );
}

/** Canonical site origin, no trailing slash. Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL: string = canonicalOrigin(process.env.NEXT_PUBLIC_SITE_URL);
