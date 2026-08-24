"use client";

import { useEffect, useRef, useState } from "react";

const menuItem =
  "flex min-h-11 w-full items-center gap-2.5 px-4 text-left text-sm font-medium transition-colors duration-150 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

export default function ShareButton({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // async hop so SSR/hydration markup matches before feature-detecting
    Promise.resolve().then(() => setCanNativeShare(!!navigator.share));
    const t = timer;
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  // close on outside click / Escape while open
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function showToast(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  }

  async function copyLink() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Couldn't copy — grab the URL from the address bar");
    }
  }

  async function nativeShare() {
    setOpen(false);
    try {
      await navigator.share({ title, url });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
    void copyLink();
  }

  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  const shareText = encodeURIComponent(`${title} — ${url}`);
  const threadsUrl = `https://www.threads.net/intent/post?text=${shareText}`;
  const blueskyUrl = `https://bsky.app/intent/compose?text=${shareText}`;

  return (
    <>
      <div ref={wrapRef} className="relative shrink-0">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="min-h-11 rounded bg-surface-raised px-5 text-sm font-medium transition-all duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
        >
          Share
        </button>
        {open && (
          <div
            role="menu"
            aria-label="Share options"
            className="animate-fade-in absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded bg-surface-raised py-1 shadow-xl ring-1 ring-white/10"
          >
            <button type="button" role="menuitem" onClick={() => void copyLink()} className={menuItem}>
              <span aria-hidden="true">🔗</span> Copy link
            </button>
            <a role="menuitem" href={mailto} onClick={() => setOpen(false)} className={menuItem}>
              <span aria-hidden="true">✉</span> Email
            </a>
            <a
              role="menuitem"
              href={threadsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={menuItem}
            >
              <span aria-hidden="true">@</span> Post to Threads
            </a>
            <a
              role="menuitem"
              href={blueskyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={menuItem}
            >
              <span aria-hidden="true">🦋</span> Post to Bluesky
            </a>
            {canNativeShare && (
              <button
                type="button"
                role="menuitem"
                onClick={() => void nativeShare()}
                className={menuItem}
              >
                <span aria-hidden="true">⋯</span> More options…
              </button>
            )}
          </div>
        )}
      </div>
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
