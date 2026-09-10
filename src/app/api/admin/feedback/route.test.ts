import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

let mockUser: { id: string; email: string } | null = null;
let mockSecretKey: string | undefined = "mock-secret-key";
let queryError: { message: string } | null = null;
let mockFeedbackRows: Record<string, unknown>[] = [];
let queryParams: { table: string; cols: string; orderCol?: string; ascending?: boolean; limit?: number } | null = null;

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
      select: vi.fn((cols: string) => ({
        order: vi.fn((orderCol: string, opts?: { ascending?: boolean }) => ({
          limit: vi.fn(async (limit: number) => {
            queryParams = {
              table,
              cols,
              orderCol,
              ascending: opts?.ascending,
              limit,
            };
            if (queryError) {
              return { data: null, error: queryError };
            }
            return { data: mockFeedbackRows, error: null };
          }),
        })),
      })),
    })),
  })),
  supabaseSecretKey: vi.fn(() => mockSecretKey),
}));

describe("GET /api/admin/feedback", () => {
  const originalOwnerEmail = process.env.OWNER_EMAIL;

  beforeEach(() => {
    process.env.OWNER_EMAIL = "admin@example.com";
    mockUser = null;
    mockSecretKey = "mock-secret-key";
    queryError = null;
    mockFeedbackRows = [];
    queryParams = null;
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env.OWNER_EMAIL = originalOwnerEmail;
  });

  it("returns 404 if user is unauthenticated", async () => {
    mockUser = null;
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 404 if user is not the owner", async () => {
    mockUser = { id: "user-2", email: "stranger@example.com" };
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns available: false if SUPABASE_SECRET_KEY is missing", async () => {
    mockUser = { id: "user-1", email: "admin@example.com" };
    mockSecretKey = undefined;

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      available: false,
    });
    expect(body.reason).toContain("SUPABASE_SECRET_KEY");
  });

  it("returns last 50 feedback rows ordered by created_at desc for the owner", async () => {
    mockUser = { id: "user-1", email: "admin@example.com" };
    mockFeedbackRows = [
      {
        id: "fb-1",
        created_at: "2026-09-09T20:00:00Z",
        category: "bug",
        message: "First bug",
        email: "u1@test.com",
        user_id: "user-abc",
        page_url: "/r/play",
        user_agent: "Mozilla/5.0",
      },
      {
        id: "fb-2",
        created_at: "2026-09-09T19:00:00Z",
        category: "idea",
        message: "Feature request",
        email: null,
        user_id: null,
        page_url: null,
        user_agent: null,
      },
    ];

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.feedback).toEqual(mockFeedbackRows);
    expect(queryParams).toMatchObject({
      table: "feedback",
      orderCol: "created_at",
      ascending: false,
      limit: 50,
    });
  });

  it("returns available: false if Supabase returns an error", async () => {
    mockUser = { id: "user-1", email: "admin@example.com" };
    queryError = { message: "relation public.feedback does not exist" };

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toBe("relation public.feedback does not exist");
  });
});
