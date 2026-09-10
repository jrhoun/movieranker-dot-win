import Link from "next/link";
import { FeedbackTrigger } from "@/components/feedback";

const linkCls =
  "text-xs text-muted transition-colors duration-200 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gold/20 bg-surface/50 backdrop-blur">
      <div className="mx-auto w-full max-w-page px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand & Mission */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-gold">✦</span>
              <span className="font-display text-lg uppercase tracking-wider text-text">
                MovieRanker.win
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Rank movies head-to-head, solo or with friends, with a new themed Marquee
              and hidden connection every week — for people who love lists and cinema.
            </p>
          </div>

          {/* Site Navigation */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gold">
              Explore
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/" className={linkCls}>
                  Home / Builder
                </Link>
              </li>
              <li>
                <Link href="/#tonight" className={linkCls}>
                  This Week&apos;s Marquee
                </Link>
              </li>
              <li>
                <Link href="/compare" className={linkCls}>
                  Compare Rankings
                </Link>
              </li>
              <li>
                <Link href="/updates" className={linkCls}>
                  Site Updates &amp; News
                </Link>
              </li>
              <li>
                <Link href="/u/profile" className={linkCls}>
                  My Profile &amp; Lists
                </Link>
              </li>
              <li>
                <Link href="/settings" className={linkCls}>
                  Account Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gold">
              Policies
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/about" className={linkCls}>
                  About the Project
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkCls}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkCls}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <FeedbackTrigger className={linkCls}>
                  Support & Feedback
                </FeedbackTrigger>
              </li>
            </ul>
          </div>
        </div>

        {/* TMDB Notice & Copyright */}
        <div className="mt-8 border-t border-white/5 pt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted leading-relaxed">
          <p>
            Movie metadata and poster art provided by{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-gold underline decoration-white/20"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p className="shrink-0">
            © 2026 JR · MovieRanker.win
          </p>
        </div>
      </div>
    </footer>
  );
}
