"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isReserved, isValidHandle, normalizeHandle } from "@/lib/handles";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "invalid" }
  | { kind: "reserved" }
  | { kind: "taken" }
  | { kind: "unreachable" };

const HINTS: Record<Status["kind"], string> = {
  idle: "3-20 chars · letters, numbers, _ or -",
  checking: "Checking…",
  ok: "Available ✓",
  invalid: "3-20 chars · letters, numbers, _ or -",
  reserved: "That one's reserved.",
  taken: "Already claimed — try another.",
  unreachable: "Couldn't reach the server — try again.",
};

export default function ClaimHandleCard() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [checkState, setCheckState] = useState<
    "checking" | "ok" | "taken" | "unreachable" | "invalid"
  >("checking");
  const [claiming, setClaiming] = useState(false);

  // Shape problems are derived at render; only the server check needs state.
  const handle = normalizeHandle(value);
  const kind: Status["kind"] = !handle
    ? "idle"
    : !isValidHandle(handle)
      ? "invalid"
      : isReserved(handle)
        ? "reserved"
        : checkState;

  // Debounced live availability check.
  useEffect(() => {
    if (!handle || !isValidHandle(handle) || isReserved(handle)) return;
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
        body: JSON.stringify({ handle: value }),
      });
      if (res.ok) router.refresh();
      else setCheckState(res.status === 409 ? "taken" : "invalid");
    } catch {
      setCheckState("unreachable");
    } finally {
      setClaiming(false);
    }
  }

  const canClaim = kind === "ok" && !claiming;

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
      <p className="mt-1 text-sm text-muted">
        Reserve your name for your shareable profile page.
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (canClaim) void claim();
        }}
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
        <button
          type="submit"
          disabled={!canClaim}
          className="min-h-11 rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {claiming ? "Claiming…" : "Claim"}
        </button>
      </form>
      <p
        id="claim-hint"
        role={kind === "taken" || kind === "reserved" ? "status" : undefined}
        className={`mt-2 text-xs ${kind === "ok" ? "text-gold" : "text-muted"}`}
      >
        {HINTS[kind]}
      </p>
    </section>
  );
}
