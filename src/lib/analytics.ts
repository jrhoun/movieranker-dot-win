import { track } from "@vercel/analytics";

export interface AnalyticsEvents {
  ranking_started: { source: "marquee" | "custom" };
  ranking_finished: { votes: number; movies: number };
  connection_guessed: { correct: boolean };
  save_gate_shown?: Record<string, never> | Record<string, string | number | boolean>;
  signup_completed: { provider: string };
  share_clicked: { surface: "list" | "pass" | "referral" };
  feedback_sent: { category: string };
}

export type EventName = keyof AnalyticsEvents;
export type EventValue = string | number | boolean | null | undefined;
export type EventProperties = Record<string, EventValue>;

let testOverride: boolean | null = null;

/**
 * Used by tests to override the default test-environment no-op behaviour.
 */
export function __setTrackEnabledForTesting(enabled: boolean | null): void {
  testOverride = enabled;
}

/**
 * Wraps @vercel/analytics track function with typed event contracts.
 * In test environments or during SSR, trackEvent is a safe no-op.
 */
export function trackEvent<K extends EventName>(
  name: K,
  props?: AnalyticsEvents[K],
): void;
export function trackEvent(
  name: string,
  props?: EventProperties,
): void;
export function trackEvent(name: string, props?: EventProperties): void {
  const isTest =
    testOverride !== null
      ? !testOverride
      : process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (isTest) {
    return;
  }

  if (typeof window === "undefined" && !testOverride) {
    return;
  }

  try {
    if (props) {
      track(name, props);
    } else {
      track(name);
    }
  } catch {
    // Analytics failure should never crash the user interface.
  }
}
