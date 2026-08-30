"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatShareText,
  readConnectionOutcome,
  type ConnectionOutcome,
  type ShareMovie,
} from "@/lib/share-text";

const menuItem =
  "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3.5 text-left text-xs font-medium text-text transition-colors duration-150 ease-out hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-gold";

export interface ShareButtonProps {
  title: string;
  url: string;
  /** Non-empty when this list came from a weekly marquee theme. */
  themeSlug?: string | null;
  marqueeNumber?: number | null;
  topMovies?: ShareMovie[];
  totalMovies?: number | null;
  curatorHandle?: string | null;
}

export default function ShareButton({
  title,
  url,
  themeSlug,
  marqueeNumber,
  topMovies,
  totalMovies,
  curatorHandle,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [connection, setConnection] = useState<ConnectionOutcome>("unplayed");
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

  // The quiz outcome lives only in localStorage (mr-conn-<slug>), written by
  // MarqueeConnectionGame. Read after mount so SSR markup matches.
  useEffect(() => {
    if (!themeSlug) return;
    try {
      const outcome = readConnectionOutcome(localStorage.getItem(`mr-conn-${themeSlug}`));
      Promise.resolve().then(() => setConnection(outcome));
    } catch {
      // Storage blocked (private mode, disabled cookies): leave "unplayed" so
      // the share omits the line rather than claiming anything untrue.
    }
  }, [themeSlug]);

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

  const shareText = formatShareText({
    title,
    url,
    themeSlug,
    marqueeNumber,
    topMovies,
    totalMovies,
    curatorHandle,
    connection,
  });
  const encodedText = encodeURIComponent(shareText);

  async function copyResult() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(shareText);
      showToast("Result copied — paste it anywhere");
    } catch {
      showToast("Couldn't copy — grab the URL from the address bar");
    }
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
      await navigator.share({ title, text: shareText, url });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
    void copyLink();
  }

  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  // threads.com, not threads.net — the .net address still works but 302s, and
  // the redirect is one more place a composer intent can lose its payload.
  const threadsUrl = `https://www.threads.com/intent/post?text=${encodedText}`;
  const blueskyUrl = `https://bsky.app/intent/compose?text=${encodedText}`;

  return (
    <>
      <div ref={wrapRef} className="relative shrink-0">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-8 items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-bg shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]"
        >
          <span aria-hidden="true">✦</span>
          Share
        </button>
        {open && (
          <div
            role="menu"
            aria-label="Share options"
            className="animate-fade-in absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-white/5 bg-surface/95 p-1.5 shadow-2xl ring-1 ring-gold/40 backdrop-blur-md"
          >
            <button type="button" role="menuitem" onClick={() => void copyResult()} className={menuItem}>
              <svg className="size-4 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              <span className="font-semibold text-gold">Copy result</span>
            </button>
            <button type="button" role="menuitem" onClick={() => void copyLink()} className={menuItem}>
              <svg className="size-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Copy link</span>
            </button>
            <a
              role="menuitem"
              href={threadsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={menuItem}
            >
              <svg className="size-4 shrink-0 fill-current text-text" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.186 24h-.007C5.463 24 0 18.53 0 11.807 0 5.084 5.463-.386 12.186-.386c6.724 0 12.187 5.47 12.187 12.193 0 .61-.044 1.222-.132 1.823a1.18 1.18 0 0 1-1.328.995 1.18 1.18 0 0 1-.996-1.328c.078-.53.117-1.07.117-1.49 0-5.42-4.407-9.827-9.848-9.827S2.338 6.387 2.338 11.807c0 5.42 4.407 9.827 9.848 9.827 4.148 0 7.822-2.617 9.176-6.535a1.18 1.18 0 0 1 1.492-.732 1.18 1.18 0 0 1 .732 1.492C21.96 20.354 17.382 24 12.186 24zm4.275-10.42c-.22-.38-.508-.71-.853-.98.71-.43 1.258-1.08 1.57-1.87.32-.82.35-1.74.08-2.6-.4-1.3-1.46-2.28-2.8-2.6-1.3-.31-2.68-.02-3.68.8-1 1-1.5 2.38-1.36 3.78.14 1.4 1 2.58 2.3 3.16.48.21.99.33 1.52.34.8.03 1.62-.2 2.27-.66.3.31.55.67.73 1.07.38.85.39 1.83.03 2.68-.36.85-1.05 1.48-1.91 1.76-.87.27-1.81.18-2.6-.26-.79-.44-1.34-1.18-1.53-2.06a1.18 1.18 0 0 1 .91-1.4 1.18 1.18 0 0 1 1.4.91c.09.43.36.8.75 1.01.39.22.85.26 1.27.13.43-.14.77-.45.95-.87.18-.42.17-.9-.01-1.32-.2-.46-.55-.86-.99-1.13a4.9 4.9 0 0 1-2.27.56c-.84 0-1.66-.22-2.39-.64-1.92-1.12-2.92-3.23-2.52-5.4.39-2.18 2.1-3.84 4.31-4.2 2.22-.36 4.38.68 5.43 2.62.53.98.67 2.12.39 3.22-.27 1.1-.98 2.01-1.97 2.53z" />
              </svg>
              <span>Post to Threads</span>
            </a>
            <a
              role="menuitem"
              href={blueskyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={menuItem}
            >
              <svg className="size-4 shrink-0 fill-[#1185fe]" viewBox="0 0 568 501" aria-hidden="true">
                <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.575 73.253-95.619 92.05-162.775 80.375 116.326 19.986 145.98 90.938 81.99 156.453-122.38 125.321-170.835-31.282-187.437-128.531C267.4 430.048 218.945 586.654 96.565 461.33-32.575 395.815-2.921 324.863 113.405 304.877 46.249 316.552-28.795 297.755-49.37 224.502-55.203 203.66-65.148 75.293-65.148 57.947c0-86.853 76.134-59.558 123.121-24.283z" />
              </svg>
              <span>Post to Bluesky</span>
            </a>
            <a role="menuitem" href={mailto} onClick={() => setOpen(false)} className={menuItem}>
              <svg className="size-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>Email</span>
            </a>
            {canNativeShare && (
              <button
                type="button"
                role="menuitem"
                onClick={() => void nativeShare()}
                className={menuItem}
              >
                <svg className="size-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
                <span>More options…</span>
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
