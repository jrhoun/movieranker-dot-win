"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isProfane, isReserved, isValidHandle, normalizeHandle } from "@/lib/handles";
import { trackEvent } from "@/lib/analytics";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "invalid" }
  | { kind: "profane" }
  | { kind: "reserved" }
  | { kind: "taken" }
  | { kind: "ratelimited" }
  | { kind: "unreachable" };

const SHAPE_HINT = "3 to 20 characters: letters, numbers, underscore or hyphen.";

type Visibility = "public" | "private";

/**
 * The choice offered at claim time. Public is preselected: a profile is the
 * thing a share link points at, and the old private default meant every new
 * link landed on the not-found page until the owner found the toggle in
 * settings. Same two values PATCH /api/profile accepts, so the settings
 * toggle can change it later either way.
 */
export const VISIBILITY_OPTIONS: readonly {
  value: Visibility;
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone with the link can see your rankings.",
  },
  { value: "private", label: "Private", description: "Only you." },
];

const HINTS: Record<Status["kind"], string> = {
  idle: SHAPE_HINT,
  checking: "Checking…",
  ok: "That handle is available.",
  invalid: SHAPE_HINT,
  profane: "That handle contains inappropriate language.",
  reserved: "That one is reserved.",
  taken: "Already claimed — try another one.",
  ratelimited: "Too many claim attempts — try again in an hour.",
  unreachable: "Couldn't reach the server — try again.",
};

export default function ClaimHandleCard() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [checkState, setCheckState] = useState<
    | "checking"
    | "ok"
    | "taken"
    | "unreachable"
    | "invalid"
    | "ratelimited"
  >("checking");
  const [claiming, setClaiming] = useState(false);
  // Confirmation panel hidden via "Go back" until the handle changes.
  const [dismissed, setDismissed] = useState(false);
  // Local success mirror: renders the static claimed display even before
  // router.refresh() swaps this card out for the server-rendered chip.
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");

  // Shape problems are derived at render; only the server check needs state.
  const handle = normalizeHandle(value);
  const kind: Status["kind"] = !handle
    ? "idle"
    : isProfane(handle)
      ? "profane"
      : !isValidHandle(handle)
        ? "invalid"
        : isReserved(handle)
          ? "reserved"
          : checkState;

  // Reset the dismissed flag on handle change — setState-during-render
  // adjustment pattern (react.dev/learn/you-might-not-need-an-effect).
  const [prevHandle, setPrevHandle] = useState(handle);
  if (prevHandle !== handle) {
    setPrevHandle(handle);
    setDismissed(false);
  }

  // Debounced live availability check.
  useEffect(() => {
    if (
      !handle ||
      isProfane(handle) ||
      !isValidHandle(handle) ||
      isReserved(handle)
    )
      return;
    // Stale result stays visible through the debounce window.
    const t = setTimeout(async () => {
      setCheckState("checking");
      try {
        const res = await fetch(
          `/api/profile/availability?handle=${encodeURIComponent(handle)}`,
        );
        const body = (await res.json()) as { available: boolean };
        setCheckState(body.available ? "ok" : "taken");
      } catch {
        setCheckState("unreachable");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [handle]);

  async function claim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: value, visibility }),
      });
      if (res.ok) {
        trackEvent("handle_claimed");
        setClaimedHandle(handle);
        router.refresh();
      } else if (res.status === 409) setCheckState("taken");
      else if (res.status === 429) setCheckState("ratelimited");
      else setCheckState("invalid");
    } catch {
      setCheckState("unreachable");
    } finally {
      setClaiming(false);
    }
  }

  if (claimedHandle) {
    // Success replaces the entire card: static display, no edit affordance.
    return (
      <section
        aria-label="Your handle"
        className="mt-6 rounded bg-surface p-6 ring-2 ring-gold/50"
      >
        <p className="font-display text-3xl uppercase tracking-[0.12em] text-gold">
          @{claimedHandle}
        </p>
        <p className="mt-1 text-sm text-muted">
          This handle is yours.{" "}
          {visibility === "public"
            ? "Your profile is public."
            : "Your profile is private."}
        </p>
      </section>
    );
  }

  const available = kind === "ok";
  const showConfirm = available && !dismissed && !claiming;

  return (
    <section
      aria-labelledby="claim-heading"
      className="mt-6 rounded bg-surface p-6 ring-2 ring-gold/50"
    >
      <h2
        id="claim-heading"
        className="font-display text-2xl uppercase tracking-[0.12em] text-gold"
      >
        Claim your handle
      </h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted">
        Pick the name your public profile lives at.
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="your-handle"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-label="Handle"
          aria-describedby="claim-hint"
          className="min-h-11 flex-1 rounded bg-surface-raised px-4 font-mono text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        />
      </form>

      {showConfirm ? (
        // Two-step confirmation: only Confirm fires the POST.
        <div
          role="alert"
          className="mt-3 rounded bg-surface-raised p-4 ring-1 ring-gold/60"
        >
          <p className="font-display text-xl uppercase tracking-wide text-gold">
            Handles are permanent and cannot be changed.
          </p>
          <p className="mt-1 text-sm">
            Claiming <span className="font-semibold">@{handle}</span> locks it to
            your account forever.
          </p>
          {/* Visibility is the one thing that is NOT permanent here: it can
              be changed any time in settings, which is why it gets two plain
              radios and no warning of its own. */}
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-text">
              Who can see your profile
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded px-3 py-2 ring-1 transition-colors duration-200 ease-out ${
                    visibility === opt.value
                      ? "bg-gold/10 ring-gold/60"
                      : "ring-white/10 hover:ring-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="claim-visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="mt-1 h-4 w-4 shrink-0 accent-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-text">{opt.label}</span>
                    <span className="text-xs text-muted">{opt.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void claim()}
              disabled={claiming}
              className="min-h-11 rounded bg-gold px-6 font-semibold text-bg transition-transform duration-200 ease-out enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {claiming ? "Claiming…" : `Claim @${handle}`}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="min-h-11 rounded px-6 text-muted underline-offset-4 transition-colors duration-200 ease-out hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Go back
            </button>
          </div>
        </div>
      ) : (
        <>
          {available && dismissed && (
            <button
              type="button"
              onClick={() => setDismissed(false)}
              className="mt-3 min-h-11 rounded px-6 text-sm font-medium text-gold underline-offset-4 transition-colors duration-200 ease-out hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Claim @{handle}
            </button>
          )}
          <p
            id="claim-hint"
            role={
              kind === "taken" || kind === "reserved" || kind === "profane"
                ? "status"
                : undefined
            }
            className={`mt-2 text-xs ${
              kind === "ok"
                ? "text-gold"
                : kind === "profane"
                  ? "text-accent-red"
                  : "text-muted"
            }`}
          >
            {HINTS[kind]}
          </p>
        </>
      )}
    </section>
  );
}
