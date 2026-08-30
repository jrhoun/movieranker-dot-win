import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { AVATARS, avatarAssetPath, posterAvatarTmdbId } from "./cosmetics/avatars";
import { itemById } from "./cosmetics/catalogue";
import type { Equipped } from "./cosmetics/equipped";
import { podiumDisplayOrder } from "./list-view";
import { hashString } from "./seeded-random";

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

/**
 * Generated avatars as data URIs, read once at module scope like the font
 * above.
 *
 * Satori does not resolve a same-origin relative path — `/avatars/x.svg` is
 * simply not fetched, and a failed image is one of the ways this renderer
 * returns a BLANK PNG at HTTP 200 rather than erroring. Inlining removes the
 * fetch entirely, which also keeps the card's render free of network I/O.
 *
 * All 24 are ~200KB total and the set is fixed at build time, so preloading is
 * cheaper than threading async reads into a synchronous component tree.
 */
const GENERATED_AVATAR_URI = new Map<string, string>(
  await Promise.all(
    AVATARS.filter((a) => a.id.startsWith("avatar.gen.")).map(
      async (a): Promise<[string, string]> => [
        a.id,
        `data:image/svg+xml;base64,${(
          await readFile(join(process.cwd(), "public", avatarAssetPath(a.id)))
        ).toString("base64")}`,
      ],
    ),
  ),
);

/**
 * Gradient avatars, as inline styles, because Satori cannot read globals.css —
 * it takes no classNames and no stylesheet, only literal values.
 *
 * EVERY GRADIENT IN THE CATALOGUE MUST HAVE A ROW HERE. A missing row is not a
 * caught error: `avatarNode` falls through to a plain surface and the share
 * card renders at HTTP 200 with the avatar silently absent, which is precisely
 * the failure nobody reports. `og-card.test.ts` asserts this map covers the
 * catalogue exactly — in both directions, so an orphan row left behind by a
 * removed gradient is caught too.
 *
 * Satori's gradient interpolation is measurably not the browser's, so these
 * are verified by rendering, never by assuming they match the page.
 */
export const GRADIENT_AVATAR_BACKGROUND: Record<string, string> = {
  "avatar.grad.ember": "linear-gradient(145deg,#f5c518,#e5484d 55%,#3a0e13)",
  "avatar.grad.velvet": "linear-gradient(145deg,#3a0e13,#220a0e 60%,#0d0d10)",
  "avatar.grad.sepia": "linear-gradient(145deg,#d9a86c,#6b4a2a 55%,#2a1a10)",
  "avatar.grad.noir": "linear-gradient(145deg,#e8e8ec,#5a5a63 50%,#0d0d10)",
  "avatar.grad.technicolor": "linear-gradient(145deg,#ff4d4d,#ffd24d 45%,#4d9bff)",
  "avatar.grad.chroma": "linear-gradient(145deg,#2b6cff,#10203f 65%,#0d0d10)",
  "avatar.grad.popcorn": "linear-gradient(145deg,#ffe08a,#d9a02b 55%,#4a2f0b)",
  "avatar.grad.proscenium": "linear-gradient(145deg,#b0202e,#5a0f18 60%,#14070a)",
  "avatar.grad.matinee": "linear-gradient(145deg,#ffd0b0,#d98f6b 50%,#3a5a5e)",
  "avatar.grad.midnight": "linear-gradient(145deg,#3a4fa8,#16204a 60%,#08080f)",
  "avatar.grad.dusk": "linear-gradient(145deg,#ff8a3d,#a23c78 55%,#2a1038)",
  "avatar.grad.celluloid": "linear-gradient(145deg,#f0c07a,#a8763a 55%,#241608)",
  "avatar.grad.aurora": "linear-gradient(145deg,#35e0c0,#2f7fb8 50%,#4a2a8a)",
  "avatar.grad.ultraviolet": "linear-gradient(145deg,#a56bff,#3a1d6b 60%,#0d0d10)",
  "avatar.grad.nitrate": "linear-gradient(145deg,#c9ccd4,#7f7f8c 50%,#15151a)",
  "avatar.grad.cyan": "linear-gradient(145deg,#22e0ff,#0b2a2e 70%,#0d0d10)",
  "avatar.grad.magenta": "linear-gradient(145deg,#ff3ba7,#2a0b22 70%,#0d0d10)",
  "avatar.grad.toxic": "linear-gradient(145deg,#7cff4d,#122a10 70%,#0d0d10)",
};

/**
 * Absolute TMDB poster URL. Satori fetches server-side, so CORS never applies.
 *
 * PREFIX-ONLY, AND THAT IS THE SECURITY BOUNDARY. Never add a pass-through for
 * values that "already look like a URL": `list_movies.poster_path` is written
 * verbatim from the client (POST /api/lists validates tmdbId/title/elo/
 * comparisons/finalRank — never posterPath; see fullMovieRow in lists-api.ts)
 * and Satori fetches every `<img src>` from the app server. A pass-through
 * would let a stored `http://169.254.169.254/...` become an outbound request
 * from the server's network position on every OG render of that user's public
 * profile — SSRF and internal-reachability probing — with `data:` as a bonus
 * memory-pressure vector. Pinning the host means the worst a hostile value can
 * do is 404 on image.tmdb.org.
 *
 * Tests that need a network-free stub poster inject finished srcs through
 * `RenderProfileCardOptions.posterUrls` instead of coming through here.
 */
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
 * "..." rather than "…" is a CONSISTENCY choice, not a glyph workaround —
 * three periods are what the rest of the card copy uses. The vendored
 * assets/BebasNeue-Regular.ttf does cover U+2026: its cmap maps the codepoint
 * to gid 370, and loca/glyf give that gid a real 72-byte, 3-contour outline,
 * so "…" rasterises fine rather than as tofu. (Checked empirically against the
 * vendored file — do not "fix" a tofu bug here that does not exist. The
 * starter tagline "In a world…" reaches the profile card raw, and it renders.)
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
/**
 * A cache key for a card, derived from what the card actually draws.
 *
 * Next serves each `opengraph-image` file at a path carrying a BUILD hash that
 * is identical for every id in the segment — measured on two live lists, same
 * query string on both. Origin re-renders every time, but that is beside the
 * point: a platform that already holds the URL never asks again. Share a
 * ranking, reorder it, share it again, and the preview keeps the old podium
 * until an unrelated deploy changes the hash for everyone at once.
 *
 * Feeding this to `generateImageMetadata` as the image's `id` puts it in the
 * URL, so the address changes exactly when the picture changes — and stays put
 * when it does not, which matters because a key that churned on every request
 * would throw away the caching that makes previews fast.
 *
 * Pass the card's own inputs, not the record's timestamp: editing a
 * description should not invalidate a card that never showed one.
 */
export function cardFingerprint(parts: (string | number | null | undefined)[]): string {
  return hashString(parts.map((p) => String(p ?? "")).join("|")).toString(36);
}

/** One poster slot as laid out: which image, at what size. */
export interface PosterSlot {
  url: string | null;
  w: number;
  h: number;
}

/**
 * Where the three posters go and how big each is.
 *
 * Pulled out of the JSX so the ordering can be asserted directly. Checking it
 * through a rendered PNG would mean reading pixel columns, and a test that hard
 * to write is a test that stops being updated.
 */
export function posterRowLayout(
  posters: (string | null)[],
  podium: boolean,
): PosterSlot[] {
  const shown = posters.slice(0, 3);
  // Only a full podium can be reordered — two films have no middle, and
  // raising one of two implies a gap that is not there.
  const asPodium = podium && shown.length === 3;
  const ordered = asPodium ? podiumDisplayOrder(shown) : shown;
  return ordered.map((url, i) => ({
    url,
    // After reordering, the winner is the middle slot.
    w: asPodium && i === 1 ? 208 : 170,
    h: asPodium && i === 1 ? 312 : 255,
  }));
}

export function PosterRow({
  posters,
  podium = false,
}: {
  posters: (string | null)[];
  /**
   * Render as the page's podium rather than a flat row.
   *
   * WITHOUT THIS THE CARD AND THE PAGE DISAGREE ABOUT WHICH FILM IS FIRST. The
   * list page lays its podium out 2nd–1st–3rd (`podiumDisplayOrder`) with the
   * winner raised in the middle; a flat row is read left-to-right, so the same
   * three posters put a different film in the leftmost slot. Someone comparing
   * a link preview against the page it opens sees two different answers to
   * "who won", which is exactly the confusion this reconciles.
   *
   * OFF for the marquee card on purpose: those three posters are a puzzle, not
   * a ranking, and giving one of them a winner's plinth would assert an order
   * that card is deliberately not making a claim about.
   */
  podium?: boolean;
}) {
  const slots = posterRowLayout(posters, podium);
  if (slots.length === 0) return null;

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
      {slots.map(({ url, w, h }, i) => {
        return url ? (
          // next/image cannot be used here: Satori renders raw <img> and fetches
          // the bytes itself. alt is inert in a PNG but keeps the a11y rule honest.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt=""
            width={w}
            height={h}
            style={{ borderRadius: "8px", objectFit: "cover" }}
          />
        ) : (
          <div
            key={i}
            style={{
              display: "flex",
              width: `${w}px`,
              height: `${h}px`,
              borderRadius: "8px",
              backgroundColor: COLORS.surfaceRaised,
              border: `2px solid ${COLORS.surface}`,
            }}
          />
        );
      })}
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

// ---------------------------------------------------------------------------
// Profile card: puts a user's equipped cosmetics on the /u/[handle] OG image.
//
// This is the one card NOT built on top of OgCard. OgCard's shell paints a
// flat COLORS.bg behind everything; a cosmetic background has to paint
// full-bleed behind the avatar and headline instead, so this reimplements the
// shell (bulb strip, centered column, wordmark) with a background layer
// slotted in underneath.
//
// ANIMATED COSMETICS, STATIC CARD: every animated frame/overlay in the
// catalogue (frame.prism's hue-rotate spin, overlay.grain's jitter,
// overlay.vhs's rolling highlight, overlay.flicker's opacity pulse,
// overlay.dust's blinking scratches) is drawn at one representative frame
// with no @keyframes — this route returns a PNG. Grain and dust become a
// flat, noise-free tint rather than an attempt at texture: an SVG
// feTurbulence data-URI background is exactly the kind of thing that could
// rasterize to nothing, silently, the same failure mode this whole file is
// built to avoid.
// ---------------------------------------------------------------------------

/** Ring treatments around the avatar poster. Static equivalents of the `.cf-*` classes in globals.css. */
const FRAME_STYLE: Record<string, React.CSSProperties> = {
  "frame.brass": {
    background: "linear-gradient(145deg,#f0d488,#8a6b1f 45%,#e3c46b)",
    boxShadow: "0 0 0 2px #5c4512",
  },
  "frame.perforation": {
    backgroundColor: "#15151a",
    boxShadow: "0 0 0 3px #c9ccd4",
  },
  "frame.projector": {
    background: "linear-gradient(180deg,#fff3cd,#f5c518 40%,#9a6f06)",
    boxShadow: "0 0 22px 5px rgba(245,197,24,0.65)",
  },
  "frame.toxic": {
    backgroundColor: "#122a10",
    boxShadow: "0 0 0 2px #7cff4d, 0 0 14px 2px rgba(124,255,77,0.6)",
  },
  "frame.neon-cyan": {
    backgroundColor: "#0b2a2e",
    boxShadow: "0 0 0 2px #22e0ff, 0 0 14px 2px rgba(34,224,255,0.75)",
  },
  "frame.neon-magenta": {
    backgroundColor: "#2a0b22",
    boxShadow: "0 0 0 2px #ff3ba7, 0 0 16px 3px rgba(255,59,167,0.7)",
  },
  "frame.vhs": {
    backgroundColor: "#111111",
    boxShadow: "-3px 0 0 0 #ff2e63, 3px 0 0 0 #21d4fd, 0 0 0 1px #333333",
  },
  // Animated in the app (a spinning conic-gradient hue-rotate). Satori's
  // conic-gradient parser rejects this exact syntax outright — not a silent
  // blank, a thrown "Failed to parse declaration" that would 500 the whole
  // route — so the still frame is a linear sweep through the same stops
  // instead, which reads just as "prism" and is guaranteed to render.
  "frame.prism": {
    background: "linear-gradient(135deg,#ff3ba7,#f5c518,#7cff4d,#22e0ff,#9b5cff)",
    boxShadow: "0 0 16px 2px rgba(155,92,255,0.45)",
  },
};

/** Flat, noise-free stand-ins for the animated `.co-*` overlay classes. */
const OVERLAY_STYLE: Record<string, React.CSSProperties> = {
  "overlay.grain": { backgroundColor: "rgba(255,241,200,0.10)" },
  "overlay.dust": { backgroundColor: "rgba(255,255,255,0.05)" },
  "overlay.flicker": { backgroundColor: "rgba(255,241,200,0.30)" },
  // co-vhs's scanlines are already static in the app (only its ::after
  // highlight bar animates), so this one is a faithful still, not a stand-in.
  "overlay.vhs": {
    backgroundImage:
      "repeating-linear-gradient(180deg, rgba(0,0,0,0.34) 0px, rgba(0,0,0,0.34) 1px, transparent 1px, transparent 3px)",
  },
};

/**
 * Full-bleed treatment behind the avatar and headline. Static equivalents of
 * the `.cb-*` classes: `background.filmstrip` tiles the owner's OWN posters
 * (never stock art — same rule as the live canvas), `background.spotlight`
 * blurs one poster behind a beam and vignette, `background.velvet` is a flat
 * gradient with nothing to fetch. Anything unrecognised degrades to the
 * filmstrip treatment rather than rendering nothing.
 */
function ProfileBackground({
  backgroundId,
  posterUrls,
  avatarUrl,
}: {
  backgroundId: string;
  posterUrls: string[];
  avatarUrl: string | null;
}) {
  if (backgroundId === "background.spotlight" && avatarUrl) {
    return (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
        {/* Overscan on fixed pixel offsets, not a percentage inset — Satori's
            layout is more predictable with absolute lengths here. */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            right: "-100px",
            bottom: "-100px",
            display: "flex",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt=""
            width={1400}
            height={830}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5, filter: "blur(40px)" }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: "radial-gradient(ellipse 55% 70% at 50% 6%, rgba(245,197,24,0.34), transparent 68%)",
          }}
        />
        {/*
          DELIBERATELY NOT the same stops as `.cb-vignette` in globals.css, and
          the divergence is measured, not accidental. That class had to gain a
          real scrim because a browser follows the spec: `transparent 30%`
          leaves the centre — where the avatar, nameplate and tagline sit, and
          where the beam above ADDS light — genuinely clear, so a bright poster
          washed the page header out. Satori does not follow the spec here. It
          renders this same declaration close to opaque well inside the 30%
          stop: measured on this card under a pure-white full-bleed backdrop,
          the centre band comes out at 26/255 with this gradient and 134/255
          with it removed. The text is near-white (#ececf1), so 26/255 is
          already far past AA, and matching globals.css's heavier scrim here
          only flattened the centre-to-corner falloff from 2.1x to 1.2x — a
          flat panel where a spotlight is supposed to be. Left as-is on
          purpose; re-measure before touching it.
        */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(10,10,13,0.86) 100%)",
          }}
        />
      </div>
    );
  }

  if (backgroundId === "background.velvet") {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          background: "linear-gradient(180deg,#3a0e13 0%,#220a0e 55%,#170609 100%)",
        }}
      />
    );
  }

  // background.filmstrip (the starter) and anything unrecognised: the
  // owner's own posters, dimmed under a scrim, same treatment as a
  // brand-new profile with art but no drops yet.
  const tileWidth = posterUrls.length > 0 ? Math.ceil(OG_SIZE.width / posterUrls.length) : 0;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        backgroundColor: COLORS.bg,
      }}
    >
      {posterUrls.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "row",
            opacity: 0.3,
          }}
        >
          {posterUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" width={tileWidth} height={OG_SIZE.height} style={{ objectFit: "cover" }} />
          ))}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          background:
            "linear-gradient(180deg,#101014 0%,rgba(16,16,20,0.55) 40%,rgba(16,16,20,0.55) 60%,#101014 100%)",
        }}
      />
    </div>
  );
}

export interface RenderProfileCardOptions {
  handle: string;
  /** Numeric career level, e.g. 27. */
  level: number;
  /** The rank title for that level, e.g. "Cinephile" — gamification.ts's `levelFor(...).title`. */
  rank: string;
  /**
   * Frame/background/overlay must already be resolved to real catalogue ids —
   * this function does not fall back to a starter itself. Callers resolve via
   * `sanitizeEquipped` (this card's caller, /u/[handle], whose achievement
   * stats are RLS-limited) or `resolveEquipped` (a caller with the owner's own
   * full-access stats) — same split the rest of the cosmetics system uses.
   * `taglineText` is the pre-resolved snapshot; never a raw catalogue `.text`,
   * which for earned lines is a `{count}` template.
   */
  equipped: Required<Pick<Equipped, "frame" | "background" | "overlay">> &
    Pick<Equipped, "tagline" | "taglineText" | "avatarPosterPath" | "avatar">;
  /** The owner's own poster paths (raw TMDB paths), best first. Never stock art. */
  posterPaths: (string | null | undefined)[];
  /**
   * TEST-ONLY stub-injection hatch. Finished `<img src>` values, used verbatim
   * in place of mapping `posterPaths` through `posterUrl`, so a test can render
   * the card off a `data:` URI with no egress to image.tmdb.org.
   *
   * PRODUCTION CALLERS MUST NOT SET THIS. It exists only because `posterUrl` is
   * deliberately prefix-only (see its doc comment): pinning the TMDB host is
   * what stops a client-written `poster_path` turning a Satori `<img>` fetch
   * into server-side request forgery, and this parameter is the seam that lets
   * the tests keep working without reopening that hole in shipping code.
   */
  posterUrls?: string[];
}

function ProfileCard({
  handle,
  level,
  rank,
  equipped,
  posterPaths,
  posterUrls: posterUrlsOverride,
}: RenderProfileCardOptions) {
  const posterUrls = (
    posterUrlsOverride ?? posterPaths.map((p) => posterUrl(p)).filter((u): u is string => u !== null)
  ).slice(0, 6);
  // An explicit avatar pick wins; otherwise the best available poster, which is
  // the first entry of whichever source filled `posterUrls` above.
  const avatarUrl = posterUrl(equipped.avatarPosterPath) ?? posterUrls[0] ?? null;

  /**
   * Which of the three avatar kinds to draw. A gradient is a styled box rather
   * than an image, so this is a tagged union instead of just a URL — Satori has
   * no stylesheet to consult and cannot resolve a `.ca-*` class.
   */
  const avatarId = equipped.avatar ?? null;
  const generatedUri = avatarId ? GENERATED_AVATAR_URI.get(avatarId) : undefined;
  const gradientBackground = avatarId ? GRADIENT_AVATAR_BACKGROUND[avatarId] : undefined;
  const avatarArt: { kind: "image"; src: string } | { kind: "gradient"; background: string } | null =
    generatedUri
      ? { kind: "image", src: generatedUri }
      : gradientBackground
        ? { kind: "gradient", background: gradientBackground }
        : // A poster avatar, or the legacy pair from before the slot existed.
          avatarUrl && (avatarId === null || posterAvatarTmdbId(avatarId) !== null)
          ? { kind: "image", src: avatarUrl }
          : null;

  // `sanitizeEquipped`/`resolveEquipped` never actually leave these null at
  // runtime — the fallback here just satisfies the type they still carry
  // over from the wider `Equipped` shape (see its doc comment) — but the
  // starter ids are the correct thing to fall back to even if one did.
  const frameId = equipped.frame ?? "frame.brass";
  const backgroundId = equipped.background ?? "background.filmstrip";
  const overlayId = equipped.overlay ?? "overlay.none";

  const frameStyle = FRAME_STYLE[frameId] ?? FRAME_STYLE["frame.brass"];
  // The one place this card asks the catalogue anything, since every other
  // visual treatment keys off the id string directly: a legendary frame
  // (today, only the challenge-gated frame.prism) earns an extra gold glow.
  const legendaryFrame = itemById(frameId)?.rarity === "legendary";
  const frameBoxShadow = legendaryFrame
    ? [frameStyle.boxShadow, "0 0 30px 6px rgba(245,197,24,0.35)"].filter(Boolean).join(", ")
    : frameStyle.boxShadow;
  const overlayStyle = OVERLAY_STYLE[overlayId];
  const taglineText = equipped.taglineText;
  const handleLine = clampHeadline(`@${handle.toUpperCase()}`);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.bg,
      }}
    >
      <ProfileBackground backgroundId={backgroundId} posterUrls={posterUrls} avatarUrl={avatarUrl} />

      <div
        style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%" }}
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
            paddingTop: "18px",
            paddingBottom: "20px",
          }}
        >
          {avatarArt && (
            <div
              style={{
                display: "flex",
                padding: "6px",
                borderRadius: "12px",
                ...frameStyle,
                boxShadow: frameBoxShadow,
              }}
            >
              {/* Poster-shaped, 2:3 — never circular. A round crop cuts off the poster's title. */}
              {avatarArt.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarArt.src} alt="" width={150} height={225} style={{ borderRadius: "8px", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: "150px",
                    height: "225px",
                    borderRadius: "8px",
                    backgroundImage: avatarArt.background,
                  }}
                />
              )}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: avatarArt ? "18px" : "0",
              fontSize: "23px",
              letterSpacing: "0.34em",
              color: COLORS.muted,
            }}
          >
            {`LEVEL ${level} · ${rank.toUpperCase()}`}
          </div>
          <div
            style={{
              display: "flex",
              textAlign: "center",
              maxWidth: "1040px",
              marginTop: "8px",
              fontSize: `${headlineSize(handleLine)}px`,
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: COLORS.gold,
            }}
          >
            {handleLine}
          </div>
          {taglineText ? (
            <div
              style={{
                display: "flex",
                textAlign: "center",
                maxWidth: "900px",
                marginTop: "14px",
                fontSize: "27px",
                letterSpacing: "0.04em",
                color: COLORS.text,
              }}
            >
              {/* Straight quotes only — Bebas covers " and ' but not curly “ ”. */}
              {`"${taglineText}"`}
            </div>
          ) : null}
          <div style={{ display: "flex", marginTop: "22px" }}>
            <Wordmark />
          </div>
        </div>
      </div>

      {overlayStyle && (
        <div
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", ...overlayStyle }}
        />
      )}
    </div>
  );
}

/**
 * Renders the /u/[handle] share card and returns finished PNG bytes.
 *
 * Returns raw bytes rather than a `Response`/`ImageResponse` so callers can
 * decide how to ship it: the opengraph-image route wraps it in a `Response`,
 * and tests decode the pixels directly.
 */
export async function renderProfileCard(options: RenderProfileCardOptions): Promise<Buffer> {
  const res = new ImageResponse(<ProfileCard {...options} />, OG_RESPONSE_OPTIONS);
  return Buffer.from(await res.arrayBuffer());
}
