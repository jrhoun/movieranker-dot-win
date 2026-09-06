/**
 * Marquee header (DESIGN.md "Imagery Rules"): letterspaced Bebas caps flanked
 * by thin gold rules with ✦ dots. Used for page-level section titles.
 */
export default function MarqueeHeading({
  children,
  as: Tag = "h1",
}: {
  children: React.ReactNode;
  /** Heading level; sections inside a page use h2/h3. */
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag className="flex items-center gap-2 sm:gap-3 font-display text-2xl uppercase leading-none tracking-[0.04em] sm:text-3xl sm:tracking-[0.12em]">
      <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-gold/60 sm:min-w-4" />
      <span aria-hidden="true" className="text-gold">✦</span>
      <span className="whitespace-nowrap">{children}</span>
      <span aria-hidden="true" className="text-gold">✦</span>
      <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-gold/60 sm:min-w-4" />
    </Tag>
  );
}
