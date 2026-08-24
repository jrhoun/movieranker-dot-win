import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession =
  vi.fn<() => Promise<{ error: Error | null }>>().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

const { GET } = await import("./route");

async function call(params: string) {
  return GET(new NextRequest(`http://localhost:3000/auth/callback?${params}`));
}

describe("GET /auth/callback", () => {
  it("redirects to a valid relative next path after session exchange", async () => {
    const res = await call("code=c&next=%2Fl%2Fabc");
    expect(res.headers.get("location")).toBe("http://localhost:3000/l/abc");
  });

  it.each([
    ["//evil.com", "//evil.com"],
    ["https://evil.com", "https://evil.com"],
  ])("rejects open-redirect next=%s", async (next, raw) => {
    const res = await call(`code=c&next=${encodeURIComponent(raw)}`);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("defaults to / when next is missing", async () => {
    const res = await call("code=c");
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("sends auth errors back home with auth_error flag", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("bad code") });
    const res = await call("code=bad&next=%2Fr%2Fplay");
    expect(res.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");
  });
});
