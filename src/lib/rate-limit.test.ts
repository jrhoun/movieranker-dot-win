import { describe, expect, it } from "vitest";
import { LIMITS, rateLimit, tooManyRequests } from "./rate-limit";

describe("rateLimit", () => {
  const cfg = { limit: 3, windowMs: 60_000 };

  it("defines feedback rate limit configuration", () => {
    expect(LIMITS.feedback).toEqual({ limit: 5, windowMs: 600_000 });
  });

  it("supports tooManyRequests with default and custom message", async () => {
    const def = tooManyRequests(30);
    expect(def.status).toBe(429);
    expect(def.headers.get("Retry-After")).toBe("30");
    const defBody = await def.json();
    expect(defBody).toEqual({ error: "too many requests" });

    const custom = tooManyRequests(60, "Too many feedback submissions. Please try again later.");
    expect(custom.status).toBe(429);
    expect(custom.headers.get("Retry-After")).toBe("60");
    const customBody = await custom.json();
    expect(customBody).toEqual({ error: "Too many feedback submissions. Please try again later." });
  });

  it("allows up to limit, then blocks", () => {
    expect(rateLimit("a", { ...cfg, now: 1000 }).ok).toBe(true);
    expect(rateLimit("a", { ...cfg, now: 2000 }).ok).toBe(true);
    expect(rateLimit("a", { ...cfg, now: 3000 }).ok).toBe(true);

    const blocked = rateLimit("a", { ...cfg, now: 4000 });
    expect(blocked.ok).toBe(false);
    // oldest hit at t=1000 expires at 61000 → ~57s remaining
    expect(blocked.retryAfterSeconds).toBe(57);
  });

  it("window edge: hit exactly at boundary is expired (t + windowMs <= now)", () => {
    rateLimit("edge", { limit: 1, windowMs: 10_000, now: 5_000 });
    // now - windowMs = 5000; hit at 5000 fails `> now - windowMs` → expired
    expect(
      rateLimit("edge", { limit: 1, windowMs: 10_000, now: 15_000 }).ok,
    ).toBe(true);
    // one ms earlier the old hit still counts
    rateLimit("edge2", { limit: 1, windowMs: 10_000, now: 5_000 });
    expect(
      rateLimit("edge2", { limit: 1, windowMs: 10_000, now: 14_999 }).ok,
    ).toBe(false);
  });

  it("keys are isolated", () => {
    expect(rateLimit("k1", { limit: 1, windowMs: 1000, now: 100 }).ok).toBe(true);
    expect(rateLimit("k2", { limit: 1, windowMs: 1000, now: 100 }).ok).toBe(true);
  });

  it("retryAfterSeconds never below 1 even at exact expiry", () => {
    rateLimit("r", { limit: 1, windowMs: 1000, now: 0 });
    const r = rateLimit("r", { limit: 1, windowMs: 1000, now: 999 });
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
