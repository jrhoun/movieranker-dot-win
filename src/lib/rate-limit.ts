// ponytail: in-memory limiter resets per serverless instance; upgrade to
// shared store (Upstash) when multi-instance abuse appears.

/** Rate-limit constants — tune here, documented in docs/qa-checklist.md. */
export const LIMITS = {
  lists: { limit: 20, windowMs: 60_000 }, // POST/PATCH/DELETE /api/lists
  proposals: { limit: 5, windowMs: 60_000 }, // POST /api/proposals
  accountDelete: { limit: 3, windowMs: 3_600_000 }, // POST /api/account/delete
} as const;

const buckets = new Map<string, number[]>();

/**
 * Sliding-window limiter. Pure w.r.t. the injected clock; `now` defaults to
 * Date.now(). Returns ok:false with a Retry-After hint once `limit` hits
 * fall inside `windowMs`.
 */
export function rateLimit(
  key: string,
  {
    limit,
    windowMs,
    now = Date.now(),
  }: { limit: number; windowMs: number; now?: number },
): { ok: boolean; retryAfterSeconds: number } {
  const hits = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit)
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)),
    };
  hits.push(now);
  buckets.set(key, hits);

  // keep memory bounded: drop stale buckets when map grows large
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => t > now - windowMs)) buckets.delete(k);
    }
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Limiter key: userId when signed in, else client IP from the proxy header. */
export async function rateKey(
  scope: string,
  request: Request,
  userId?: string | null,
): Promise<string> {
  if (userId) return `${scope}:${userId}`;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${scope}:ip:${ip}`;
}

/** Shared 429 response with Retry-After header. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json({ error: "too many requests" }, {
    status: 429,
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
}
