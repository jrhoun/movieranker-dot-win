import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import { beforeAll, describe, expect, it } from "vitest";
import { itemsForSlot } from "./cosmetics/catalogue";
import {
  COLORS,
  GRADIENT_AVATAR_BACKGROUND,
  OG_RESPONSE_OPTIONS,
  OG_SIZE,
  OgCard,
  PosterRow,
  clampHeadline,
  headlineSize,
  posterUrl,
  renderProfileCard,
} from "./og-card";

/**
 * Satori's failure mode is a BLANK PNG returned with HTTP 200 — not an
 * exception. Nothing else in the toolchain catches it: types pass, the build
 * passes, the route 200s, and the card is empty in every feed that renders it.
 *
 * So these tests rasterise each card and inspect the PIXELS. File size looked
 * like an easier proxy and is not one: resvg leaves a flat 1200x630 fill at
 * ~16KB, close enough to a real card's ~45KB that any threshold is either
 * porous or flaky. Decoding is only a zlib inflate plus PNG's five scanline
 * filters, and it answers the question exactly — a blank card has one or two
 * distinct colours, a card with type on it has hundreds of antialiased ones.
 *
 * The PNGs are also written to .og-preview/ so a human can look at them, which
 * is still the only way to catch "renders, but ugly".
 */

const OUT_DIR = join(process.cwd(), ".og-preview");

/**
 * A 1x1 PNG. Exercises the <img> path with no network dependency.
 *
 * Reaches the card through `renderProfileCard`'s test-only `posterUrls`
 * option, NOT through `posterUrl` — that function is deliberately prefix-only
 * so a client-written `poster_path` cannot aim a server-side Satori fetch
 * anywhere it likes (see the SSRF test below).
 */
const STUB_POSTER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * A poster-shaped sheet of pure white: the worst case for any scrim, since it
 * fills the card with #ffffff behind the type. STUB_POSTER above is a
 * transparent 1x1 and cannot exercise that at all.
 *
 * 200x300 rather than 1x1, deliberately: the spotlight background blurs its
 * poster by 40px, and a 1x1 source blurs away to literally nothing (verified —
 * the card came out identical with and without it). SVG rather than a base64
 * PNG only because 200x300 of white is unreadable as base64; an `<img src>`
 * SVG data URI is rasterised fine by resvg here (unlike the feTurbulence
 * `background-image` trick og-card.tsx warns about).
 */
const BRIGHT_POSTER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><rect width='200' height='300' fill='%23ffffff'/></svg>";

async function render(name: string, element: React.ReactElement): Promise<Buffer> {
  const res = new ImageResponse(element, OG_RESPONSE_OPTIONS);
  expect(res.status, `${name} should render 200`).toBe(200);
  const png = Buffer.from(await res.arrayBuffer());
  await writeFile(join(OUT_DIR, `${name}.png`), png);
  return png;
}

/**
 * Minimal 8-bit RGBA PNG decoder — enough for what resvg emits. Undoes the
 * per-scanline filter (PNG spec 9.2) and returns the raw pixels.
 */
function decodePng(png: Buffer): { width: number; height: number; pixels: Buffer } {
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("not a PNG");
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const bitDepth = png.readUInt8(24);
  const colorType = png.readUInt8(25);
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`expected 8-bit RGBA, got depth ${bitDepth} type ${colorType}`);
  }

  const idat: Buffer[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") idat.push(png.subarray(offset + 8, offset + 8 + length));
    if (type === "IEND") break;
    offset += 12 + length; // length + type + data + crc
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? pixels[y * stride + x - bpp] : 0; // left
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0; // up
      const c = x >= bpp && y > 0 ? pixels[(y - 1) * stride + x - bpp] : 0; // up-left
      let value: number;
      switch (filter) {
        case 0: value = line[x]; break;
        case 1: value = line[x] + a; break;
        case 2: value = line[x] + b; break;
        case 3: value = line[x] + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`unknown PNG filter ${filter} on row ${y}`);
      }
      pixels[y * stride + x] = value & 0xff;
    }
  }
  return { width, height, pixels };
}

/** How many distinct RGB colours the image contains, and how much is not background. */
function inspect(png: Buffer) {
  const { width, height, pixels } = decodePng(png);
  const colors = new Set<number>();
  let offBackground = 0;
  const bg = parseInt(COLORS.bg.slice(1), 16);
  for (let i = 0; i < pixels.length; i += 4) {
    const rgb = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    colors.add(rgb);
    if (rgb !== bg) offBackground++;
  }
  return { width, height, colors: colors.size, inkFraction: offBackground / (width * height) };
}

/**
 * The packed RGB int at one pixel. `colors > 32` / `inkFraction > 0.02` prove
 * a card isn't blank overall, but they say nothing about any one region —
 * ~38k pixels of antialiased avatar + frame + Bebas text alone clears both,
 * so a single full-bleed layer (a background, an overlay) painting nothing
 * would still pass. This is for the sharper question: did THIS specific
 * layer paint, sampled somewhere only it could have reached.
 */
function pixelRgb(png: Buffer, x: number, y: number): number {
  const { width, pixels } = decodePng(png);
  const i = (y * width + x) * 4;
  return (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
}

/**
 * Top edge of the avatar box on a profile card, measured from a render rather
 * than derived from the layout: the marquee strip, padding and frame inset all
 * contribute, and a sample taken outside the box would silently measure the
 * card's background instead of the avatar.
 */
const AVATAR_TOP_Y = 113;

beforeAll(async () => {
  await mkdir(OUT_DIR, { recursive: true });
});

/** Every card must be a real 1200x630 PNG with actual content drawn on it. */
async function expectRealCard(name: string, element: React.ReactElement) {
  const png = await render(name, element);
  const { width, height, colors, inkFraction } = inspect(png);
  expect({ width, height }).toEqual({ width: OG_SIZE.width, height: OG_SIZE.height });
  // A blank card is one flat colour; antialiased type produces hundreds.
  expect(colors, `${name} has only ${colors} distinct colours — it rendered blank`).toBeGreaterThan(
    32,
  );
  // And the content must cover real area, not be one stray glyph in a corner.
  expect(
    inkFraction,
    `${name} covers only ${(inkFraction * 100).toFixed(2)}% of the card`,
  ).toBeGreaterThan(0.02);
}

describe("headlineSize", () => {
  it("shrinks as the headline grows, so long titles still fit", () => {
    const sizes = [
      headlineSize("MOVIERANKER"),
      headlineSize("WHAT CONNECTS THESE?"),
      headlineSize("THE GREATEST HEIST MOVIES EVER MADE"),
      headlineSize("A LIST TITLE LONG ENOUGH TO NEED TWO LINES ON THE CARD"),
    ];
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(sizes.at(-1)).toBeGreaterThan(40);
  });
});

describe("clampHeadline", () => {
  it("leaves a normal title alone", () => {
    expect(clampHeadline("THE GREATEST HEIST MOVIES EVER MADE")).toBe(
      "THE GREATEST HEIST MOVIES EVER MADE",
    );
  });

  it("truncates an unbounded title, since the API does not cap list titles", () => {
    const clamped = clampHeadline("A".repeat(400));
    expect(clamped).toHaveLength(118);
    expect(clamped.endsWith("...")).toBe(true);
  });
});

describe("posterUrl", () => {
  it("builds an absolute TMDB url, since Satori fetches server-side", () => {
    expect(posterUrl("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("returns null for missing art rather than a broken url", () => {
    expect(posterUrl(null)).toBeNull();
    expect(posterUrl(undefined)).toBeNull();
    expect(posterUrl("")).toBeNull();
  });

  it("pins the TMDB host even when poster_path already looks like a URL (SSRF)", () => {
    // REGRESSION GUARD, and the reason this file no longer has a pass-through.
    //
    // list_movies.poster_path is written verbatim from the client — POST
    // /api/lists validates tmdbId, title, elo, comparisons and finalRank, and
    // nothing at all about posterPath (see fullMovieRow in lists-api.ts) — and
    // Satori fetches every <img src> from the app server. An earlier revision
    // returned any value starting with "http" or "data:" untouched, which
    // meant a user could store `poster_path: "http://169.254.169.254/..."` and
    // have the server issue that GET on every OG render of their public
    // profile: arbitrary outbound requests from the server's network position,
    // internal-reachability probing, and data: URIs as a memory vector.
    //
    // Prefixing unconditionally means the worst a hostile value achieves is a
    // 404 on image.tmdb.org. Do not "restore" the pass-through; tests that need
    // a network-free stub use renderProfileCard's `posterUrls` option instead.
    for (const hostile of [
      "http://169.254.169.254/latest/meta-data/",
      "https://attacker.example/beacon.png",
      "data:image/png;base64,AAAA",
    ]) {
      expect(posterUrl(hostile)).toBe(`https://image.tmdb.org/t/p/w342${hostile}`);
      expect(
        posterUrl(hostile)?.startsWith("https://image.tmdb.org/t/p/w342"),
        `${hostile} escaped the TMDB host`,
      ).toBe(true);
    }
  });
});

describe("card rendering", () => {
  it("renders the homepage card", async () => {
    await expectRealCard(
      "home",
      h(OgCard, {
        eyebrow: "FOR PEOPLE WHO LOVE LISTS AND CINEMA",
        headline: "MOVIERANKER",
        subline: "RANK MOVIES HEAD-TO-HEAD, SOLO OR WITH FRIENDS",
      }),
    );
  });

  it("renders the marquee card, posters and all", async () => {
    await expectRealCard(
      "marquee",
      h(OgCard, {
        eyebrow: "WEEKLY MARQUEE · No 4",
        headline: "WHAT CONNECTS THESE?",
        subline: "ONE THREAD RUNS THROUGH ALL 12",
        children: h(PosterRow, { posters: [STUB_POSTER, STUB_POSTER, STUB_POSTER] }),
      }),
    );
  });

  it("renders the personal list card", async () => {
    await expectRealCard(
      "personal",
      h(OgCard, {
        eyebrow: "RANKED BY @JRHOUN",
        headline: "THE GREATEST HEIST MOVIES EVER MADE",
        subline: "12 FILMS RANKED HEAD-TO-HEAD",
        children: h(PosterRow, { posters: [STUB_POSTER, STUB_POSTER, STUB_POSTER] }),
      }),
    );
  });

  it("renders the versus card", async () => {
    await expectRealCard(
      "versus",
      h(OgCard, {
        eyebrow: "VERSUS",
        headline: "87%",
        headlineSizePx: 176,
        subline: "AGREEMENT · KINDRED SPIRITS",
        children: h(
          "div",
          { style: { display: "flex", fontSize: "27px", color: COLORS.muted } },
          "MY TOP 20 vs DAD'S TOP 20",
        ),
      }),
    );
  });

  it("renders the fallback card for a missing or private list", async () => {
    await expectRealCard(
      "fallback",
      h(OgCard, {
        eyebrow: "FOR PEOPLE WHO LOVE LISTS AND CINEMA",
        headline: "MOVIERANKER",
        subline: "RANK MOVIES HEAD-TO-HEAD, SOLO OR WITH FRIENDS",
      }),
    );
  });

  it("survives a list with no poster art at all", async () => {
    // A brand-new list can have every poster_path null. The placeholder blocks
    // must still render rather than collapsing the row to nothing.
    await expectRealCard(
      "no-posters",
      h(OgCard, {
        eyebrow: "RANKED ON MOVIERANKER",
        headline: "OBSCURE FILMS WITH NO ART",
        subline: "3 FILMS RANKED HEAD-TO-HEAD",
        children: h(PosterRow, { posters: [null, null, null] }),
      }),
    );
  });

  it("renders the versus card when the two lists share no films", async () => {
    await expectRealCard(
      "versus-no-overlap",
      h(OgCard, {
        eyebrow: "VERSUS",
        headline: "NO OVERLAP",
        headlineSizePx: 96,
        subline: "THESE TWO LISTS SHARE NO FILMS",
        children: h(
          "div",
          { style: { display: "flex", fontSize: "27px", color: COLORS.muted } },
          "MY TOP 20 vs A STRANGER'S TOP 20",
        ),
      }),
    );
  });

  it("keeps the wordmark on the card when a title is absurdly long", async () => {
    // List titles are not capped server-side. Before clampHeadline this pushed
    // the wordmark off the bottom edge — silently, at HTTP 200.
    await expectRealCard(
      "absurd-title",
      h(OgCard, {
        eyebrow: "RANKED ON MOVIERANKER",
        headline:
          "THE DEFINITIVE AND COMPLETELY EXHAUSTIVE RANKING OF EVERY SINGLE MOTION PICTURE EVER COMMITTED TO CELLULOID BY ANY STUDIO ANYWHERE IN THE WORLD SINCE EIGHTEEN NINETY FIVE INCLUDING SHORTS",
        subline: "900 FILMS RANKED HEAD-TO-HEAD",
        children: h(PosterRow, { posters: [STUB_POSTER, STUB_POSTER, STUB_POSTER] }),
      }),
    );
  });

  it("survives a headline long enough to wrap", async () => {
    await expectRealCard(
      "long-title",
      h(OgCard, {
        eyebrow: "RANKED BY @SOMEONE",
        headline: "A LIST TITLE LONG ENOUGH THAT IT HAS TO WRAP ONTO A SECOND LINE",
        subline: "40 FILMS RANKED HEAD-TO-HEAD",
        children: h(PosterRow, { posters: [STUB_POSTER, STUB_POSTER, STUB_POSTER] }),
      }),
    );
  });

  it("renders a profile card with the equipped cosmetics", async () => {
    // renderProfileCard returns raw PNG bytes directly rather than a React
    // element for the render()/expectRealCard() helpers above, so its own
    // pixels are inspected here without going through render().
    //
    // The one deliberately networked test in this file, and the ONLY caller
    // below that passes `posterPaths`: a real TMDB poster_path, exercised
    // end-to-end through posterUrl()'s CDN prefixing. Every other profile-card
    // test injects finished srcs via the test-only `posterUrls` option so it
    // does NOT depend on egress to image.tmdb.org — posterUrl itself is
    // prefix-only now and would mangle a data: URI into an unfetchable
    // image.tmdb.org URL.
    const png = await renderProfileCard({
      handle: "jrhoun",
      level: 27,
      rank: "Cinephile",
      equipped: {
        frame: "frame.neon-cyan",
        background: "background.velvet",
        overlay: "overlay.grain",
        tagline: "tagline.80s.rewind",
        taglineText: "Please rewind before returning.",
      },
      posterPaths: ["/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"],
    });
    expect(png.subarray(0, 8).toString("hex"), "profile card should be a PNG").toBe("89504e470d0a1a0a");
    await writeFile(join(OUT_DIR, "profile.png"), png);

    // Byte size is not a usable proxy: resvg emits a flat fill at ~16KB and a
    // real card at ~45KB, and Satori fails silently with a blank PNG at HTTP
    // 200. So this decodes pixels, same as every other card above.
    const { width, height, colors, inkFraction } = inspect(png);
    expect({ width, height }).toEqual({ width: OG_SIZE.width, height: OG_SIZE.height });
    expect(colors, `profile card has only ${colors} distinct colours — it rendered blank`).toBeGreaterThan(32);
    expect(
      inkFraction,
      `profile card covers only ${(inkFraction * 100).toFixed(2)}% of the card`,
    ).toBeGreaterThan(0.02);
  });
});

describe("profile card renders every catalogue frame, background and overlay", () => {
  // A cosmetic can carry CSS Satori rejects outright, not just CSS it quietly
  // ignores. frame.prism's conic-gradient threw "Failed to parse
  // declaration" during development — a 500, not the usual silent blank
  // PNG this file otherwise guards against. Rendering every catalogue id
  // here (not just the one combination above) is what stops a newly added
  // frame, background or overlay shipping unrenderable; new catalogue
  // entries are covered automatically since these loop itemsForSlot rather
  // than listing ids by hand.
  //
  // STUB_POSTER through the test-only `posterUrls` hatch, not a real TMDB
  // path: the one networked case lives in the test above this describe block;
  // these 13+ don't need egress to render something meaningful, so they don't
  // take a network dependency.
  const posterUrls = [STUB_POSTER];

  async function expectRealProfileCard(name: string, equipped: Parameters<typeof renderProfileCard>[0]["equipped"]) {
    const png = await renderProfileCard({
      handle: "jrhoun",
      level: 27,
      rank: "Cinephile",
      equipped,
      posterPaths: [],
      posterUrls,
    });
    // Written out so a human can eyeball every catalogue treatment, not just
    // the one `profile.png` combination above — "renders, but illegible" is
    // still only catchable by looking.
    await writeFile(join(OUT_DIR, `${name}.png`), png);
    const { colors, inkFraction } = inspect(png);
    expect(colors, `${name} has only ${colors} distinct colours — it rendered blank`).toBeGreaterThan(32);
    expect(inkFraction, `${name} covers only ${(inkFraction * 100).toFixed(2)}% of the card`).toBeGreaterThan(0.02);
  }

  for (const frame of itemsForSlot("frame")) {
    it(`renders with ${frame.id}`, async () => {
      await expectRealProfileCard(frame.id, {
        frame: frame.id,
        background: "background.filmstrip",
        overlay: "overlay.none",
      });
    });
  }

  for (const background of itemsForSlot("background")) {
    it(`renders with ${background.id}`, async () => {
      await expectRealProfileCard(background.id, {
        frame: "frame.brass",
        background: background.id,
        overlay: "overlay.none",
      });
    });
  }

  // overlay.none has no OVERLAY_STYLE entry and paints nothing on its own —
  // fine, since the card as a whole is still real (avatar/frame/text). Every
  // *other* overlay carries real CSS a future addition could get wrong the
  // same way frame.prism did (overlay.vhs is the one with a gradient today).
  for (const overlay of itemsForSlot("overlay")) {
    it(`renders with ${overlay.id}`, async () => {
      await expectRealProfileCard(overlay.id, {
        frame: "frame.brass",
        background: "background.filmstrip",
        overlay: overlay.id,
      });
    });
  }
});

describe("profile card background treatments actually paint a full-bleed layer", () => {
  // Why the suite above doesn't already prove this: the avatar + frame ring
  // + Bebas text alone is ~38k antialiased pixels, comfortably clearing
  // `colors > 32` / `inkFraction > 0.02` on their own. A full-bleed
  // background `<div>` that silently fails to size — exactly the `inset: 0`
  // bug this file hit once (see the report for task 10) — would leave those
  // thresholds untouched while painting nothing. So instead of the
  // aggregate thresholds, these sample ONE pixel at the padded content
  // column's left edge (x=24, inside the 56px left padding, so never
  // reachable by the centered avatar/eyebrow/headline/tagline/wordmark) and
  // assert it is not the flat COLORS.bg the ProfileCard root would show
  // through if the background layer painted nothing.
  const CORNER_X = 24;
  const CORNER_Y = 300; // vertical middle; well below the 36px marquee-bulb strip
  const bg = parseInt(COLORS.bg.slice(1), 16);

  it("background.velvet paints a visible gradient, not the flat root colour", async () => {
    const png = await renderProfileCard({
      handle: "jrhoun",
      level: 27,
      rank: "Cinephile",
      equipped: { frame: "frame.brass", background: "background.velvet", overlay: "overlay.none" },
      posterPaths: [], // no avatar, no poster art — velvet doesn't need either, so this is the leanest case
    });
    expect(
      pixelRgb(png, CORNER_X, CORNER_Y),
      "sampled pixel matches the flat root colour — the velvet layer painted nothing",
    ).not.toBe(bg);
  });

  it("background.spotlight paints a visible treatment, not the flat root colour", async () => {
    // Unlike velvet, spotlight only activates when an avatar is resolvable
    // (ProfileBackground falls through to the filmstrip treatment
    // otherwise) — so this needs a poster, not an empty posterPaths.
    const png = await renderProfileCard({
      handle: "jrhoun",
      level: 27,
      rank: "Cinephile",
      equipped: { frame: "frame.brass", background: "background.spotlight", overlay: "overlay.none" },
      posterPaths: [],
      posterUrls: [STUB_POSTER],
    });
    expect(
      pixelRgb(png, CORNER_X, CORNER_Y),
      "sampled pixel matches the flat root colour — the spotlight layer painted nothing",
    ).not.toBe(bg);
  });

  it("background.filmstrip paints the scrim, not the flat root colour", async () => {
    // No posters, same as the velvet case above — deliberately. With a
    // poster present, its own tiled <img> alone produces enough of a signal
    // to pass this assertion even if the scrim div specifically failed to
    // paint (verified empirically: reverting *only* the scrim div back to
    // `inset: 0` while leaving the poster row intact still passed a version
    // of this test that supplied a poster). The scrim is a flat, no-children
    // div — exactly the shape that silently collapses under `inset: 0` — so
    // isolating it means giving it nothing else to hide behind.
    const png = await renderProfileCard({
      handle: "jrhoun",
      level: 27,
      rank: "Cinephile",
      equipped: { frame: "frame.brass", background: "background.filmstrip", overlay: "overlay.none" },
      posterPaths: [],
    });
    expect(
      pixelRgb(png, CORNER_X, CORNER_Y),
      "sampled pixel matches the flat root colour — the filmstrip scrim painted nothing",
    ).not.toBe(bg);
  });
});

/** Mean colour of a rectangle, as [r,g,b]. */
function meanRgb(png: Buffer, x0: number, y0: number, x1: number, y1: number): [number, number, number] {
  const { width, pixels } = decodePng(png);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      n++;
    }
  }
  return [r / n, g / n, b / n];
}

/** WCAG 2.x relative luminance / contrast ratio, for sRGB 0-255 triples. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("background.spotlight stays legible over a bright poster", () => {
  // The failure guarded here is not a blank card — it is a card that renders
  // perfectly and cannot be read. The spotlight treatment blurs the user's own
  // poster full-bleed and lays a beam over it, and its vignette is
  // `transparent 30%` at the centre: on paper, fully clear exactly where the
  // avatar, nameplate and tagline sit.
  //
  // HONEST SCOPE: this test passes against today's card and would also have
  // passed before the spotlight work — it is a GUARD, not a regression repro.
  // The equivalent CSS on the live page (`.cb-vignette`) really does wash out
  // over a bright poster, but Satori renders the same declaration near-opaque
  // well inside the 30% stop, so the OG centre measures ~26/255 under a
  // pure-white backdrop (~134/255 with the gradient removed) — comfortably
  // legible already. What this catches is someone lightening the vignette to
  // "match the page", or Satori fixing its gradient interpolation in a version
  // bump, either of which would silently make the card unreadable.
  //
  // Every other test in this file uses a transparent 1x1 stub, which scales to
  // nothing and can never exercise this at all. BRIGHT_POSTER is the worst
  // case: a flat white sheet under the whole card. It must stay large enough
  // to survive the 40px blur — a 1x1 source blurs away to nothing and quietly
  // turns this back into a test of an empty backdrop.
  const TAGLINE_TEXT_RGB: [number, number, number] = [0xec, 0xec, 0xf1];

  it("draws each of the three avatar kinds, and draws them differently", async () => {
    // NOT an inkFraction/colours check. The card already contains posters, a
    // frame and Bebas type, so "more than 32 colours" passes whether or not
    // the avatar painted a single pixel — it would measure the rest of the
    // card. The sharper question is whether swapping ONLY the avatar id
    // changes the output, which is false exactly when a kind fails to render.
    // No avatarPosterPath: that would go through `posterUrl` and make Satori
    // fetch image.tmdb.org for real. The poster kind draws posterUrls[0]
    // instead, which is the network-free stub.
    const draw = async (name: string, avatar: string | undefined) => {
      const png = await renderProfileCard({
        handle: "jrhoun",
        level: 27,
        rank: "Cinephile",
        equipped: {
          frame: "frame.brass",
          background: "background.velvet",
          overlay: "overlay.none",
          avatar,
        },
        posterPaths: [],
        posterUrls: [STUB_POSTER],
      });
      // Written out because "rendered, but wrong" is only catchable by looking
      // — and Satori's gradient interpolation is measurably not the browser's.
      await writeFile(join(OUT_DIR, `${name}.png`), png);
      return png;
    };

    const kinds: Record<string, string> = {
      "avatar-generated": "avatar.gen.lorelei-reel",
      "avatar-gradient": "avatar.grad.ember",
      "avatar-poster": "avatar.poster.155",
    };
    const rendered = new Map<string, Buffer>();
    for (const [name, avatar] of Object.entries(kinds)) {
      rendered.set(name, await draw(name, avatar));
    }

    // THE LOAD-BEARING COMPARISON. Pairwise difference alone is not enough:
    // an avatar kind that fails to render draws NOTHING, and "nothing" is
    // still different from the other two, so a broken kind slips through. This
    // baseline is a card whose avatar id resolves to no art at all — every
    // real kind must differ from it, which is false exactly when that kind
    // silently rendered nothing. (Verified by mutation: skipping the generated
    // branch passes the pairwise check and fails this one.)
    const blank = await draw("avatar-unrenderable", "avatar.gen.does-not-exist");
    for (const [name, png] of rendered) {
      expect(
        png.equals(blank),
        `${name} is identical to a card with no avatar — that kind rendered nothing`,
      ).toBe(false);
    }

    const names = [...rendered.keys()];
    for (const a of names) {
      for (const b of names) {
        if (a >= b) continue;
        expect(
          rendered.get(a)!.equals(rendered.get(b)!),
          `${a} and ${b} produced byte-identical cards — two kinds drew the same thing`,
        ).toBe(false);
      }
    }

    // Omitting the slot entirely must still draw the poster, because profiles
    // written before the avatar slot existed carry only avatarPosterPath /
    // avatarTmdbId. Identical to the poster kind is the CORRECT result here,
    // and asserting it keeps that legacy path from being dropped silently.
    expect(
      (await draw("avatar-legacy", undefined)).equals(rendered.get("avatar-poster")!),
      "omitting the avatar slot no longer falls back to the stored poster",
    ).toBe(true);
  });

  it("renders a gradient avatar as a gradient, not a flat block", async () => {
    // Satori has no stylesheet, so a gradient avatar is an inline
    // backgroundImage. If that string is ever wrong, Satori does not throw —
    // it paints nothing and the frame wraps an empty box. Sampling two points
    // down the avatar's own vertical axis catches both that and a gradient
    // that collapsed to one flat colour.
    const png = await renderProfileCard({
      handle: "jrhoun",
      level: 27,
      rank: "Cinephile",
      equipped: {
        frame: "frame.brass",
        background: "background.velvet",
        overlay: "overlay.none",
        avatar: "avatar.grad.ember",
      },
      posterPaths: [],
      posterUrls: [STUB_POSTER],
    });
    await writeFile(join(OUT_DIR, "avatar-gradient-only.png"), png);

    const top = pixelRgb(png, 600, AVATAR_TOP_Y + 20);
    const bottom = pixelRgb(png, 600, AVATAR_TOP_Y + 190);
    expect(
      top,
      "the gradient avatar's top and bottom sample the same colour — it rendered flat or not at all",
    ).not.toBe(bottom);
  });

  it("holds AA contrast for the tagline against a pure-white poster", async () => {
    const png = await renderProfileCard({
      handle: "jrhoun",
      level: 27,
      rank: "Cinephile",
      equipped: {
        frame: "frame.brass",
        background: "background.spotlight",
        overlay: "overlay.none",
        tagline: "tagline.trailer.in-a-world",
        // The starter tagline every user owns, and a live check that Bebas
        // renders U+2026 rather than tofu (it does — cmap gid 370 has a real
        // 3-contour outline; see clampHeadline's note in og-card.tsx).
        taglineText: "In a world…",
      },
      posterPaths: [],
      posterUrls: [BRIGHT_POSTER],
    });
    await writeFile(join(OUT_DIR, "spotlight-bright.png"), png);

    // Sampled at the tagline's own vertical band but well left of the glyphs,
    // so this measures the FIELD the type sits on, not the type.
    const field = meanRgb(png, 180, 470, 380, 525);
    const ratio = contrastRatio(field, TAGLINE_TEXT_RGB);
    expect(
      ratio,
      `tagline contrast is only ${ratio.toFixed(2)}:1 against rgb(${field.map((c) => Math.round(c)).join(",")}) — the spotlight scrim is too weak`,
    ).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * The share card cannot fail loudly. Satori renders an unknown id as nothing
 * and still returns HTTP 200, so a gradient added to the catalogue without a
 * row in og-card's literal map produces a card with no avatar and no error
 * anywhere — exactly the class of bug that only surfaces when someone posts
 * their profile and it looks broken.
 *
 * Asserted in BOTH directions on purpose: the forward check catches a new
 * gradient nobody wired up here, and the reverse catches an orphan row left
 * behind by a removed one, which would otherwise sit here looking
 * authoritative while matching nothing.
 */
describe("gradient avatars reach the share card", () => {
  const gradientIds = itemsForSlot("avatar")
    .filter((a) => a.id.startsWith("avatar.grad."))
    .map((a) => a.id);

  it("covers every gradient avatar in the catalogue", () => {
    expect(gradientIds.length).toBeGreaterThan(0);
    for (const id of gradientIds) {
      expect(
        GRADIENT_AVATAR_BACKGROUND[id],
        `${id} has no row in og-card's GRADIENT_AVATAR_BACKGROUND, so it renders as a blank avatar on the share card`,
      ).toBeTruthy();
    }
  });

  it("has no row for an id the catalogue no longer carries", () => {
    for (const id of Object.keys(GRADIENT_AVATAR_BACKGROUND)) {
      expect(gradientIds, `${id} is in og-card but not in the catalogue`).toContain(id);
    }
  });

  it("states each gradient as literal values Satori can read", () => {
    // A className or a CSS variable here renders as nothing at all. Every row
    // must be a literal gradient function with literal hex stops.
    for (const value of Object.values(GRADIENT_AVATAR_BACKGROUND)) {
      expect(value).toMatch(/^linear-gradient\(/);
      expect(value).not.toMatch(/var\(|currentColor/);
      expect(value).toMatch(/#[0-9a-f]{6}/i);
    }
  });
});
