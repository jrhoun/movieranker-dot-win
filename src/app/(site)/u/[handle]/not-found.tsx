"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeHandle } from "@/lib/handles";

/**
 * The handle someone asked for, read off the URL: a not-found boundary is
 * rendered outside the page and never receives its params, so this is the
 * only way to say "@{handle}" back to the visitor.
 */
function handleFromPathname(pathname: string | null): string | null {
  const m = (pathname ?? "").match(/^\/u\/([^/]+)/);
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {}
  return normalizeHandle(raw) || null;
}

export default function ProfileNotFound() {
  const pathname = usePathname();
  const handle = handleFromPathname(pathname);
  // Signed-out until proven otherwise: the second button only appears for a
  // signed-in visitor, so the first paint is the one-action version.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled && data.user) setSignedIn(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-reading flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      {/* Status for assistive tech only: the response itself is a 404 (the
          page threw notFound()); sighted readers get the heading. */}
      <p className="sr-only" role="status">
        Error 404
      </p>
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-gold/30 bg-surface shadow-xl">
        <div className="relative aspect-[16/8] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/cutting-room-floor.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-full w-full object-cover brightness-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/60" />
        </div>
      </div>

      <h1 className="font-display text-3xl uppercase tracking-wider text-text sm:text-4xl">
        This profile is private
      </h1>

      <p className="max-w-md text-sm leading-relaxed text-muted">
        {handle ? (
          <>
            Either @{handle} keeps their rankings private, or nobody has claimed
            this handle yet.
          </>
        ) : (
          <>Either this curator keeps their rankings private, or nobody has claimed this handle yet.</>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded bg-gold px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Play this week&apos;s list
        </Link>
        {signedIn && (
          <Link
            href="/u/profile"
            className="inline-flex min-h-11 items-center px-2 text-sm text-muted underline-offset-4 transition-colors duration-200 ease-out hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            My profile
          </Link>
        )}
      </div>
    </main>
  );
}
