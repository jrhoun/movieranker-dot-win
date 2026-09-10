import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}));

describe("LoginPage", () => {
  it("renders login page with Google OAuth and no azure/microsoft stub", () => {
    const html = renderToStaticMarkup(h(LoginPage));

    expect(html).toContain("Continue with Google");
    expect(html).toContain("Email me a passwordless link");
    expect(html).toContain("Sign In");
    expect(html).toContain("Create Account");
    expect(html).not.toContain("azure");
    expect(html).not.toContain("Azure");
    expect(html).not.toContain("microsoft");
    expect(html).not.toContain("Microsoft");
    expect(html).not.toContain("Google sign-in isn't set up yet");
  });
});
