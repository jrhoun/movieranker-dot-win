import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Shared primitives for Open Graph cards.
 *
 * These are rendered by Satori (via next/og), NOT by a browser. The rules are
 * stricter than they look:
 *
 *   - flexbox only. `display: grid` silently produces a broken card.
 *   - every element with more than one child needs an explicit display:"flex",
 *     and an explicit flexDirection (Satori defaults to row, browsers to column).
 *   - no Tailwind classNames, no CSS variables — literal hex only.
 *   - <img> needs explicit width/height; Satori cannot infer intrinsic size.
 *
 * The failure mode is not an exception. It is a blank PNG returned with HTTP
 * 200, which no type check and no build catches. That is why og-card.test.ts
 * renders every card and asserts the output is not a flat field of one colour.
 *
 * TYPOGRAPHY: Bebas Neue is the only face, and it has NO lowercase — a
 * lowercase string renders as caps. Copy is therefore written in caps at the
 * call site so the source reads the way the card does.
 *
 * GLYPHS: the font covers A-Z, 0-9, and common punctuation (· — % # " ') but
 * NOT the site's ✦ dingbat, which renders as a tofu box. The marquee identity
 * is drawn with CSS instead — see MarqueeBulbs.
 */

/** Literal copies of the globals.css tokens. CSS variables do not exist here. */
export const COLORS = {
  bg: "#0d0d10",
  surface: "#17171c",
  surfaceRaised: "#1f1f26",
  gold: "#f5c518",
  text: "#ececf1",
  muted: "#8b8b94",
} as const;

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png" as const;

/**
 * Raw font bytes. next/font/google optimises for the browser and cannot hand
 * back a buffer, so the TTF is vendored. Read once at module scope: it does not
 * depend on request data (see the "Predictable values" note in the Next docs for
 * opengraph-image).
 */
export const DISPLAY_FONT = await readFile(
  join(process.cwd(), "assets/BebasNeue-Regular.ttf"),
);

/** Spread into the ImageResponse options of every card route. */
export const OG_RESPONSE_OPTIONS = {
  ...OG_SIZE,
  fonts: [{ name: "Bebas", data: DISPLAY_FONT, style: "normal" as const, weight: 400 as const }],
};

/** Absolute TMDB poster URL. Satori fetches server-side, so CORS never applies. */
export function posterUrl(posterPath: string | null | undefined): string | null {
  return posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : null;
}

/**
 * Display size for a headline of unknown length, so a long list title wraps to
 * two lines instead of running off the card. Bebas is condensed, which buys
 * roughly 30 characters per line at the top size.
 */
export function headlineSize(text: string): number {
  if (text.length <= 14) return 104;
  if (text.length <= 24) return 86;
  if (text.length <= 38) return 68;
  if (text.length <= 60) return 54;
  return 44;
}

/**
 * Hard ceiling on headline length.
 *
 * List titles are NOT capped server-side (src/app/api/lists/route.ts only
 * requires a non-empty string), so a 300-character title is reachable. At the
 * smallest ramp step that wraps to four lines and pushes the wordmark off the
 * bottom edge — the same clipping the first draft of this layout shipped. Two
 * lines is what the vertical budget affords, so clamp there.
 *
 * "..." rather than the ellipsis character: Bebas has no U+2026 glyph, and a
 * missing glyph renders as a tofu box.
 */
export function clampHeadline(text: string, max = 118): string {
  return text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`;
}

/**
 * The marquee light strip: the card's identity, drawn as CSS circles because
 * the site's ✦ has no glyph in Bebas. A theatre marquee is the thing the whole
 * product is named after, so it earns the top edge of every card.
 */
export function MarqueeBulbs() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        height: "34px",
        paddingLeft: "26px",
        paddingRight: "26px",
        backgroundColor: COLORS.surface,
        borderBottom: `2px solid ${COLORS.gold}`,
      }}
    >
      {Array.from({ length: 26 }, (_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            width: "12px",
            height: "12px",
            borderRadius: "6px",
            // Alternating brightness reads as bulbs rather than a dotted rule.
            backgroundColor: i % 2 === 0 ? COLORS.gold : "#6b5a10",
          }}
        />
      ))}
    </div>
  );
}

/** Up to three posters, best first. Missing art falls back to a flat block. */
export function PosterRow({ posters }: { posters: (string | null)[] }) {
  const shown = posters.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "26px",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {shown.map((url, i) =>
        url ? (
          // next/image cannot be used here: Satori renders raw <img> and fetches
          // the bytes itself. alt is inert in a PNG but keeps the a11y rule honest.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt=""
            width={180}
            height={270}
            style={{ borderRadius: "8px", objectFit: "cover" }}
          />
        ) : (
          <div
            key={i}
            style={{
              display: "flex",
              width: "180px",
              height: "270px",
              borderRadius: "8px",
              backgroundColor: COLORS.surfaceRaised,
              border: `2px solid ${COLORS.surface}`,
            }}
          />
        ),
      )}
    </div>
  );
}

/** Wide-tracked gold wordmark. Sits at the foot of every card. */
export function Wordmark() {
  return (
    <div
      style={{
        display: "flex",
        fontSize: "26px",
        letterSpacing: "0.26em",
        color: COLORS.gold,
      }}
    >
      MOVIERANKER.WIN
    </div>
  );
}

export interface OgCardProps {
  /** Small tracked label above the headline. Already uppercase. */
  eyebrow: string;
  /** The card's main line. Already uppercase. */
  headline: string;
  /** Overrides the length-derived headline size (the versus % wants to be huge). */
  headlineSizePx?: number;
  /** One supporting line under the headline. Already uppercase. */
  subline?: string | null;
  /** Posters, the versus names, or nothing. */
  children?: React.ReactNode;
}

/**
 * The shared card. Every OG image in the app is this shell with different
 * content, which is what keeps four separately-generated images recognisable
 * as one product in a feed.
 */
export function OgCard({ eyebrow, headline, headlineSizePx, subline, children }: OgCardProps) {
  // Clamped here, not at the call sites, so an unbounded list title cannot
  // reach the layout through a route that forgot to guard it.
  const line = clampHeadline(headline);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: COLORS.bg,
      }}
    >
      <MarqueeBulbs />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexGrow: 1,
          width: "100%",
          paddingLeft: "56px",
          paddingRight: "56px",
          paddingTop: "22px",
          paddingBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "23px",
            letterSpacing: "0.34em",
            color: COLORS.muted,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            textAlign: "center",
            maxWidth: "1040px",
            marginTop: "10px",
            fontSize: `${headlineSizePx ?? headlineSize(line)}px`,
            lineHeight: 1,
            letterSpacing: "0.02em",
            color: COLORS.gold,
          }}
        >
          {line}
        </div>
        {subline ? (
          <div
            style={{
              display: "flex",
              textAlign: "center",
              maxWidth: "980px",
              marginTop: "12px",
              fontSize: "28px",
              letterSpacing: "0.08em",
              color: COLORS.text,
            }}
          >
            {subline}
          </div>
        ) : null}
        {children ? (
          <div style={{ display: "flex", marginTop: "24px" }}>{children}</div>
        ) : null}
        <div style={{ display: "flex", marginTop: "24px" }}>
          <Wordmark />
        </div>
      </div>
    </div>
  );
}
