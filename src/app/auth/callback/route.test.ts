import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import * as vercelAnalyticsServer from "@vercel/analytics/server";
import * as supabaseServer from "@/lib/supabase/server";
import * as referrals from "@/lib/referrals";

vi.mock("@vercel/analytics/server", () => ({
  track: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const updateUserByIdMock = vi.fn().mockResolvedValue({ data: {}, error: null });
vi.mock("@/lib/supabase/admin", () => ({
  supabaseSecretKey: () => process.env.SUPABASE_SECRET_KEY || undefined,
  supabaseAdmin: () => ({ auth: { admin: { updateUserById: updateUserByIdMock } } }),
}));

vi.mock("@/lib/referrals", () => ({
  resolveReferrerId: vi.fn(),
}));

type ServerClient = Awaited<ReturnType<typeof supabaseServer.createSupabaseServerClient>>;

function freshUser(extra: Record<string, unknown> = {}) {
  return {
    id: "new-user-id",
    app_metadata: { provider: "google" },
    created_at: new Date().toISOString(),
    user_metadata: {},
    ...extra,
  };
}

describe("auth callback route analytics", () => {
  const trackMock = vi.mocked(vercelAnalyticsServer.track);
  const createSupabaseMock = vi.mocked(supabaseServer.createSupabaseServerClient);
  const resolveReferrerMock = vi.mocked(referrals.resolveReferrerId);

  function exchangeReturning(user: unknown, error: Error | null = null) {
    const exchangeMock = vi.fn().mockResolvedValue({
      data: { user, session: user ? {} : null },
      error,
    });
    createSupabaseMock.mockResolvedValue({
      auth: { exchangeCodeForSession: exchangeMock },
    } as unknown as ServerClient);
    return exchangeMock;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    resolveReferrerMock.mockResolvedValue(null);
  });

  it("tracks signup_completed with user provider on successful session exchange", async () => {
    const exchangeMock = exchangeReturning(freshUser());

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
    exchangeReturning(
      freshUser({ created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }),
    );

    const req = new NextRequest("https://movieranker.win/auth/callback?code=abc&next=/u/profile");
    const res = await GET(req);

    expect(trackMock).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://movieranker.win/u/profile");
  });

  it("does not track signup_completed on exchange failure and redirects to auth error", async () => {
    exchangeReturning(null, new Error("invalid code"));

    const req = new NextRequest("https://movieranker.win/auth/callback?code=bad-code");
    const res = await GET(req);

    expect(trackMock).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://movieranker.win/?auth_error=1");
  });

  it("does not crash or prevent redirect if track throws an error", async () => {
    exchangeReturning(freshUser());
    trackMock.mockRejectedValueOnce(new Error("Network error contacting analytics"));

    const req = new NextRequest("https://movieranker.win/auth/callback?code=valid-code&next=/r/play");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://movieranker.win/r/play");
  });
});

describe("auth callback post-sign-up landing", () => {
  const createSupabaseMock = vi.mocked(supabaseServer.createSupabaseServerClient);
  const resolveReferrerMock = vi.mocked(referrals.resolveReferrerId);

  function exchangeReturning(user: unknown) {
    createSupabaseMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user, session: {} }, error: null }),
      },
    } as unknown as ServerClient);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    resolveReferrerMock.mockResolvedValue(null);
  });

  it("sends a brand-new account with no next to the welcome profile page", async () => {
    exchangeReturning(freshUser());
    const res = await GET(new NextRequest("https://movieranker.win/auth/callback?code=c"));
    expect(res.headers.get("location")).toBe("https://movieranker.win/u/profile?welcome=1");
  });

  it("treats an explicit next=/ the same as no next for a new account", async () => {
    exchangeReturning(freshUser());
    const res = await GET(new NextRequest("https://movieranker.win/auth/callback?code=c&next=/"));
    expect(res.headers.get("location")).toBe("https://movieranker.win/u/profile?welcome=1");
  });

  it("keeps a mid-game next=/r/play for a new account", async () => {
    exchangeReturning(freshUser());
    const res = await GET(
      new NextRequest("https://movieranker.win/auth/callback?code=c&next=/r/play"),
    );
    expect(res.headers.get("location")).toBe("https://movieranker.win/r/play");
  });

  it("sends a returning user home as before", async () => {
    exchangeReturning(
      freshUser({ created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }),
    );
    const res = await GET(new NextRequest("https://movieranker.win/auth/callback?code=c"));
    expect(res.headers.get("location")).toBe("https://movieranker.win/");
  });
});

describe("auth callback referral credit", () => {
  const createSupabaseMock = vi.mocked(supabaseServer.createSupabaseServerClient);
  const resolveReferrerMock = vi.mocked(referrals.resolveReferrerId);

  function exchangeReturning(user: unknown) {
    createSupabaseMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user, session: {} }, error: null }),
      },
    } as unknown as ServerClient);
  }

  function requestWithCookie(cookie: string | null, next = "/r/play") {
    return new NextRequest(`https://movieranker.win/auth/callback?code=c&next=${next}`, {
      headers: cookie ? { cookie } : {},
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
  });

  it("stashes the resolved referrer in user metadata for a new account", async () => {
    exchangeReturning(freshUser({ user_metadata: { full_name: "JR" } }));
    resolveReferrerMock.mockResolvedValue("referrer-id");

    await GET(requestWithCookie("theme=dark; mr_ref=%40moviebuff; other=1"));

    expect(resolveReferrerMock).toHaveBeenCalledWith(expect.anything(), "@moviebuff");
    expect(updateUserByIdMock).toHaveBeenCalledWith("new-user-id", {
      user_metadata: { full_name: "JR", referred_by: "referrer-id" },
    });
  });

  it("does nothing without an mr_ref cookie", async () => {
    exchangeReturning(freshUser());
    await GET(requestWithCookie("theme=dark"));
    expect(resolveReferrerMock).not.toHaveBeenCalled();
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("does not credit a user as their own referrer", async () => {
    exchangeReturning(freshUser());
    resolveReferrerMock.mockResolvedValue("new-user-id");
    await GET(requestWithCookie("mr_ref=new-user-id"));
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("does not credit an unresolvable code", async () => {
    exchangeReturning(freshUser());
    resolveReferrerMock.mockResolvedValue(null);
    await GET(requestWithCookie("mr_ref=nobody"));
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("skips returning users entirely", async () => {
    exchangeReturning(
      freshUser({ created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }),
    );
    resolveReferrerMock.mockResolvedValue("referrer-id");
    await GET(requestWithCookie("mr_ref=moviebuff"));
    expect(resolveReferrerMock).not.toHaveBeenCalled();
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("never blocks the redirect when the referral write fails", async () => {
    exchangeReturning(freshUser());
    resolveReferrerMock.mockResolvedValue("referrer-id");
    updateUserByIdMock.mockRejectedValueOnce(new Error("admin api down"));

    const res = await GET(requestWithCookie("mr_ref=moviebuff", "/"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://movieranker.win/u/profile?welcome=1");
  });

  it("never blocks the redirect when resolving the referrer throws", async () => {
    exchangeReturning(freshUser());
    resolveReferrerMock.mockRejectedValueOnce(new Error("db down"));

    const res = await GET(requestWithCookie("mr_ref=moviebuff"));

    expect(res.headers.get("location")).toBe("https://movieranker.win/r/play");
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });
});
