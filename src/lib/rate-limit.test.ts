import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  const cfg = { limit: 3, windowMs: 60_000 };

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
