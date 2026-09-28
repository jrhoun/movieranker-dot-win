import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as vercelAnalytics from "@vercel/analytics";
import {
  __setTrackEnabledForTesting,
  trackEvent,
  trackSignInClick,
} from "./analytics";

vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

describe("analytics trackEvent", () => {
  const trackMock = vi.mocked(vercelAnalytics.track);
  const gtagMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    __setTrackEnabledForTesting(null);
    // Node test environment: stand in for the browser window the GA4 tag
    // (src/app/layout.tsx) installs `gtag` on.
    vi.stubGlobal("window", { gtag: gtagMock });
  });

  afterEach(() => {
    __setTrackEnabledForTesting(null);
    vi.unstubAllGlobals();
  });

  it("is a no-op in test environments by default", () => {
    trackEvent("ranking_started", { source: "marquee" });
    trackEvent("save_gate_shown");
    expect(trackMock).not.toHaveBeenCalled();
    expect(gtagMock).not.toHaveBeenCalled();
  });

  it("calls @vercel/analytics track when testing override is enabled", () => {
    __setTrackEnabledForTesting(true);

    trackEvent("ranking_started", { source: "custom" });
    expect(trackMock).toHaveBeenCalledWith("ranking_started", { source: "custom" });

    trackEvent("ranking_finished", { votes: 12, movies: 6 });
    expect(trackMock).toHaveBeenCalledWith("ranking_finished", { votes: 12, movies: 6 });

    trackEvent("connection_guessed", { correct: true });
    expect(trackMock).toHaveBeenCalledWith("connection_guessed", { correct: true });

    trackEvent("save_gate_shown");
    expect(trackMock).toHaveBeenCalledWith("save_gate_shown");

    trackEvent("signup_completed", { provider: "password" });
    expect(trackMock).toHaveBeenCalledWith("signup_completed", { provider: "password" });

    trackEvent("share_clicked", { surface: "pass" });
    expect(trackMock).toHaveBeenCalledWith("share_clicked", { surface: "pass" });

    trackEvent("feedback_sent", { category: "bug" });
    expect(trackMock).toHaveBeenCalledWith("feedback_sent", { category: "bug" });

    trackEvent("home_cta_clicked", { cta: "play_marquee" });
    expect(trackMock).toHaveBeenCalledWith("home_cta_clicked", { cta: "play_marquee" });

    trackEvent("handle_claimed");
    expect(trackMock).toHaveBeenCalledWith("handle_claimed");
  });

  it("mirrors every event to GA4 via window.gtag with the same name and props", () => {
    __setTrackEnabledForTesting(true);

    trackEvent("ranking_started", { source: "custom" });
    expect(gtagMock).toHaveBeenCalledWith("event", "ranking_started", { source: "custom" });

    trackEvent("save_gate_shown");
    expect(gtagMock).toHaveBeenCalledWith("event", "save_gate_shown", undefined);
  });

  it("still sends to Vercel when gtag is not loaded", () => {
    __setTrackEnabledForTesting(true);
    vi.stubGlobal("window", {});

    expect(() => trackEvent("ranking_started", { source: "marquee" })).not.toThrow();
    expect(trackMock).toHaveBeenCalledWith("ranking_started", { source: "marquee" });
    expect(gtagMock).not.toHaveBeenCalled();
  });

  it("swallows errors thrown by the underlying analytics library", () => {
    __setTrackEnabledForTesting(true);
    trackMock.mockImplementationOnce(() => {
      throw new Error("Vercel analytics script failed");
    });

    expect(() => {
      trackEvent("ranking_started", { source: "marquee" });
    }).not.toThrow();
    // A Vercel failure must not stop the GA4 mirror.
    expect(gtagMock).toHaveBeenCalledWith("event", "ranking_started", { source: "marquee" });
  });

  it("swallows errors thrown by gtag", () => {
    __setTrackEnabledForTesting(true);
    gtagMock.mockImplementationOnce(() => {
      throw new Error("gtag broke");
    });

    expect(() => {
      trackEvent("ranking_started", { source: "marquee" });
    }).not.toThrow();
  });

  it("keeps every event name GA4-safe (snake_case, at most 40 chars)", () => {
    const names = [
      "ranking_started",
      "ranking_finished",
      "connection_guessed",
      "save_gate_shown",
      "signup_completed",
      "share_clicked",
      "feedback_sent",
      "home_cta_clicked",
      "signin_clicked",
      "handle_claimed",
    ];
    for (const n of names) {
      expect(n).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(n.length).toBeLessThanOrEqual(40);
    }
  });
});

describe("trackSignInClick", () => {
  const trackMock = vi.mocked(vercelAnalytics.track);
  const gtagMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    __setTrackEnabledForTesting(true);
    vi.stubGlobal("window", { gtag: gtagMock });
  });

  afterEach(() => {
    __setTrackEnabledForTesting(null);
    vi.unstubAllGlobals();
  });

  it("sends surface only when no provider is known", () => {
    trackSignInClick("header");
    expect(trackMock).toHaveBeenCalledWith("signin_clicked", { surface: "header" });
    expect(gtagMock).toHaveBeenCalledWith("event", "signin_clicked", { surface: "header" });
  });

  it("sends surface and provider when both are known", () => {
    trackSignInClick("login_page", "google");
    expect(trackMock).toHaveBeenCalledWith("signin_clicked", {
      surface: "login_page",
      provider: "google",
    });
  });
});
