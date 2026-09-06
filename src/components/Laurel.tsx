/**
 * Festival laurels — the site's one badge shape.
 *
 * Achievements, streaks and titles used to be rendered as emoji inside tinted
 * squares (🏆 🎟️ 🏛️), which read as a notification tray on a page whose
 * design brief is a cinema lobby. A laurel is what a film wears when it has
 * won something, and it is drawn here once so every surface uses the same
 * pair of branches: the vote stage's streak badge, the profile's pinned
 * achievements, the career guide's earned ranks.
 *
 * Text-only inside: `<Laurel>Opening Night Pioneer</Laurel>`. No icons.
 */

export function LaurelBranchLeft({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M7.8 1.2c-.3 1.6-1.3 3.2-2.8 4-1.2.6-2.6.7-3.8.3.4 1.4 1.3 2.5 2.6 3 .3.1.6.2.9.2-1.6.8-2.6 2.3-2.8 4 1.4-.2 2.6-.9 3.4-2 .2-.3.4-.6.5-1-.2 1.5.3 3.1 1.4 4.1.3-.8.4-1.7.3-2.6 0-.8-.3-1.6-.7-2.3 1.1-.9 1.8-2.3 1.9-3.7-.6.4-1.3.6-2 .6-.6 0-1.2-.2-1.7-.6 1.4-.9 2.2-2.4 2.1-4z" />
    </svg>
  );
}

export function LaurelBranchRight({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8.2 1.2c.3 1.6 1.3 3.2 2.8 4 1.2.6 2.6.7 3.8.3-.4 1.4-1.3 2.5-2.6 3-.3.1-.6.2-.9.2 1.6.8 2.6 2.3 2.8 4-1.4-.2-2.6-.9-3.4-2-.2-.3-.4-.6-.5-1 .2 1.5-.3 3.1-1.4 4.1-.3-.8-.4-1.7-.3-2.6 0-.8.3-1.6.7-2.3-1.1-.9-1.8-2.3-1.9-3.7.6.4 1.3.6 2 .6.6 0 1.2-.2 1.7-.6-1.4-.9-2.2-2.4-2.1-4z" />
    </svg>
  );
}

export type LaurelTone = "gold" | "muted";

/**
 * Text between two branches. `gold` for something earned, `muted` for
 * something still to earn — the shape is the same so the eye reads both as
 * the same kind of thing at different states.
 */
export function Laurel({
  children,
  tone = "gold",
  className = "",
}: {
  children: React.ReactNode;
  tone?: LaurelTone;
  className?: string;
}) {
  const color = tone === "gold" ? "text-gold" : "text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display text-base uppercase leading-none tracking-wide sm:text-lg ${color} ${className}`}
    >
      <LaurelBranchLeft className="h-5 w-5 shrink-0" />
      <span>{children}</span>
      <LaurelBranchRight className="h-5 w-5 shrink-0" />
    </span>
  );
}
