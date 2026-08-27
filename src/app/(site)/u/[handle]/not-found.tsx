import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-gold/30 bg-surface shadow-xl">
        <div className="relative aspect-[16/8] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/cutting-room-floor.jpg"
            alt="Discarded film strips on cutting room floor"
            className="h-full w-full object-cover brightness-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-5xl sm:text-6xl leading-none text-gold drop-shadow [text-shadow:0_0_20px_rgba(245,197,24,0.6)]">
              404
            </span>
            <span className="font-display text-[11px] uppercase tracking-[0.25em] text-white/90 drop-shadow mt-0.5">
              Private Profile
            </span>
          </div>
        </div>
      </div>

      <h1 className="font-display text-3xl uppercase tracking-wider sm:text-4xl text-text">
        Private or Unclaimed Profile
      </h1>

      <p className="max-w-md text-sm text-muted leading-relaxed">
        This profile is either set to <strong>Private</strong>, or this handle hasn&apos;t been claimed yet.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-full bg-gold px-6 text-xs font-bold uppercase tracking-wider text-bg shadow-lg transition-transform hover:-translate-y-0.5"
        >
          ✦ Start Ranking Movies
        </Link>
        <Link
          href="/u/profile"
          className="flex min-h-11 items-center rounded-full bg-surface-raised px-5 text-xs font-semibold uppercase tracking-wider text-text ring-1 ring-white/10 hover:ring-gold hover:text-gold"
        >
          My Profile &amp; Lists
        </Link>
      </div>
    </main>
  );
}
