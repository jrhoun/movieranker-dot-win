import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as vercelAnalytics from "@vercel/analytics";
import {
  __setTrackEnabledForTesting,
  trackEvent,
} from "./analytics";

vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

describe("analytics trackEvent", () => {
  const trackMock = vi.mocked(vercelAnalytics.track);

  beforeEach(() => {
    vi.clearAllMocks();
    __setTrackEnabledForTesting(null);
  });

  afterEach(() => {
    __setTrackEnabledForTesting(null);
  });

  it("is a no-op in test environments by default", () => {
    trackEvent("ranking_started", { source: "marquee" });
    trackEvent("save_gate_shown");
    expect(trackMock).not.toHaveBeenCalled();
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
  });

  it("swallows errors thrown by the underlying analytics library", () => {
    __setTrackEnabledForTesting(true);
    trackMock.mockImplementationOnce(() => {
      throw new Error("Vercel analytics script failed");
    });

    expect(() => {
      trackEvent("ranking_started", { source: "marquee" });
    }).not.toThrow();
  });
});
