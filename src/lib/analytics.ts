import { track } from "@vercel/analytics";

export type SignInSurface =
  | "header"
  | "save_gate"
  | "upvote"
  | "beta_modal"
  | "login_page";
export type SignInProvider = "google" | "magic_link" | "password";

export interface AnalyticsEvents {
  ranking_started: { source: "marquee" | "custom" };
  ranking_finished: { votes: number; movies: number };
  connection_guessed: { correct: boolean };
  save_gate_shown?: Record<string, never> | Record<string, string | number | boolean>;
  signup_completed: { provider: string };
  share_clicked: { surface: "list" | "pass" | "referral" };
  feedback_sent: { category: string };
  home_cta_clicked: { cta: "play_marquee" | "build_own" | "resume" };
  signin_clicked: { surface: SignInSurface; provider?: SignInProvider };
  handle_claimed?: Record<string, never>;
}

export type EventName = keyof AnalyticsEvents;
export type EventValue = string | number | boolean | null | undefined;
export type EventProperties = Record<string, EventValue>;

// GA4 is loaded by src/app/layout.tsx as a classic inline script whose
// top-level `function gtag()` becomes a window global. Nothing else in the
// app declares this, so the type lives here next to its only caller.
declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

let testOverride: boolean | null = null;

/**
 * Used by tests to override the default test-environment no-op behaviour.
 */
export function __setTrackEnabledForTesting(enabled: boolean | null): void {
  testOverride = enabled;
}

/**
 * Sends one typed event to every analytics sink: Vercel Web Analytics
 * (whose custom events need a paid plan) and GA4 via gtag when the tag is
 * loaded. Event names stay GA4-safe: snake_case, at most 40 characters.
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

  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, props);
    }
  } catch {
    // Same rule for GA4: a broken tag never reaches the user.
  }
}

/**
 * One sign-in click, wherever it happens. `provider` is only known on the
 * surfaces that show the provider buttons themselves (login page, save gate).
 */
export function trackSignInClick(
  surface: SignInSurface,
  provider?: SignInProvider,
): void {
  trackEvent("signin_clicked", provider ? { surface, provider } : { surface });
}
