import { FRAME_CLASS } from "@/lib/cosmetics/classes";

/**
 * The avatar frame, as a drawn object.
 *
 * CONTRACT (other components build against this; keep the signature):
 *   <FrameArt id={equipped.frame}>{avatar}</FrameArt>
 * renders the frame for a catalogue frame id AROUND its child. Unknown or
 * missing ids fall back to the starter (brass). CSS-only frames keep using
 * their `.cf-*` class; illustrated frames add SVG art that may overhang the
 * avatar box (a marquee's bulbs, a laurel's leaves), which is why the wrapper
 * is `relative` and never `overflow-hidden`.
 *
 * This file starts as the CSS-only behaviour ProfileCanvas had inline, so the
 * pages could adopt it immediately; the illustrated frames are added here, and
 * only here — every surface (profile hero, dressing-room mirror, swatch)
 * renders a frame through this component so no two of them can disagree.
 */

/* ---- The drawing surface ------------------------------------------------
 *
 * The art hangs in a band OUTSIDE the avatar, because that is the whole
 * difference between a frame and a border: a border is a property of the
 * picture, a frame is an object the picture sits in.
 *
 * The band is `absolute -inset-[12%]`, and CSS resolves the horizontal inset
 * against the wrapper's WIDTH and the vertical one against its HEIGHT. On the
 * 2:3 poster box every frame is drawn on, that lands the SVG element at
 * 1.24w x 1.24h — still exactly 2:3 — so one viewBox unit is the same length
 * on both axes and the art never shears. What it also means is that the band
 * is 12 units wide at the sides and 18 units deep at the top and bottom.
 *
 * THE FRAMES THEREFORE WORK TO A UNIFORM ~9-UNIT BAND and treat the extra
 * top/bottom depth as free air, spent only where a motif genuinely reaches
 * (a stanchion's finial, the spotlight's lamp, a laurel tip). Draw a band of
 * 18 units all round and the sides get clipped, because `<svg>` is
 * `overflow: hidden` by default — the failure is silent and only visible as a
 * flat edge where the art was cut.
 *
 * `preserveAspectRatio="none"` rather than the default: on the 2:3 box it is a
 * no-op, and if a caller ever hands this a differently shaped child the art
 * still registers with the avatar's edges instead of floating away from them.
 */
const VIEW_BOX = "-12 -18 124 186";

/** Box (the avatar) in viewBox units. Right edge, bottom edge. */
const BOX_W = 100;
const BOX_H = 150;

/** House gold, from DESIGN.md. Every frame is drawn in this ink unless its
 *  concept is literally about another material (rope, silver nitrate). */
const GOLD = "#f5c518";
const GOLD_HI = "#fff1b8";
const GOLD_LO = "#9a7500";
const INK = "#0d0d10";

type FrameArtRenderer = () => React.ReactElement;

function FrameSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox={VIEW_BOX}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute -inset-[12%]"
    >
      {children}
    </svg>
  );
}

/** The four corners of a motif drawn once in the top-left. */
function FourCorners({ children }: { children: React.ReactNode }) {
  return (
    <>
      <g>{children}</g>
      <g transform={`translate(${BOX_W},0) scale(-1,1)`}>{children}</g>
      <g transform={`translate(0,${BOX_H}) scale(1,-1)`}>{children}</g>
      <g transform={`translate(${BOX_W},${BOX_H}) scale(-1,-1)`}>{children}</g>
    </>
  );
}

/* ---- frame.brass — the starter, upgraded from a 3px ring ---------------- */

function BrassArt() {
  const rivets: [number, number][] = [];
  for (const x of [-4.5, BOX_W / 2, BOX_W + 4.5]) rivets.push([x, -4.5], [x, BOX_H + 4.5]);
  for (const y of [BOX_H * 0.28, BOX_H * 0.72]) rivets.push([-4.5, y], [BOX_W + 4.5, y]);
  return (
    <FrameSvg>
      <defs>
        <linearGradient id="cfBrassPlate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e3a6" />
          <stop offset="0.42" stopColor="#c39a2e" />
          <stop offset="0.62" stopColor="#8a6b1f" />
          <stop offset="1" stopColor="#e3c46b" />
        </linearGradient>
      </defs>
      {/* The plate: an outer rectangle with the avatar punched out of it. */}
      <path
        d={`M -9,-9 H ${BOX_W + 9} V ${BOX_H + 9} H -9 Z M 0,0 H ${BOX_W} V ${BOX_H} H 0 Z`}
        fillRule="evenodd"
        fill="url(#cfBrassPlate)"
      />
      {/* Bevels: light catches the outer top-left and the inner bottom-right. */}
      <path d={`M -9,${BOX_H + 9} V -9 H ${BOX_W + 9}`} fill="none" stroke={GOLD_HI} strokeWidth={1.2} opacity={0.55} />
      <path d={`M -9,${BOX_H + 9} H ${BOX_W + 9} V -9`} fill="none" stroke="#5c4512" strokeWidth={1.2} opacity={0.8} />
      <rect x={-9} y={-9} width={BOX_W + 18} height={BOX_H + 18} fill="none" stroke="#4a3609" strokeWidth={0.9} />
      <rect x={-1} y={-1} width={BOX_W + 2} height={BOX_H + 2} fill="none" stroke="#3a2b07" strokeWidth={1.6} />
      {rivets.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={2.5} fill="#8a6b1f" />
          <circle cx={x - 0.5} cy={y - 0.5} r={1.5} fill="#f7e3a6" />
        </g>
      ))}
    </FrameSvg>
  );
}

/* ---- frame.perforation — the starter, upgraded from a striped gradient -- */

function PerforationArt() {
  const holes: number[] = [];
  for (let i = 0; i < 13; i += 1) holes.push(-6 + i * 13.5);
  const strip = (x: number) => (
    <>
      <rect x={x} y={-11} width={11} height={BOX_H + 22} fill="#15151a" />
      <rect x={x} y={-11} width={11} height={BOX_H + 22} fill="none" stroke="#3a3a44" strokeWidth={0.9} />
      {holes.map((cy) => (
        <rect key={cy} x={x + 2.4} y={cy - 4.2} width={6.2} height={8.4} rx={1.8} fill="#c9ccd4" />
      ))}
    </>
  );
  return (
    <FrameSvg>
      {strip(-11)}
      {strip(BOX_W)}
      {/* Closes the frame top and bottom so the two strips read as one object. */}
      <rect x={-11} y={-11} width={BOX_W + 22} height={11} fill="#15151a" />
      <rect x={-11} y={BOX_H} width={BOX_W + 22} height={11} fill="#15151a" />
      <rect x={-11} y={-11} width={BOX_W + 22} height={BOX_H + 22} fill="none" stroke="#3a3a44" strokeWidth={0.9} />
      <rect x={-0.8} y={-0.8} width={BOX_W + 1.6} height={BOX_H + 1.6} fill="none" stroke="#c9ccd4" strokeWidth={1.4} />
    </FrameSvg>
  );
}

/* ---- frame.deco — stepped corners, fan motifs, a thin double rule ------- */

function DecoArt() {
  const fanSpokes = [15, 30, 45, 60, 75].map((deg) => {
    const r = (deg * Math.PI) / 180;
    return {
      deg,
      x1: -9 + 8.6 * Math.cos(r),
      y1: -9 + 8.6 * Math.sin(r),
      x2: -9 + 15.5 * Math.cos(r),
      y2: -9 + 15.5 * Math.sin(r),
    };
  });
  return (
    <FrameSvg>
      <defs>
        <linearGradient id="cfDecoStep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="0.45" stopColor={GOLD} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
      </defs>
      {/* Thin double rule, drawn first so the corner pieces sit ON it. */}
      <rect x={-5} y={-5} width={BOX_W + 10} height={BOX_H + 10} fill="none" stroke={GOLD} strokeWidth={1.4} />
      <rect x={-1.8} y={-1.8} width={BOX_W + 3.6} height={BOX_H + 3.6} fill="none" stroke={GOLD_LO} strokeWidth={0.9} />
      <FourCorners>
        <path
          d="M -9,-9 H 26 V -3 H 13 V 3 H 5 V 13 H -3 V 26 H -9 Z"
          fill="url(#cfDecoStep)"
        />
        <path d="M -9,-9 L -0.4,-9 A 8.6,8.6 0 0 1 -9,-0.4 Z" fill={GOLD_LO} />
        {fanSpokes.map((s) => (
          <line key={s.deg} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={GOLD_LO} strokeWidth={1.1} />
        ))}
        <path d="M 6.5,-9 A 15.5,15.5 0 0 1 -9,6.5" fill="none" stroke={GOLD_LO} strokeWidth={1.1} />
        <path d="M -9,-9 H 26 V -3 H 13 V 3 H 5 V 13 H -3 V 26 H -9 Z" fill="none" stroke="#6b5205" strokeWidth={0.8} />
      </FourCorners>
    </FrameSvg>
  );
}

/* ---- frame.laurel — two branches climbing the sides, meeting at the top -
 *
 * The stem is ONE cubic bezier that hugs the left edge for two-thirds of its
 * length and only then sweeps over the top-left corner to the centre. The
 * first attempt used a circular arc, which cannot do both — it bulged inward
 * and put a wreath ACROSS the poster instead of around it.
 *
 * Leaves are placed by resampling the curve at even ARC LENGTH rather than at
 * even `t`: a bezier's parameter runs fast where the curve is straight, so
 * even-`t` leaves bunch up at the top and leave the sides bare. Stem and
 * leaves both come from the same control points, so nudging the shape moves
 * them together and they cannot drift apart.
 */
const LAUREL_CURVE: [number, number][] = [
  [-5, 152],
  [-9, 80],
  [-4, -6],
  [46, -13],
];

function laurelAt(t: number) {
  const [p0, p1, p2, p3] = LAUREL_CURVE;
  const u = 1 - t;
  const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const d = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
  const x = b[0] * p0[0] + b[1] * p1[0] + b[2] * p2[0] + b[3] * p3[0];
  const y = b[0] * p0[1] + b[1] * p1[1] + b[2] * p2[1] + b[3] * p3[1];
  const dx = d[0] * p0[0] + d[1] * p1[0] + d[2] * p2[0] + d[3] * p3[0];
  const dy = d[0] * p0[1] + d[1] * p1[1] + d[2] * p2[1] + d[3] * p3[1];
  return { x, y, tangent: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** Even-arc-length nodes. Stops at 0.94: the very tip's leaves would splay
 *  straight up out of the band and be clipped by the SVG's own overflow. */
const LAUREL_NODES = (() => {
  const steps = 400;
  const cum: number[] = [0];
  let prev = laurelAt(0);
  for (let i = 1; i <= steps; i += 1) {
    const p = laurelAt(i / steps);
    cum.push(cum[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const total = cum[steps];
  const count = 11;
  return Array.from({ length: count }, (_, k) => {
    const want = total * (0.045 + (0.94 - 0.045) * (k / (count - 1)));
    let i = cum.findIndex((c) => c >= want);
    if (i < 0) i = steps;
    return laurelAt(i / steps);
  });
})();

const LAUREL_LEAF = "M 0,0 C 4,-3.1 9.4,-2.4 11.6,0 C 9.4,2.4 4,3.1 0,0";

function LaurelArt() {
  const [p0, p1, p2, p3] = LAUREL_CURVE;
  const branch = (
    <g>
      <path
        d={`M ${p0[0]},${p0[1]} C ${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`}
        fill="none"
        stroke={GOLD_LO}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {LAUREL_NODES.map((n, i) => (
        <g key={i} transform={`translate(${n.x.toFixed(2)},${n.y.toFixed(2)})`}>
          <path d={LAUREL_LEAF} transform={`rotate(${(n.tangent - 32).toFixed(1)})`} fill="url(#cfLaurelLeaf)" stroke={GOLD_LO} strokeWidth={0.6} />
          <path d={LAUREL_LEAF} transform={`rotate(${(n.tangent + 32).toFixed(1)}) scale(0.84)`} fill="url(#cfLaurelLeaf)" stroke={GOLD_LO} strokeWidth={0.6} />
        </g>
      ))}
    </g>
  );
  return (
    <FrameSvg>
      <defs>
        <linearGradient id="cfLaurelLeaf" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="0.55" stopColor={GOLD} />
          <stop offset="1" stopColor="#c9a015" />
        </linearGradient>
      </defs>
      {/* A hairline rule so the frame closes: two branches alone leave the
          bottom edge open, and an open frame reads as a broken one. */}
      <rect x={-2.4} y={-2.4} width={BOX_W + 4.8} height={BOX_H + 4.8} fill="none" stroke={GOLD_LO} strokeWidth={1} opacity={0.85} />
      {branch}
      <g transform={`translate(${BOX_W},0) scale(-1,1)`}>{branch}</g>
      {/* Where the two branches meet: three berries instead of a knot, which at
          78px would only ever read as a smudge. */}
      <circle cx={BOX_W / 2} cy={-12.6} r={2.2} fill={GOLD_HI} />
      <circle cx={BOX_W / 2 - 4.4} cy={-9.6} r={1.6} fill={GOLD} />
      <circle cx={BOX_W / 2 + 4.4} cy={-9.6} r={1.6} fill={GOLD} />
    </FrameSvg>
  );
}

/* ---- frame.marquee — a bulb-lined border, bulbs chasing ----------------- */

/** Perimeter of the rail, walked in one direction so `index % 3` is a chase
 *  that travels rather than a random flicker. */
const MARQUEE_BULBS: [number, number][] = (() => {
  const x0 = -8;
  const y0 = -8;
  const x1 = BOX_W + 8;
  const y1 = BOX_H + 8;
  const across = 11;
  const down = 15;
  const pts: [number, number][] = [];
  for (let i = 0; i < across; i += 1) pts.push([x0 + ((x1 - x0) * i) / across, y0]);
  for (let i = 0; i < down; i += 1) pts.push([x1, y0 + ((y1 - y0) * i) / down]);
  for (let i = 0; i < across; i += 1) pts.push([x1 - ((x1 - x0) * i) / across, y1]);
  for (let i = 0; i < down; i += 1) pts.push([x0, y1 - ((y1 - y0) * i) / down]);
  return pts;
})();

function MarqueeArt() {
  return (
    <FrameSvg>
      {/* The rail is a BAND, not a filled rect: the SVG sits on top of the
          avatar, so a solid rect here paints the poster out entirely. */}
      <path
        d={`M -8,-8 H ${BOX_W + 8} V ${BOX_H + 8} H -8 Z M -1.4,-1.4 H ${BOX_W + 1.4} V ${BOX_H + 1.4} H -1.4 Z`}
        fillRule="evenodd"
        fill={INK}
      />
      <rect x={-8} y={-8} width={BOX_W + 16} height={BOX_H + 16} rx={3} fill="none" stroke={GOLD_LO} strokeWidth={1.6} />
      <rect x={-1.4} y={-1.4} width={BOX_W + 2.8} height={BOX_H + 2.8} fill="none" stroke={GOLD} strokeWidth={1.1} />
      {MARQUEE_BULBS.map(([cx, cy], i) => (
        <g key={`${cx.toFixed(1)}-${cy.toFixed(1)}`} className={`cf-marquee-bulb cf-marquee-bulb-${i % 3}`}>
          <circle cx={cx} cy={cy} r={4.6} fill={GOLD} opacity={0.22} />
          <circle cx={cx} cy={cy} r={2.6} fill={GOLD} />
          <circle cx={cx - 0.6} cy={cy - 0.6} r={1.1} fill={GOLD_HI} />
        </g>
      ))}
    </FrameSvg>
  );
}

/* ---- frame.sprocket — a 35mm film edge --------------------------------- */

const SPROCKET_PERFS = Array.from({ length: 15 }, (_, i) => -10 + i * 12.14);
const SPROCKET_TICKS = Array.from({ length: 8 }, (_, i) => 30 + i * 9);

function SprocketArt() {
  const band = (x: number) => (
    <>
      <rect x={x} y={-11} width={11} height={BOX_H + 22} fill="#141109" />
      {SPROCKET_PERFS.map((cy) => (
        <rect key={cy} x={x + 2.4} y={cy - 3.8} width={6.2} height={7.6} rx={1.7} fill={INK} stroke={GOLD} strokeWidth={0.9} />
      ))}
    </>
  );
  return (
    <FrameSvg>
      {/* Film base first, so the frame lines below sit on top of it. */}
      <rect x={-11} y={-11} width={BOX_W + 22} height={11} fill="#141109" />
      <rect x={-11} y={BOX_H} width={BOX_W + 22} height={11} fill="#141109" />
      {band(-11)}
      {band(BOX_W)}
      {/* Frame lines: the two verticals are where a real strip's image ends. */}
      <rect x={-0.9} y={-0.9} width={BOX_W + 1.8} height={BOX_H + 1.8} fill="none" stroke={GOLD} strokeWidth={1.4} />
      <rect x={-11} y={-11} width={BOX_W + 22} height={BOX_H + 22} fill="none" stroke={GOLD_LO} strokeWidth={1} />
      {/* Frame counter. Too small to read at swatch size on purpose — there it
          is edge texture, and at 180px it resolves into numerals. */}
      <text x={2.5} y={-3} fontFamily="ui-monospace, Menlo, monospace" fontSize={8.4} fontWeight={700} fill={GOLD} letterSpacing={0.6}>
        24A
      </text>
      <text
        x={BOX_W - 2.5}
        y={BOX_H + 8}
        textAnchor="end"
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={8.4}
        fontWeight={700}
        fill={GOLD}
        letterSpacing={0.6}
      >
        25A
      </text>
      {SPROCKET_TICKS.map((x) => (
        <g key={x}>
          <line x1={x} y1={-8.4} x2={x} y2={-3.6} stroke={GOLD} strokeWidth={1} opacity={0.5} />
          <line x1={BOX_W - x + 30} y1={BOX_H + 3.6} x2={BOX_W - x + 30} y2={BOX_H + 8.4} stroke={GOLD} strokeWidth={1} opacity={0.5} />
        </g>
      ))}
    </FrameSvg>
  );
}

/* ---- frame.velvet-rope — brass stanchions, a swagged rope -------------- */

const ROPE = "#7d1a2c";
const ROPE_HI = "#a8323e";

function VelvetRopeArt() {
  const post = (cx: number, capY: number, bodyFrom: number, bodyTo: number) => (
    <g>
      <rect x={cx - 3} y={Math.min(bodyFrom, bodyTo)} width={6} height={Math.abs(bodyTo - bodyFrom)} rx={2.6} fill="url(#cfStanchion)" />
      <rect x={cx - 3} y={Math.min(bodyFrom, bodyTo)} width={6} height={Math.abs(bodyTo - bodyFrom)} rx={2.6} fill="none" stroke="#4a3609" strokeWidth={0.7} />
      <circle cx={cx} cy={capY} r={3.5} fill="url(#cfStanchion)" stroke="#4a3609" strokeWidth={0.7} />
      <circle cx={cx - 1} cy={capY - 1.1} r={1.1} fill={GOLD_HI} />
    </g>
  );
  const rope = (d: string) => (
    <g>
      <path d={d} fill="none" stroke="#3d0a14" strokeWidth={4.6} strokeLinecap="round" />
      <path d={d} fill="none" stroke={ROPE} strokeWidth={3.6} strokeLinecap="round" />
      <path d={d} fill="none" stroke={ROPE_HI} strokeWidth={3.4} strokeLinecap="butt" strokeDasharray="1.6 2.6" opacity={0.55} />
    </g>
  );
  const L = -7.5;
  const R = BOX_W + 7.5;
  const TOP = -11.5;
  const BOT = BOX_H + 11.5;
  return (
    <FrameSvg>
      <defs>
        <linearGradient id="cfStanchion" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a6b1f" />
          <stop offset="0.3" stopColor={GOLD_HI} />
          <stop offset="0.62" stopColor={GOLD} />
          <stop offset="1" stopColor="#6b5205" />
        </linearGradient>
      </defs>
      {/* Swags first: the posts' finials then cap the rope ends cleanly. */}
      {rope(`M ${L},${TOP} Q ${BOX_W / 2},4 ${R},${TOP}`)}
      {rope(`M ${L},${BOT} Q ${BOX_W / 2},${BOX_H + 23} ${R},${BOT}`)}
      {rope(`M ${L},${TOP} Q -16,${BOX_H / 2} ${L},${BOT}`)}
      {rope(`M ${R},${TOP} Q ${BOX_W + 16},${BOX_H / 2} ${R},${BOT}`)}
      {post(L, TOP, TOP, TOP + 31)}
      {post(R, TOP, TOP, TOP + 31)}
      {post(L, BOT, BOT, BOT - 31)}
      {post(R, BOT, BOT, BOT - 31)}
    </FrameSvg>
  );
}

/* ---- frame.spotlit — a beam from the lamp at the corner ---------------- */

function SpotlitArt() {
  /** The lamp is clamped to the frame's top-left corner, not floating beside
   *  it: a light source with no fixing reads as a stray dot. */
  const lamp = { x: -6.6, y: -6.6 };
  return (
    <FrameSvg>
      <defs>
        <linearGradient id="cfBeam" gradientUnits="userSpaceOnUse" x1={lamp.x} y1={lamp.y} x2={BOX_W} y2={BOX_H}>
          <stop offset="0" stopColor={GOLD_HI} stopOpacity={0.26} />
          <stop offset="0.5" stopColor={GOLD} stopOpacity={0.12} />
          <stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="cfRim" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={BOX_W} y2={BOX_H}>
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="0.42" stopColor={GOLD} />
          <stop offset="1" stopColor="#5c4512" />
        </linearGradient>
        <radialGradient id="cfLamp">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="0.4" stopColor={GOLD} stopOpacity={0.75} />
          <stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </radialGradient>
        <clipPath id="cfSpotClip">
          <rect x={-2.6} y={-2.6} width={BOX_W + 5.2} height={BOX_H + 5.2} />
        </clipPath>
        {/* A polygon edge is a hard line, and a hard-edged wedge over a poster
            reads as a rendering fault rather than as light. One blur turns the
            same polygon into a beam; the clip below then stops it at the frame,
            which is the one hard edge the design actually wants. */}
        <filter id="cfBeamSoft" x="-30%" y="-30%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
      </defs>
      <g clipPath="url(#cfSpotClip)">
        <g filter="url(#cfBeamSoft)">
          <path d={`M ${lamp.x},${lamp.y} L ${BOX_W + 11},34 L ${BOX_W + 11},${BOX_H + 6} L 24,${BOX_H + 17} Z`} fill="url(#cfBeam)" />
        </g>
      </g>
      <rect x={-3.4} y={-3.4} width={BOX_W + 6.8} height={BOX_H + 6.8} fill="none" stroke="url(#cfRim)" strokeWidth={1.7} />
      <rect x={-6.6} y={-6.6} width={BOX_W + 13.2} height={BOX_H + 13.2} fill="none" stroke="url(#cfRim)" strokeWidth={0.9} opacity={0.6} />
      <circle cx={lamp.x} cy={lamp.y} r={9} fill="url(#cfLamp)" />
      <circle cx={lamp.x} cy={lamp.y} r={3.6} fill={GOLD_HI} />
      <circle cx={lamp.x} cy={lamp.y} r={5} fill="none" stroke={GOLD} strokeWidth={1.3} />
      {/* Barn doors, so the lamp is a lamp and not a bead on the corner. Angled
          up rather than out: the side band is only 12 units and an outward door
          is cut off by the SVG's overflow. */}
      {[-120, -60].map((deg) => {
        const r = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={lamp.x + 5.2 * Math.cos(r)}
            y1={lamp.y + 5.2 * Math.sin(r)}
            x2={lamp.x + 7.8 * Math.cos(r)}
            y2={lamp.y + 7.8 * Math.sin(r)}
            stroke={GOLD}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}
    </FrameSvg>
  );
}

/* ---- frame.nitrate — silver stock going off at one corner -------------- */

const NITRATE_SCRATCHES: [number, number, number, number][] = [
  [-6.6, 28, -2.6, 24],
  [-7, 62, -3, 65],
  [-6.2, 96, -2.6, 92],
  [-7, 124, -3.4, 127],
  [BOX_W + 2.6, 18, BOX_W + 6.6, 22],
  [BOX_W + 3, 52, BOX_W + 7, 49],
  [BOX_W + 2.6, 86, BOX_W + 6.4, 89],
  [18, -7.4, 20, -2.2],
  [44, -7.8, 42.4, -2.6],
  [70, -7, 72, -2.2],
  [88, -7.8, 86, -3],
  [16, 152.4, 14, 157.6],
  [40, 151.8, 42, 157],
  [66, 152.4, 64, 157.6],
];

function NitrateArt() {
  const burnCurve = `C 76,155 73,151 80,148 C 86,146 82,143 88,140 C 93,138 89,134 94,131 C 99,128 97,123 ${BOX_W + 9},116`;
  const burnEdge = `M 70,${BOX_H + 9} ${burnCurve}`;
  const burnFill = `M ${BOX_W + 9},116 V ${BOX_H + 9} H 70 ${burnCurve} Z`;
  return (
    <FrameSvg>
      <defs>
        <linearGradient id="cfNitrate" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#e2e5ec" />
          <stop offset="0.32" stopColor="#c9ccd4" />
          <stop offset="0.66" stopColor="#9b8a68" />
          <stop offset="1" stopColor="#5c4a2e" />
        </linearGradient>
      </defs>
      <path
        d={`M -9,-9 H ${BOX_W + 9} V ${BOX_H + 9} H -9 Z M 0,0 H ${BOX_W} V ${BOX_H} H 0 Z`}
        fillRule="evenodd"
        fill="url(#cfNitrate)"
      />
      <rect x={-9} y={-9} width={BOX_W + 18} height={BOX_H + 18} fill="none" stroke="#2b2417" strokeWidth={0.9} />
      <rect x={-0.9} y={-0.9} width={BOX_W + 1.8} height={BOX_H + 1.8} fill="none" stroke="#2b2417" strokeWidth={1.5} />
      {NITRATE_SCRATCHES.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={i % 3 === 2 ? "#2b2417" : "#ffffff"}
          strokeWidth={0.9}
          opacity={i % 3 === 2 ? 0.5 : 0.42}
        />
      ))}
      {/* The decomposition: one corner scorched through. It nibbles ~12 units
          into the poster and no further — the burn has to bite the picture to
          read as a burn, but the avatar is still the thing on show. */}
      <path d={burnFill} fill="#241606" />
      <path d={burnEdge} fill="none" stroke="#b8571a" strokeWidth={1.6} />
      <path d={burnEdge} fill="none" stroke="#e8a24a" strokeWidth={0.7} opacity={0.7} />
      <circle cx={95} cy={116} r={1.3} fill="#241606" stroke="#b8571a" strokeWidth={0.6} />
      <circle cx={80} cy={143} r={1} fill="#241606" stroke="#b8571a" strokeWidth={0.6} />
      <circle cx={62} cy={BOX_H + 5} r={1.5} fill="#241606" stroke="#b8571a" strokeWidth={0.6} />
    </FrameSvg>
  );
}

/* ---- frame.premiere — rope light and stars, level 90 ------------------- */

const PREMIERE_ROPE = { x: -7, y: -7, w: BOX_W + 14, h: BOX_H + 14, rx: 8 };
const PREMIERE_STAR = "M 0,-4 C 0.7,-1.3 1.3,-0.7 4,0 C 1.3,0.7 0.7,1.3 0,4 C -0.7,1.3 -1.3,0.7 -4,0 C -1.3,-0.7 -0.7,-1.3 0,-4 Z";
/** Corner stars sit on the rope's 8-unit arc, not at the square corner. */
const PREMIERE_CORNER = 8 - 8 / Math.SQRT2;
const PREMIERE_STARS: [number, number, number][] = [
  [-7 + PREMIERE_CORNER, -7 + PREMIERE_CORNER, 1.55],
  [BOX_W + 7 - PREMIERE_CORNER, -7 + PREMIERE_CORNER, 1.55],
  [-7 + PREMIERE_CORNER, BOX_H + 7 - PREMIERE_CORNER, 1.55],
  [BOX_W + 7 - PREMIERE_CORNER, BOX_H + 7 - PREMIERE_CORNER, 1.55],
  [BOX_W / 2, -7, 1.3],
  [BOX_W / 2, BOX_H + 7, 1.3],
  [-7, BOX_H / 2, 1.3],
  [BOX_W + 7, BOX_H / 2, 1.3],
  [BOX_W / 4, -7, 0.95],
  [(BOX_W * 3) / 4, -7, 0.95],
  [BOX_W / 4, BOX_H + 7, 0.95],
  [(BOX_W * 3) / 4, BOX_H + 7, 0.95],
  [-7, BOX_H / 4, 0.95],
  [-7, (BOX_H * 3) / 4, 0.95],
  [BOX_W + 7, BOX_H / 4, 0.95],
  [BOX_W + 7, (BOX_H * 3) / 4, 0.95],
];

function PremiereArt() {
  const rope = { ...PREMIERE_ROPE };
  const ropeRect = (props: React.SVGProps<SVGRectElement>) => (
    <rect x={rope.x} y={rope.y} width={rope.w} height={rope.h} rx={rope.rx} fill="none" {...props} />
  );
  return (
    <FrameSvg>
      {ropeRect({ stroke: GOLD, strokeWidth: 7.4, opacity: 0.16 })}
      {ropeRect({ stroke: "#4a3609", strokeWidth: 3.4 })}
      {ropeRect({ stroke: GOLD, strokeWidth: 2.3, strokeDasharray: "0.1 3.5", strokeLinecap: "round" })}
      {ropeRect({
        stroke: GOLD_HI,
        strokeWidth: 1.3,
        strokeDasharray: "0.1 3.5",
        strokeLinecap: "round",
        opacity: 0.55,
        className: "cf-premiere-glint",
      })}
      <rect x={-1.4} y={-1.4} width={BOX_W + 2.8} height={BOX_H + 2.8} fill="none" stroke={GOLD} strokeWidth={1.1} />
      {PREMIERE_STARS.map(([x, y, s]) => (
        <path
          key={`${x}-${y}`}
          d={PREMIERE_STAR}
          transform={`translate(${x},${y}) scale(${s})`}
          fill={GOLD_HI}
          stroke={GOLD}
          strokeWidth={0.5}
        />
      ))}
    </FrameSvg>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Illustrated frames, by id.
 *
 * An id in here is drawn and gets NO `.cf-*` ring underneath — the art is the
 * whole frame. An id absent from here falls through to the CSS ring, which is
 * how the older catalogue frames keep working unchanged.
 *
 * EVERY id in here still needs a FRAME_STYLE twin in src/lib/og-card.tsx.
 * Satori reads no stylesheet and cannot run this SVG, and its lookup ends in
 * `?? FRAME_STYLE["frame.brass"]` — so a frame with art and no twin silently
 * ships as brass on every share image. og-card.test.ts asserts the pairing.
 */
export const FRAME_ART: Record<string, FrameArtRenderer> = {
  "frame.brass": BrassArt,
  "frame.perforation": PerforationArt,
  "frame.deco": DecoArt,
  "frame.laurel": LaurelArt,
  "frame.marquee": MarqueeArt,
  "frame.sprocket": SprocketArt,
  "frame.velvet-rope": VelvetRopeArt,
  "frame.spotlit": SpotlitArt,
  "frame.nitrate": NitrateArt,
  "frame.premiere": PremiereArt,
};

export default function FrameArt({
  id,
  children,
  className = "",
}: {
  id: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  const key = id ?? "";
  // Order matters. Art wins; a known CSS-only frame keeps its ring; anything
  // else — an unknown id, an unequipped slot — lands on the starter's ART, not
  // on the starter's old ring, so the fallback looks like the frame it names.
  const Art = FRAME_ART[key] ?? (FRAME_CLASS[key] ? undefined : FRAME_ART["frame.brass"]);
  if (Art) {
    // No padding and no background: the art overhangs the avatar box instead of
    // insetting it, so the child keeps its full size on every surface.
    return (
      <span className={`relative inline-block shrink-0 leading-none ${className}`}>
        {children}
        <Art />
      </span>
    );
  }
  const frameClass = FRAME_CLASS[key];
  return (
    <span className={`relative inline-block shrink-0 rounded-md p-[3px] leading-none ${frameClass} ${className}`}>
      {children}
    </span>
  );
}
