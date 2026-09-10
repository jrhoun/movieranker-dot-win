import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("./home-client", () => ({
  default: vi.fn((props: unknown) => props),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
    from: vi.fn(),
  })),
}));

vi.mock("@/lib/shortlist", () => ({
  getTonightsShortlist: vi.fn(async () => ({
    theme: { title: "Noir Classics", slug: "noir", proposedBy: "cinephile" },
    movieIds: [100, 200],
    activity: { count: 42, previews: [] },
  })),
}));

vi.mock("@/lib/tmdb", () => ({
  getMovieById: vi.fn(async (id: number) => ({
    tmdbId: id,
    title: `Movie ${id}`,
    year: 1950,
    posterPath: "/poster.jpg",
  })),
  getPreferredPosterPath: vi.fn(async (_id: number, p: string) => p),
}));

vi.mock("@/lib/trending", () => ({
  getTrendingLists: vi.fn(async () => []),
}));

describe("Homepage Server Component (src/app/(site)/page.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to auth callback when code param is present", async () => {
    await expect(
      Page({
        searchParams: Promise.resolve({ code: "oauth_code_123", next: "/custom" }),
      }),
    ).rejects.toThrow("REDIRECT:/auth/callback?code=oauth_code_123&next=%2Fcustom");
  });

  it("logs error with console.error when data loading fails and degrades gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getTonightsShortlist } = await import("@/lib/shortlist");
    vi.mocked(getTonightsShortlist).mockRejectedValueOnce(new Error("TMDB network error"));

    const result = await Page({});
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load homepage data:",
      expect.any(Error),
    );
    expect(result).toBeDefined();
    consoleSpy.mockRestore();
  });
});
