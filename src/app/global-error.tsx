"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global uncaught error:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full bg-[#0d0d10] text-[#f4f4f5]">
      <body className="flex min-h-full flex-col items-center justify-center p-4 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#16161a] p-8 shadow-2xl">
          <span className="text-4xl" aria-hidden="true">🍿</span>
          <h1 className="mt-4 text-2xl font-bold uppercase tracking-wider text-[#f5c518]">
            Intermission
          </h1>
          <p className="mt-2 text-sm text-[#a1a1aa]">
            Something went wrong while loading the theater. Please reload the page.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => reset()}
              className="min-h-11 rounded-full bg-[#f5c518] px-6 text-xs font-bold uppercase tracking-wider text-[#0d0d10] shadow-md transition-opacity hover:opacity-90 active:scale-95"
            >
              Reload MovieRanker ↺
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
