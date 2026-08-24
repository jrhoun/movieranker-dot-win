"use client";

import { useEffect, useRef, useState } from "react";

export default function ShareButton({ title, url }: { title: string; url: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = timer;
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return; // native sheet handled it (user cancel is fine, no toast)
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Couldn't copy — grab the URL from the address bar");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="min-h-11 shrink-0 rounded bg-surface-raised px-5 text-sm font-medium transition-all duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
      >
        Share
      </button>
      {toast && (
        <div
          role="status"
          className="animate-sheet-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-surface-raised px-4 py-2.5 text-sm shadow-lg ring-1 ring-white/10"
        >
          {toast}
        </div>
      )}
    </>
  );
}
