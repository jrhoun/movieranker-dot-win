import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

let mockUser: { id: string } | null = null;
let insertedRows: { table: string; row: Record<string, unknown> }[] = [];
let insertError: Error | { message: string; code?: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn(async (row: Record<string, unknown>) => {
        if (insertError) {
          return { data: null, error: insertError };
        }
        insertedRows.push({ table, row });
        return { data: null, error: null };
      }),
    })),
  })),
  supabaseSecretKey: vi.fn(() => "mock-secret-key"),
}));

describe("POST /api/feedback", () => {
  beforeEach(() => {
    mockUser = null;
    insertedRows = [];
    insertError = null;
    vi.clearAllMocks();
  });

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

  it("captures user_id when signed in, page_url from request body, and user-agent header", async () => {
    mockUser = { id: "user-456" };
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "Poster clipped on mobile",
          pageUrl: "/r/play",
        }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "10.0.0.10",
          "user-agent": "Mozilla/5.0 TestAgent",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].table).toBe("feedback");
    expect(insertedRows[0].row).toMatchObject({
      category: "bug",
      message: "Poster clipped on mobile",
      user_id: "user-456",
      page_url: "/r/play",
      user_agent: "Mozilla/5.0 TestAgent",
    });
  });

  it("captures page_url when passed in snake_case format", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "idea",
          message: "A great idea",
          page_url: "/l/custom-123",
        }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "10.0.0.11",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].row).toMatchObject({
      category: "idea",
      message: "A great idea",
      page_url: "/l/custom-123",
    });
  });

  it("returns 500 and logs when Supabase insert fails", async () => {
    insertError = { message: "relation public.feedback does not exist", code: "42P01" };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "Database failure test",
        }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "10.0.0.12",
        },
      }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
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

  it("silently drops submissions with honeypot field populated without inserting into database", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "Spam bot message",
          hp_website: "https://spam-link.example.com",
        }),
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.99" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(insertedRows).toHaveLength(0);
  });
});

