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
  const accountDeleted = searchParams.get("bye");

  const activeKey = signedOut
    ? "signed_out"
    : accountDeleted
      ? "bye"
      : authError
        ? "auth_error"
        : null;

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const toast =
    activeKey && activeKey !== dismissedKey
      ? activeKey === "signed_out"
        ? { type: "success" as const, message: "Signed out successfully." }
        : activeKey === "bye"
          ? { type: "success" as const, message: "Your account has been deleted." }
          : {
              type: "error" as const,
              message: "Authentication failed. Please try signing in again.",
            }
      : null;

  useEffect(() => {
    if (!activeKey || activeKey === dismissedKey) return;
    const timer = setTimeout(() => {
      setDismissedKey(activeKey);
      cleanUrlParam(activeKey);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeKey, dismissedKey]);

  if (!toast) return null;

  function handleDismiss() {
    if (activeKey) {
      setDismissedKey(activeKey);
      cleanUrlParam(activeKey);
    }
  }

  return (
    <aside
      aria-label="Notification"
      className="fixed top-20 left-1/2 z-50 -translate-x-1/2 transform px-4 pointer-events-auto"
    >
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-3 rounded-full border px-6 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 ease-out animate-sheet-up ${
          toast.type === "success"
            ? "border-gold/60 bg-surface/98 text-text shadow-gold/20 ring-1 ring-gold/40"
            : "border-accent-red/60 bg-surface/98 text-accent-red shadow-accent-red/20 ring-1 ring-accent-red/40"
        }`}
      >
        <span aria-hidden="true" className={toast.type === "success" ? "text-gold text-base" : "text-accent-red text-base"}>
          {toast.type === "success" ? "✦" : "⚠️"}
        </span>
        <span className="text-xs sm:text-sm font-bold tracking-wide text-text">
          {toast.message}
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="ml-2 text-muted hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded-full p-1 transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
