import { OVERLAY_CLASS } from "@/lib/cosmetics/classes";
import type { Equipped } from "@/lib/cosmetics/equipped";

const POSTER = "https://image.tmdb.org/t/p/w342";

/**
 * The equipped background, painted behind a WHOLE PAGE rather than inside a
 * card — the "break the wall" of a customised profile: the room is yours, not
 * just a box in it.
 *
 * CONTRACT (other components build against this; keep the signature):
 *   <ProfileBackdrop equipped={equipped} posters={posters} variant="page" />
 *   - variant "page": fixed, full-viewport, behind all content.
 *   - variant "preview": absolutely positioned, fills its `relative` parent
 *     (the dressing room's live preview).
 * Composes ONLY the user's own poster art (never stock imagery — DESIGN.md),
 * plus scrims that keep body text legible over it. Every animated treatment
 * must be static under prefers-reduced-motion.
 *
 * FOUR INVARIANTS EVERY COMPOSITION HERE HOLDS, and the reasons they are
 * invariants rather than preferences:
 *
 * 1. IT SURVIVES AN EMPTY `posters`. A brand-new profile has no art at all,
 *    and every one of these rooms is offered to it. So the poster layer is
 *    always conditional and never the thing that makes the composition read —
 *    remove the art from any branch below and a deliberate treatment is still
 *    on screen, never a blank viewport.
 * 2. POSTER ART IS A BACKGROUND, NOT AN `<img>`. Every one of these layers is
 *    decorative, and a poster that 404s or times out must vanish rather than
 *    leave a broken-image glyph — which is exactly what an `<img>` does, and
 *    what two flaky TMDB fetches did to the poster wall during review: two
 *    bright empty slivers in the grid. A `background-image` that fails paints
 *    nothing at all. `cover` also frees these layouts from the 2:3 ratio where
 *    a tile wants a different one.
 * 3. IT ENDS IN A SCRIM. The page's own text sits directly on this, so each
 *    branch finishes with a scrim layer over the art, and the poster layers are
 *    capped at the opacity that keeps a pure-white poster from lifting the
 *    field. Measured at 1440x900 and 390x844, sampling the actual pixels under
 *    the text with the text hidden: on the bare backdrop, with no card
 *    between, body text holds 14.0:1 at worst (10.5:1 at the worst single
 *    pixel) and `text-muted` 5.6:1, against the 4.5:1 floor. The card is a
 *    `bg-bg/70 backdrop-blur-md` panel (70%, not 60% — at 60% the stats
 *    sentence over the spotlight beam measured 3.86:1), which only ever adds
 *    contrast on top of that.
 * 4. ITS MOTION IS DECLARED TWICE, ON PURPOSE. The animated classes applied
 *    below are also listed in `BACKGROUND_MOTION_CLASSES` (cosmetics/classes.ts),
 *    which motion.test.ts walks against globals.css's reduced-motion block AND
 *    against this file. A background's motion lives on layer classes nothing
 *    can derive from its id (`.cb-strip`, not `.cb-filmstrip`), so without that
 *    list a page-wide loop could ship with no reduced-motion rule and no test
 *    would notice. Add a moving class here, add it there.
 */
export default function ProfileBackdrop({
  equipped,
  posters,
  variant = "page",
}: {
  equipped: Equipped;
  posters: { title: string; posterPath: string | null }[];
  variant?: "page" | "preview";
}) {
  const background = equipped.background ?? "background.spotlight";
  const art = posters.flatMap((p) => (p.posterPath ? [p.posterPath] : [])).slice(0, 8);
  const heroPoster = equipped.avatarPosterPath ?? art[0] ?? null;
  const position = variant === "page" ? "fixed inset-0 -z-10" : "absolute inset-0 z-0";
  /**
   * Page-wide atmosphere, over everything else. The equipped overlay is the
   * same catalogue item the card wears; `.co-page` retunes its opacity for a
   * viewport (see the note on that class in globals.css) rather than a 900px
   * box. `overlay.none` has no class and correctly renders nothing.
   */
  const overlay = OVERLAY_CLASS[equipped.overlay ?? ""];

  return (
    <div aria-hidden className={`${position} pointer-events-none overflow-hidden bg-bg`}>
      {background === "background.filmstrip" && (
        <>
          {/*
            ONE PIECE OF FILM CROSSING THE PAGE. The band is 46% of the height,
            centred, and the sprocket rows are pinned to ITS edges (27% =
            (100-46)/2) rather than to the viewport's: at card size those were
            the same place, but on a page, holes at the screen edges and a strip
            through the middle read as three unrelated stripes.

            The track carries the run TWICE and travels -50% of its own width,
            which is what makes the 40s drift seamless. Spacing is each poster's
            own `me-3` and must stay that way: a flex `gap` leaves the two halves
            unequal by one gap, and -50% then lands 6px off every time round.
          */}
          <div className="absolute inset-x-0 top-[27%] bottom-[27%] overflow-hidden">
            <div className="cb-strip absolute inset-y-0 left-0 flex w-max opacity-[.36]">
              {[0, 1].flatMap((half) =>
                fill(art, 6).map((path, i) => (
                  <Art key={`${half}-${i}-${path}`} path={path} className="me-3 h-full shrink-0 rounded-sm" style={{ aspectRatio: "2 / 3" }} />
                )),
              )}
            </div>
          </div>
          <div className="cb-scrim absolute inset-0" />
          {/* The gate the film runs through, so it does not travel with it. */}
          <div className="cb-holes absolute inset-x-0 top-[27%] h-3" />
          <div className="cb-holes absolute inset-x-0 bottom-[27%] h-3" />
        </>
      )}

      {background === "background.spotlight" && (
        <>
          {/*
            The blurred poster is the only optional layer: with no art the beam
            and vignette alone still read as a spotlight on an empty stage,
            which is exactly right for a profile with nothing ranked yet. The
            old card-era branch rendered NOTHING in that case. At .70: the room has to be SEEN to break the wall, and the panel plus
            the page scrim carry the text's contrast, not this layer.
          */}
          {heroPoster && (
            <div className="absolute -inset-[15%]">
              <Art path={heroPoster} className="h-full w-full opacity-[.70] blur-3xl" />
            </div>
          )}
          {/* 12% overscan; the pivot and the beam gradient are tuned to it. */}
          <div className="cb-beam-sweep absolute -inset-[12%]">
            <div className="cb-beam-page absolute inset-0" />
          </div>
          <div className="cb-vignette-page absolute inset-0" />
        </>
      )}

      {background === "background.velvet" && (
        <>
          <div className="cb-velvet absolute inset-0" />
          <div className="cb-folds absolute inset-0" />
          <div className="cb-lightpass absolute inset-y-0 left-0 w-1/2" />
        </>
      )}

      {background === "background.projector-booth" && (
        <>
          <div className="cb-booth absolute inset-0" />
          {/* The posters are what the beam is pointed at: faint, and below it. */}
          {art.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 flex h-[38%] items-end justify-center opacity-[.20]">
              {fill(art, 7).map((path, i) => (
                <Art key={`${i}-${path}`} path={path} className="mx-1 h-full shrink-0 rounded-sm" style={{ aspectRatio: "2 / 3" }} />
              ))}
            </div>
          )}
          <div className="cb-booth-beam absolute inset-0" />
          <div className="cb-booth-lens absolute inset-0" />
          {/* Three depths of dust, overscanned so no tile edge reaches the page. */}
          <div className="cb-motes-1 absolute -inset-[25%]" />
          <div className="cb-motes-2 absolute -inset-[25%]" />
          <div className="cb-motes-3 absolute -inset-[25%]" />
        </>
      )}

      {background === "background.marquee-night" && (
        <>
          {art.length > 0 && (
            <div className="absolute inset-0 flex flex-wrap content-start opacity-[.34]">
              {fill(art, 24).map((path, i) => (
                <Art key={`${i}-${path}`} path={path} className="h-1/3 w-1/4 sm:w-[12.5%]" />
              ))}
            </div>
          )}
          <div className="cb-marquee-scrim absolute inset-0" />
          <BulbRow edge="top-0" />
          <BulbRow edge="bottom-0" />
        </>
      )}

      {background === "background.nitrate" && (
        <>
          <div className="cb-nitrate absolute inset-0" />
          {/* The 11s breath is on the field as a whole — print, wash and all. */}
          <div className="cb-nitrate-flick absolute inset-0">
            {art.length > 0 && (
              <div className="cb-nitrate-art absolute inset-0 flex flex-wrap content-start opacity-[.38]">
                {fill(art, 12).map((path, i) => (
                  <Art key={`${i}-${path}`} path={path} className="h-1/2 w-1/3 sm:w-1/4" />
                ))}
              </div>
            )}
            <div className="cb-nitrate-wash absolute inset-0" />
            <div className="cb-scratch-1 absolute inset-y-0 left-[22%] w-px" />
            <div className="cb-scratch-2 absolute inset-y-0 left-[49%] w-[2px]" />
            <div className="cb-scratch-3 absolute inset-y-0 left-[77%] w-px" />
          </div>
        </>
      )}

      {background === "background.midnight" && (
        <>
          <div className="cb-midnight absolute inset-0" />
          {/*
            A skyline, not a poster row: masked to fade out upward and cut to
            three uneven heights, so a run of 2:3 art reads as buildings on the
            horizon. The fixed aspect ratio is what makes the silhouette
            irregular — each height picks its own width.
          */}
          {art.length > 0 && (
            <div className="cb-skyline absolute inset-x-0 bottom-0 flex h-[26%] items-end justify-center opacity-[.55]">
              {fill(art, 9).map((path, i) => (
                <Art
                  key={`${i}-${path}`}
                  path={path}
                  className={`mx-px shrink-0 rounded-t-sm ${SKYLINE_HEIGHTS[i % 3]}`}
                  style={{ aspectRatio: "2 / 3" }}
                />
              ))}
            </div>
          )}
          <div className="cb-midnight-scrim absolute inset-0" />
          {/* Above the scrim: they are lights you are looking past, not through. */}
          <div className="cb-bokeh-1 absolute -inset-[25%]" />
          <div className="cb-bokeh-2 absolute -inset-[25%]" />
          <div className="cb-bokeh-3 absolute -inset-[25%]" />
        </>
      )}

      {/*
        The page variant's content scrim: light over the hero, heavy at the
        bottom, because body text below the marquee panel sits on the raw
        backdrop with nothing between. Only the page variant gets it — the
        dressing room's preview box has no body text over it and should show
        the room at full strength. Numbers and the reasoning behind them are on
        `.cb-page-scrim` in globals.css; they are a measured floor for
        `text-muted`, not a taste setting.
      */}
      {variant === "page" && <div className="cb-page-scrim absolute inset-0" />}
      {/*
        The house film grain, above every composition and below the cosmetic
        overlay. DESIGN.md keeps grain app-wide; `body` paints it on the body
        background, which this backdrop's opaque `bg-bg` base covers — so a
        profile with a background equipped was the one page in the site that
        silently lost it. Painted unconditionally: `overlay.none` is a choice
        about a cosmetic, not a request to leave the building.
      */}
      <div className="cb-house-grain absolute inset-0" />
      {overlay && <div className={`co-page ${overlay} absolute inset-0`} />}
    </div>
  );
}

/** Three heights, so nine posters make a skyline instead of a fence. */
const SKYLINE_HEIGHTS = ["h-full", "h-[72%]", "h-[88%]"];

/**
 * One of the user's posters as a decorative layer. A `div` with a
 * `background-image`, never an `<img>` — see invariant 2 above. `cover` and
 * `center` are the whole point: a tile that is not 2:3 crops rather than
 * squashing, and the callers that DO want the poster's real ratio ask for it
 * with an explicit `aspectRatio`.
 */
function Art({ path, className, style }: { path: string; className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{ ...style, backgroundImage: `url("${POSTER}${path}")`, backgroundSize: "cover", backgroundPosition: "center" }}
    />
  );
}

/**
 * A run of marquee bulbs with one lit bulb chasing along it.
 *
 * Four STACKED layers, none of which moves: a dim row of every bulb, then
 * three bright rows painting every third bulb, offset by one and two bulbs and
 * each visible for a third of a 6s cycle. Only opacity changes, so the chase
 * costs three composited layers instead of repainting a full-width strip at
 * 60fps — and with the animation off all three rest lit, which is the right
 * still frame for a marquee.
 */
function BulbRow({ edge }: { edge: "top-0" | "bottom-0" }) {
  return (
    <div className={`absolute inset-x-0 ${edge} h-3`}>
      <div className="cb-bulb-row absolute inset-0" />
      <div className="cb-bulb-chase cb-bulb-a absolute inset-0" />
      <div className="cb-bulb-chase cb-bulb-b absolute inset-0" />
      <div className="cb-bulb-chase cb-bulb-c absolute inset-0" />
    </div>
  );
}

/**
 * `art` repeated up to `n` entries, because a tiled or drifting composition
 * needs a MINIMUM count to hold a viewport and a real profile may own three
 * posters. Repeats rather than pads with placeholders: the same three films
 * across a wall reads as wallpaper, a grey box reads as a bug. Empty stays
 * empty — that is the caller's cue to draw the treatment alone.
 */
function fill(art: string[], n: number): string[] {
  if (art.length === 0) return [];
  const out: string[] = [];
  while (out.length < n) out.push(...art);
  return out.slice(0, n);
}
