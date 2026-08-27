"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-surface p-8 shadow-2xl">
        <span className="text-4xl" aria-hidden="true">🎬</span>
        <h1 className="font-display mt-4 text-3xl uppercase tracking-wider text-gold">
          Technical Difficulties
        </h1>
        <p className="mt-2 text-sm text-muted">
          Our projection booth encountered an unexpected hiccup. Don&apos;t worry, your data is safe.
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
    </div>
  );
}
