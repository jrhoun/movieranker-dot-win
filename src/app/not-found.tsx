import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const SUGGESTED_THEMES = [
  {
    title: "Heavy Rain, Poor Choices",
    icon: "🌧️",
    blurb: "Trench coats, neon puddles, and detectives who refuse to check the weather forecast.",
    films: ["Seven", "Blade Runner 2049", "Shutter Island", "Zodiac"],
  },
  {
    title: "Secretly The Same Story",
    icon: "⚡",
    blurb: "A farm boy, a hacker, a wizard, and a boxer walk into a monomyth.",
    films: ["Star Wars", "The Matrix", "Harry Potter", "Rocky"],
  },
  {
    title: "One Room, No Exit",
    icon: "🚪",
    blurb: "Nobody leaves until the credits roll. Maximum tension on a single soundstage budget.",
    films: ["12 Angry Men", "The Thing", "Rear Window", "10 Cloverfield Lane"],
  },
];

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:py-14">
        {/* Cinematic Film Visual & 404 Badge */}
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(245,197,24,0.15)]">
          <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/cutting-room-floor.jpg"
              alt="Discarded 35mm film strips on a cutting room floor"
              loading="lazy"
              className="h-full w-full object-cover brightness-[0.75] contrast-[1.1]"
            />
            {/* Vignette & Spotlight overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/60" />
            <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-gold/10 via-transparent to-black/70" />

            {/* Prominent Center 404 Plaque */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <span className="font-display text-7xl sm:text-9xl leading-none text-gold tracking-widest drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] [text-shadow:0_0_35px_rgba(245,197,24,0.6)]">
                404
              </span>
              <span className="font-display text-xs sm:text-sm uppercase tracking-[0.3em] text-white/90 drop-shadow mt-1">
                ✦ Scene Missing · Page Not Found ✦
              </span>
            </div>
          </div>
        </div>

        <h1 className="mt-6 font-display text-3xl uppercase tracking-wider text-text sm:text-5xl">
          Lost on the Cutting Room Floor
        </h1>

        <p className="mt-2.5 max-w-lg text-sm text-muted sm:text-base leading-relaxed">
          We couldn&apos;t find what you were looking for. The link might be broken, the reel was lost in the edit, or this ranking is set to <strong>Private</strong>.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex min-h-11 items-center rounded-full bg-gold px-6 text-xs font-bold uppercase tracking-wider text-bg shadow-xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-gold/20 active:scale-95"
          >
            ✦ Start a New Ranking
          </Link>
          <Link
            href="/compare"
            className="flex min-h-11 items-center rounded-full bg-surface-raised px-5 text-xs font-semibold uppercase tracking-wider text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:ring-gold hover:text-gold active:scale-95"
          >
            Compare Rankings
          </Link>
          <Link
            href="/u/profile"
            className="flex min-h-11 items-center rounded-full bg-surface-raised px-5 text-xs font-semibold uppercase tracking-wider text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:ring-gold hover:text-gold active:scale-95"
          >
            My Profile &amp; Lists
          </Link>
        </div>

        {/* "Don't leave empty handed" Section */}
        <div className="mt-14 w-full text-left">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px flex-1 bg-white/10" />
            <p className="font-display text-base uppercase tracking-[0.14em] text-gold shrink-0">
              🍿 Don&apos;t Leave Empty-Handed · Instant Movie Starters
            </p>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SUGGESTED_THEMES.map((theme) => (
              <div
                key={theme.title}
                className="flex flex-col justify-between rounded-xl bg-surface p-5 ring-1 ring-white/10 shadow-lg transition-all duration-200 ease-out hover:-translate-y-1 hover:ring-gold/40"
              >
                <div>
                  <div className="text-2xl mb-2">{theme.icon}</div>
                  <h3 className="font-display text-lg uppercase tracking-wide text-text leading-tight">
                    {theme.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    {theme.blurb}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {theme.films.map((f) => (
                      <span
                        key={f}
                        className="rounded bg-surface-raised px-2 py-0.5 text-[11px] text-muted ring-1 ring-white/5"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gold hover:underline"
                  >
                    Rank on Home →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
