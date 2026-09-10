import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import * as vercelAnalyticsServer from "@vercel/analytics/server";
import * as supabaseServer from "@/lib/supabase/server";

vi.mock("@vercel/analytics/server", () => ({
  track: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("auth callback route analytics", () => {
  const trackMock = vi.mocked(vercelAnalyticsServer.track);
  const createSupabaseMock = vi.mocked(supabaseServer.createSupabaseServerClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks signup_completed with user provider on successful session exchange", async () => {
    const exchangeMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "google" },
          created_at: new Date().toISOString(),
        },
        session: {},
      },
      error: null,
    });

    createSupabaseMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: exchangeMock,
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServer.createSupabaseServerClient>>);

    const req = new NextRequest("https://movieranker.win/auth/callback?code=valid-code&next=/r/play");
    const res = await GET(req);

    expect(exchangeMock).toHaveBeenCalledWith("valid-code");
    expect(trackMock).toHaveBeenCalledWith(
      "signup_completed",
      { provider: "google" },
      expect.objectContaining({ headers: expect.anything() }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://movieranker.win/r/play");
  });

  it("does not track signup_completed for a returning user (account older than a few minutes)", async () => {
    const exchangeMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "google" },
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        session: {},
      },
      error: null,
    });
    createSupabaseMock.mockResolvedValue({
      auth: { exchangeCodeForSession: exchangeMock },
    } as unknown as Awaited<ReturnType<typeof supabaseServer.createSupabaseServerClient>>);

    const req = new NextRequest("https://movieranker.win/auth/callback?code=abc&next=/u/profile");
    const res = await GET(req);

    expect(trackMock).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://movieranker.win/u/profile");
  });

  it("does not track signup_completed on exchange failure and redirects to auth error", async () => {
    const exchangeMock = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("invalid code"),
    });

    createSupabaseMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: exchangeMock,
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServer.createSupabaseServerClient>>);

    const req = new NextRequest("https://movieranker.win/auth/callback?code=bad-code");
    const res = await GET(req);

    expect(trackMock).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://movieranker.win/?auth_error=1");
  });

  it("does not crash or prevent redirect if track throws an error", async () => {
    const exchangeMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "google" },
          created_at: new Date().toISOString(),
        },
        session: {},
      },
      error: null,
    });

    createSupabaseMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: exchangeMock,
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServer.createSupabaseServerClient>>);

    trackMock.mockRejectedValueOnce(new Error("Network error contacting analytics"));

    const req = new NextRequest("https://movieranker.win/auth/callback?code=valid-code&next=/r/play");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://movieranker.win/r/play");
  });
});
