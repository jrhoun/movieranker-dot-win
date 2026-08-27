"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Site error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-white/10 bg-surface p-8 shadow-2xl ring-1 ring-white/5">
        <span className="text-4xl" aria-hidden="true">🎬</span>
        <h1 className="font-display mt-4 text-2xl uppercase tracking-wider text-gold">
          Scene Interrupted
        </h1>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          We couldn&apos;t load this scene right now. If you were in the middle of ranking, your staged movies and picks are preserved.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-11 rounded-full bg-gold px-6 text-xs font-bold uppercase tracking-wider text-bg shadow-md transition-opacity hover:opacity-90 active:scale-95"
          >
            Try Again ↺
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-surface-raised px-5 text-xs font-semibold uppercase tracking-wider text-text ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-gold"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
