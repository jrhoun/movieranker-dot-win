"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function cleanUrlParam(param: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(param);
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
}

export default function AuthToast() {
  const searchParams = useSearchParams();
  const signedOut = searchParams.get("signed_out");
  const authError = searchParams.get("auth_error");

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const activeKey = signedOut ? "signed_out" : authError ? "auth_error" : null;
  const toast =
    activeKey === "signed_out" && dismissedKey !== "signed_out"
      ? { type: "success" as const, message: "Signed out successfully." }
      : activeKey === "auth_error" && dismissedKey !== "auth_error"
        ? { type: "error" as const, message: "Authentication failed. Please try signing in again." }
        : null;

  useEffect(() => {
    if (!activeKey) return;
    cleanUrlParam(activeKey);
    const timer = setTimeout(() => {
      setDismissedKey(activeKey);
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeKey]);

  if (!toast) return null;

  return (
    <aside
      aria-label="Notification"
      className="fixed top-16 left-1/2 z-50 -translate-x-1/2 transform px-4"
    >
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-3 rounded-full border px-5 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-300 ease-out animate-fade-in ${
          toast.type === "success"
            ? "border-gold/40 bg-surface/95 text-text shadow-gold/10"
            : "border-accent-red/40 bg-surface/95 text-accent-red shadow-accent-red/10"
        }`}
      >
        <span aria-hidden="true" className={toast.type === "success" ? "text-gold" : "text-accent-red"}>
          {toast.type === "success" ? "✦" : "⚠️"}
        </span>
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-text">
          {toast.message}
        </span>
        <button
          type="button"
          onClick={() => {
            if (activeKey) setDismissedKey(activeKey);
          }}
          aria-label="Dismiss notification"
          className="ml-1 text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded-full p-0.5"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
