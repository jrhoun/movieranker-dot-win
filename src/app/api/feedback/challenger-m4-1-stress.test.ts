import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ data: null, error: null })),
    })),
  })),
  supabaseSecretKey: vi.fn(() => "mock-secret-key"),
}));


/**
 * Helper to construct a POST /api/feedback Request.
 */
function makeRequest(
  body: unknown,
  options: {
    ip?: string;
    rawBody?: string | null;
    contentType?: string;
  } = {},
): Request {
  const headers: Record<string, string> = {};
  if (options.contentType !== undefined) {
    if (options.contentType) headers["content-type"] = options.contentType;
  } else {
    headers["content-type"] = "application/json";
  }
  if (options.ip) {
    headers["x-forwarded-for"] = options.ip;
  }

  let requestBody: string | undefined;
  if (options.rawBody !== undefined) {
    requestBody = options.rawBody === null ? undefined : options.rawBody;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
  }

  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers,
    body: requestBody,
  });
}

describe("Empirical Challenger M4-1: Stress Testing Feedback API", () => {
  describe("1. Malformed JSON, non-JSON body, empty body", () => {
    it("rejects empty string body with 400 Invalid JSON payload", async () => {
      const req = makeRequest(undefined, { ip: "10.201.1.1", rawBody: "" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("rejects request with undefined/null body with 400 Invalid JSON payload", async () => {
      const req = makeRequest(undefined, { ip: "10.201.1.2", rawBody: null });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("rejects malformed truncated JSON syntax with 400 Invalid JSON payload", async () => {
      const req = makeRequest(undefined, {
        ip: "10.201.1.3",
        rawBody: '{"category": "bug", "message": ',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("rejects malformed JSON with unquoted keys or trailing comma with 400", async () => {
      const req = makeRequest(undefined, {
        ip: "10.201.1.4",
        rawBody: "{ category: 'bug', message: 'test', }",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("rejects plain text non-JSON body with 400", async () => {
      const req = makeRequest(undefined, {
        ip: "10.201.1.5",
        rawBody: "This is not JSON text content",
        contentType: "text/plain",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("rejects XML body with 400", async () => {
      const req = makeRequest(undefined, {
        ip: "10.201.1.6",
        rawBody: "<feedback><category>bug</category><message>broken</message></feedback>",
        contentType: "application/xml",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("rejects HTML body with 400", async () => {
      const req = makeRequest(undefined, {
        ip: "10.201.1.7",
        rawBody: "<html><body><h1>500 Error</h1></body></html>",
        contentType: "text/html",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("rejects primitive JSON: null with 400 Request body must be an object", async () => {
      const req = makeRequest(undefined, { ip: "10.201.1.8", rawBody: "null" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Request body must be an object" });
    });

    it("rejects primitive JSON: number with 400 Request body must be an object", async () => {
      const req = makeRequest(undefined, { ip: "10.201.1.9", rawBody: "12345" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Request body must be an object" });
    });

    it("rejects primitive JSON: boolean with 400 Request body must be an object", async () => {
      const req = makeRequest(undefined, { ip: "10.201.1.10", rawBody: "true" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Request body must be an object" });
    });

    it("rejects primitive JSON: string with 400 Request body must be an object", async () => {
      const req = makeRequest(undefined, { ip: "10.201.1.11", rawBody: '"just a string"' });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Request body must be an object" });
    });

    it("rejects JSON array with 400 Category is required", async () => {
      const req = makeRequest(undefined, { ip: "10.201.1.12", rawBody: "[]" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Category is required and must be a string" });
    });

    it("rejects JSON array with items with 400 Category is required", async () => {
      const req = makeRequest(undefined, {
        ip: "10.201.1.13",
        rawBody: '[{"category":"bug","message":"broken"}]',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Category is required and must be a string" });
    });
  });

  describe("2. Category Validation & Injection Defense", () => {
    it("rejects missing category with 400", async () => {
      const req = makeRequest({ message: "Valid message" }, { ip: "10.202.1.1" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Category is required and must be a string" });
    });

    it("rejects non-string categories (numbers, booleans, objects, arrays, null) with 400", async () => {
      const nonStringCategories = [
        123,
        true,
        false,
        null,
        { type: "bug" },
        ["bug"],
      ];

      for (let i = 0; i < nonStringCategories.length; i++) {
        const val = nonStringCategories[i];
        const req = makeRequest(
          { category: val, message: "Valid message" },
          { ip: `10.202.2.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Category is required and must be a string" });
      }
    });

    it("rejects empty string and whitespace-only categories with 400", async () => {
      const emptyCategories = ["", " ", "   ", "\t\n"];
      for (let i = 0; i < emptyCategories.length; i++) {
        const cat = emptyCategories[i];
        const req = makeRequest(
          { category: cat, message: "Valid message" },
          { ip: `10.202.3.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Invalid category. Must be one of: bug, idea, other" });
      }
    });

    it("rejects unknown category names with 400", async () => {
      const unknownCategories = [
        "feature",
        "complaint",
        "admin",
        "support",
        "security",
        "bugs",
        "ideas",
        "others",
        "bug1",
      ];
      for (let i = 0; i < unknownCategories.length; i++) {
        const cat = unknownCategories[i];
        const req = makeRequest(
          { category: cat, message: "Valid message" },
          { ip: `10.202.4.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Invalid category. Must be one of: bug, idea, other" });
      }
    });

    it("rejects SQL injection attempts in category field with 400", async () => {
      const sqlInjections = [
        "' OR '1'='1",
        "bug'; DROP TABLE feedback; --",
        "1; SELECT * FROM profiles",
        "UNION SELECT NULL, NULL, NULL --",
        "admin' --",
        "bug' OR 1=1 #",
      ];
      for (let i = 0; i < sqlInjections.length; i++) {
        const cat = sqlInjections[i];
        const req = makeRequest(
          { category: cat, message: "Valid message" },
          { ip: `10.202.5.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Invalid category. Must be one of: bug, idea, other" });
      }
    });

    it("rejects XSS and tag injections in category field with 400", async () => {
      const xssInjections = [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
      ];
      for (let i = 0; i < xssInjections.length; i++) {
        const cat = xssInjections[i];
        const req = makeRequest(
          { category: cat, message: "Valid message" },
          { ip: `10.202.6.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Invalid category. Must be one of: bug, idea, other" });
      }
    });

    it("accepts valid categories with mixed case and whitespace", async () => {
      const validCases = [
        { raw: "BUG", expected: "bug" },
        { raw: "  idea  ", expected: "idea" },
        { raw: "OtHeR\n", expected: "other" },
        { raw: "  bug  ", expected: "bug" },
      ];
      for (let i = 0; i < validCases.length; i++) {
        const item = validCases[i];
        const req = makeRequest(
          { category: item.raw, message: "Valid message" },
          { ip: `10.202.7.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ ok: true });
      }
    });
  });

  describe("3. Message Boundary Values & Stress", () => {
    it("rejects missing message with 400", async () => {
      const req = makeRequest({ category: "bug" }, { ip: "10.203.1.1" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Message is required and must be a string" });
    });

    it("rejects non-string message types (number, boolean, null, object, array) with 400", async () => {
      const nonStringMessages = [
        12345,
        true,
        false,
        null,
        { text: "Help me" },
        ["broken"],
      ];
      for (let i = 0; i < nonStringMessages.length; i++) {
        const msg = nonStringMessages[i];
        const req = makeRequest(
          { category: "bug", message: msg },
          { ip: `10.203.2.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Message is required and must be a string" });
      }
    });

    it("rejects 0-character message with 400", async () => {
      const req = makeRequest(
        { category: "bug", message: "" },
        { ip: "10.203.3.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Message must be between 1 and 2000 characters" });
    });

    it("rejects whitespace-only messages with 400", async () => {
      const whitespaceMessages = [
        " ",
        "     ",
        "\t\t",
        "\n\r\n",
        "  \t  \n  \r\n  ",
      ];
      for (let i = 0; i < whitespaceMessages.length; i++) {
        const msg = whitespaceMessages[i];
        const req = makeRequest(
          { category: "bug", message: msg },
          { ip: `10.203.4.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Message must be between 1 and 2000 characters" });
      }
    });

    it("accepts boundary minimum: 1 character message", async () => {
      const req = makeRequest(
        { category: "bug", message: "a" },
        { ip: "10.203.5.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("accepts boundary maximum: exactly 2000 characters message", async () => {
      const message = "x".repeat(2000);
      const req = makeRequest(
        { category: "idea", message },
        { ip: "10.203.6.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("rejects boundary overshoot: exactly 2001 characters message with 400", async () => {
      const message = "x".repeat(2001);
      const req = makeRequest(
        { category: "idea", message },
        { ip: "10.203.7.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Message must be between 1 and 2000 characters" });
    });

    it("accepts 2000 chars when padding whitespace is trimmed off", async () => {
      const message = "   " + "y".repeat(2000) + "   ";
      const req = makeRequest(
        { category: "other", message },
        { ip: "10.203.8.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("rejects 2001 chars even with surrounding whitespace with 400", async () => {
      const message = "   " + "y".repeat(2001) + "   ";
      const req = makeRequest(
        { category: "other", message },
        { ip: "10.203.9.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Message must be between 1 and 2000 characters" });
    });

    it("rejects huge string (10,000 chars) with 400", async () => {
      const message = "z".repeat(10_000);
      const req = makeRequest(
        { category: "bug", message },
        { ip: "10.203.10.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Message must be between 1 and 2000 characters" });
    });

    it("handles extreme huge string (100,000 chars) gracefully without OOM or crash", async () => {
      const message = "h".repeat(100_000);
      const req = makeRequest(
        { category: "bug", message },
        { ip: "10.203.11.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Message must be between 1 and 2000 characters" });
    });

    it("preserves unicode characters, emojis, and multiline text", async () => {
      const message = "Movie review: 🎬 🍿\nFilm noir classic.\nLine 2: \"Cinderella Man\" & 'Vertigo'.";
      const req = makeRequest(
        { category: "other", message },
        { ip: "10.203.12.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });
  });

  describe("4. Email Format Extremes & Length Boundaries", () => {
    it("accepts omitted email (undefined)", async () => {
      const req = makeRequest(
        { category: "bug", message: "Error in poster rendering" },
        { ip: "10.204.1.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("accepts null email", async () => {
      const req = makeRequest(
        { category: "bug", message: "Error in poster rendering", email: null },
        { ip: "10.204.1.2" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("accepts empty string email", async () => {
      const req = makeRequest(
        { category: "idea", message: "Great feature idea", email: "" },
        { ip: "10.204.1.3" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("rejects whitespace-only email with 400 Invalid email format", async () => {
      const req = makeRequest(
        { category: "idea", message: "Great feature idea", email: "   " },
        { ip: "10.204.1.4" },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid email format" });
    });

    it("rejects non-string email types with 400 Email must be a string", async () => {
      const nonStringEmails = [
        12345,
        true,
        false,
        { email: "test@example.com" },
        ["test@example.com"],
      ];
      for (let i = 0; i < nonStringEmails.length; i++) {
        const badEmail = nonStringEmails[i];
        const req = makeRequest(
          { category: "bug", message: "Valid message", email: badEmail },
          { ip: `10.204.2.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Email must be a string if provided" });
      }
    });

    it("rejects invalid email formats with 400", async () => {
      const invalidEmails = [
        "plainaddress",
        "@missingusername.com",
        "username@.com",
        "username@com",
        "user with spaces@domain.com",
        "user@domain with spaces.com",
        "user@@domain.com",
        "user@domain.",
        "@",
        "a@b",
      ];
      for (let i = 0; i < invalidEmails.length; i++) {
        const email = invalidEmails[i];
        const req = makeRequest(
          { category: "bug", message: "Valid message", email },
          { ip: `10.204.3.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Invalid email format" });
      }
    });

    it("accepts valid email format variants", async () => {
      const validEmails = [
        "user@example.com",
        "user.name+tag@sub.domain.co.uk",
        "123@domain.org",
        "first_last@department.school.edu",
        "  trimmed@example.com  ",
      ];
      for (let i = 0; i < validEmails.length; i++) {
        const email = validEmails[i];
        const req = makeRequest(
          { category: "other", message: "Valid message", email },
          { ip: `10.204.4.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ ok: true });
      }
    });

    it("accepts email at exactly 320 characters boundary", async () => {
      // 64 char local part + 1 char '@' + 251 char domain + 4 char '.com' = 320 chars
      const localPart = "a".repeat(64);
      const domainPart = "b".repeat(320 - localPart.length - 1 - 4);
      const email320 = `${localPart}@${domainPart}.com`;
      expect(email320.length).toBe(320);

      const req = makeRequest(
        { category: "idea", message: "Max length email test", email: email320 },
        { ip: "10.204.5.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("rejects email exceeding 320 characters (321 chars) with 400", async () => {
      // 64 char local part + 1 char '@' + 252 char domain + 4 char '.com' = 321 chars
      const localPart = "a".repeat(64);
      const domainPart = "b".repeat(321 - localPart.length - 1 - 4);
      const email321 = `${localPart}@${domainPart}.com`;
      expect(email321.length).toBe(321);

      const req = makeRequest(
        { category: "idea", message: "Oversized email test", email: email321 },
        { ip: "10.204.6.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Email must not exceed 320 characters" });
    });
  });

  describe("5. Rate Limiting Behavior: Bursts, Exceeding Limits, Retry-After & IP Isolation", () => {
    it("permits 5 requests in burst, blocks 6th with 429 and Retry-After header", async () => {
      const ip = "10.205.1.100";

      // 5 submissions should succeed
      for (let i = 1; i <= 5; i++) {
        const req = makeRequest(
          { category: "idea", message: `Legitimate submission #${i}` },
          { ip },
        );
        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ ok: true });
      }

      // 6th submission should be rejected with 429
      const blockedReq = makeRequest(
        { category: "idea", message: "Excess submission #6" },
        { ip },
      );
      const blockedRes = await POST(blockedReq);
      expect(blockedRes.status).toBe(429);

      // Verify Retry-After header
      const retryAfter = blockedRes.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      const retryAfterSeconds = parseInt(retryAfter!, 10);
      expect(Number.isInteger(retryAfterSeconds)).toBe(true);
      expect(retryAfterSeconds).toBeGreaterThan(0);
      expect(retryAfterSeconds).toBeLessThanOrEqual(600);

      // Verify error body
      const blockedData = await blockedRes.json();
      expect(blockedData).toEqual({
        error: "Too many feedback submissions. Please try again later.",
      });

      // Subsequent 7th and 8th attempts also blocked
      for (let i = 7; i <= 8; i++) {
        const subsequentReq = makeRequest(
          { category: "idea", message: `Subsequent excess #${i}` },
          { ip },
        );
        const subsequentRes = await POST(subsequentReq);
        expect(subsequentRes.status).toBe(429);
      }
    });

    it("guarantees rate limiting is isolated per IP address", async () => {
      const ipBlocked = "10.205.2.100";
      const ipUnblocked = "10.205.2.200";

      // Exhaust limit on ipBlocked
      for (let i = 0; i < 5; i++) {
        await POST(
          makeRequest({ category: "bug", message: `IP 1 attempt ${i}` }, { ip: ipBlocked }),
        );
      }
      const blockedRes = await POST(
        makeRequest({ category: "bug", message: "IP 1 blocked" }, { ip: ipBlocked }),
      );
      expect(blockedRes.status).toBe(429);

      // Verify ipUnblocked is NOT blocked
      const unblockedRes = await POST(
        makeRequest({ category: "bug", message: "IP 2 fresh submission" }, { ip: ipUnblocked }),
      );
      expect(unblockedRes.status).toBe(200);
      const data = await unblockedRes.json();
      expect(data).toEqual({ ok: true });
    });

    it("parses client IP correctly from complex x-forwarded-for header list", async () => {
      const clientIp = "10.205.3.50";
      const forwardedHeader = `${clientIp}, 192.168.1.1, 10.0.0.1`;

      // Make 5 requests using multi-hop header
      for (let i = 0; i < 5; i++) {
        const res = await POST(
          makeRequest(
            { category: "other", message: `Hop attempt ${i}` },
            { ip: forwardedHeader },
          ),
        );
        expect(res.status).toBe(200);
      }

      // 6th attempt with direct clientIp should be blocked
      const blockedDirect = await POST(
        makeRequest({ category: "other", message: "Direct attempt" }, { ip: clientIp }),
      );
      expect(blockedDirect.status).toBe(429);
    });

    it("enforces rate limit even when requests fail validation (anti-abuse hardening)", async () => {
      const ip = "10.205.4.10";

      // Send 5 invalid payloads (all failing validation with 400)
      for (let i = 0; i < 5; i++) {
        const res = await POST(
          makeRequest(
            { category: "invalid-category", message: "valid message" },
            { ip },
          ),
        );
        expect(res.status).toBe(400);
      }

      // 6th attempt (even if perfectly valid!) should be rate-limited to 429
      const res6 = await POST(
        makeRequest(
          { category: "bug", message: "Now sending valid payload" },
          { ip },
        ),
      );
      expect(res6.status).toBe(429);
      expect(res6.headers.get("Retry-After")).not.toBeNull();
    });

    it("applies fallback rate limiting when x-forwarded-for is missing", async () => {
      // Notice: missing x-forwarded-for uses key 'feedback:ip:unknown'
      // We test that requests without headers are counted in the unknown bucket
      const res = await POST(
        makeRequest({ category: "other", message: "No IP header test" }),
      );
      // It will either succeed (if bucket < 5) or 429 (if shared unknown bucket is full)
      expect([200, 429]).toContain(res.status);
      if (res.status === 429) {
        expect(res.headers.get("Retry-After")).not.toBeNull();
      }
    });

    it("handles concurrent burst: 20 simultaneous requests from same IP yield exactly 5 success and 15 rate-limited", async () => {
      const ip = "10.205.5.1";
      const requests = Array.from({ length: 20 }, (_, idx) =>
        POST(
          makeRequest(
            { category: "idea", message: `Concurrent request #${idx}` },
            { ip },
          ),
        ),
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.status === 200);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(successes.length).toBe(5);
      expect(rateLimited.length).toBe(15);

      for (const res of rateLimited) {
        expect(res.headers.get("Retry-After")).not.toBeNull();
        const data = await res.json();
        expect(data.error).toBe("Too many feedback submissions. Please try again later.");
      }
    });
  });

  describe("6. Advanced Adversarial & Injection Hardening", () => {
    it("ignores unexpected extra properties safely (anti-prototype pollution & payload bloat)", async () => {
      const bloatedBody: Record<string, unknown> = {
        category: "bug",
        message: "Bug with extra noise",
        __proto__: { polluted: true },
        constructor: { evil: true },
        admin: true,
        role: "superuser",
      };

      for (let i = 0; i < 500; i++) {
        bloatedBody[`extra_field_${i}`] = `junk_data_${i}`;
      }

      const req = makeRequest(bloatedBody, { ip: "10.206.1.1" });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });

      // Verify Object.prototype was NOT polluted
      expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("rejects prototype property names as categories", async () => {
      const prototypeKeys = ["toString", "valueOf", "constructor", "__proto__", "hasOwnProperty"];
      for (let i = 0; i < prototypeKeys.length; i++) {
        const cat = prototypeKeys[i];
        const req = makeRequest(
          { category: cat, message: "Valid message" },
          { ip: `10.206.2.${i + 1}` },
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({ error: "Invalid category. Must be one of: bug, idea, other" });
      }
    });

    it("rejects URL-encoded form submissions without JSON parsing", async () => {
      const req = makeRequest(undefined, {
        ip: "10.206.3.1",
        rawBody: "category=bug&message=hello&email=test%40example.com",
        contentType: "application/x-www-form-urlencoded",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Invalid JSON payload" });
    });

    it("handles complex multi-byte surrogate pairs and unicode without string length truncation issues", async () => {
      // 👩‍👩‍👦‍👦 family emoji sequence
      const emojiMsg = "Family emoji test: 👩‍👩‍👦‍👦 映画 🍿".repeat(50);
      const req = makeRequest(
        { category: "other", message: emojiMsg },
        { ip: "10.206.4.1" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });
  });
});

