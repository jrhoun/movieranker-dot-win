import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/feedback", () => {
  it("rejects non-JSON or invalid JSON payload with 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: "invalid-json",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1" },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("validates that category is required and must be one of 'bug', 'idea', 'other'", async () => {
    // Missing category
    const res1 = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ message: "Something is broken" }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.2" },
      }),
    );
    expect(res1.status).toBe(400);

    // Invalid category
    const res2 = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category: "complaint", message: "Something is broken" }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.2" },
      }),
    );
    expect(res2.status).toBe(400);
  });

  it("validates that message is required, non-empty after trim, and <= 2000 chars", async () => {
    // Empty message
    const res1 = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category: "bug", message: "   " }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.3" },
      }),
    );
    expect(res1.status).toBe(400);

    // Missing message
    const res2 = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category: "idea" }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.3" },
      }),
    );
    expect(res2.status).toBe(400);

    // Message exceeding 2000 characters
    const res3 = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category: "other", message: "a".repeat(2001) }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.3" },
      }),
    );
    expect(res3.status).toBe(400);
  });

  it("validates optional email format and max length", async () => {
    // Malformed email
    const res1 = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "Poster clipped",
          email: "not-an-email",
        }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.4" },
      }),
    );
    expect(res1.status).toBe(400);

    // Email exceeding 320 chars
    const res2 = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "Poster clipped",
          email: `${"a".repeat(315)}@x.com`,
        }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.4" },
      }),
    );
    expect(res2.status).toBe(400);
  });

  it("accepts valid feedback without email", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "idea",
          message: "Add dark mode to the movie cards",
        }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.5" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("accepts valid feedback with valid email", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "Poster got clipped on Safari mobile",
          email: "tester@example.com",
        }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.6" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("enforces rate limiting per IP (5 submissions per window) with 429", async () => {
    const ip = "192.168.100.42";
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        new Request("http://localhost/api/feedback", {
          method: "POST",
          body: JSON.stringify({
            category: "idea",
            message: `Feedback iteration ${i + 1}`,
          }),
          headers: { "content-type": "application/json", "x-forwarded-for": ip },
        }),
      );
      expect(res.status).toBe(200);
    }

    // 6th attempt should be blocked with 429
    const blockedRes = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "idea",
          message: "Feedback iteration 6",
        }),
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
      }),
    );
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get("Retry-After")).toBeDefined();
    const blockedBody = await blockedRes.json();
    expect(blockedBody.error).toBe("Too many feedback submissions. Please try again later.");
  });
});
