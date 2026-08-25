import Link from "next/link";

// Slim shared footer (DESIGN.md Premiere Night): muted single row under the
// dark house, thin gold rule to match the header.
const linkCls =
  "transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gold/20 bg-bg/70">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-xs text-muted">
        <span>© 2026 movieranker.win</span>
        <span aria-hidden="true">·</span>
        <Link href="/about" className={linkCls}>
          About
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className={linkCls}>
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className={linkCls}>
          Terms
        </Link>
      </div>
    </footer>
  );
}
