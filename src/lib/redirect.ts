/**
 * Only relative paths are safe post-auth redirect targets.
 * Rejects "//evil.com", absolute URLs, and anything missing.
 */
export function safeNext(next: string | null | undefined): string {
  return next !== null && next !== undefined && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/";
}
