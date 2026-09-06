"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
  shape: "rect" | "circle" | "star";
  wobble: number;
  wobbleSpeed: number;
}

const PALETTE = [
  "#f5c518", // Premiere Gold
  "#f5a524", // Warm Amber
  "#fff1b8", // Champagne Cream
  "#d0d4dc", // Slate Silver
  "#ffffff", // Sparkle White
  "#b3860a", // Deep Gold
];

/**
 * CONFETTI PHYSICS, and why these numbers rather than the ones that were here.
 *
 * The first version gave every flake a constant `vy` and never touched it, so
 * 75 pieces of gold descended at 75 fixed speeds in 75 straight lines. That is
 * not confetti; that is falling rectangles. Real confetti accelerates until air
 * resistance catches it, and the resulting terminal drift is what makes the
 * side-to-side wobble read as FLUTTER instead of as a sine wave.
 *
 * So: gravity accelerates the fall, a terminal-velocity clamp stops it turning
 * into a hailstorm inside the 4500ms window, and horizontal drag bleeds off the
 * initial sideways burst so flakes fan out and then settle into a vertical
 * flutter. Spin decays with the same drag, because a flake that has stopped
 * being pushed sideways has stopped being tumbled.
 *
 * All four are per-FRAME-at-60Hz values scaled by `step` (see the render loop).
 * Without that scaling gravity would compound the old code's frame-rate
 * dependence quadratically, and the whole cannon would fire twice as fast on a
 * 120Hz display.
 */
/** Downward acceleration, px/frame². */
const GRAVITY = 0.055;
/** Terminal fall speed, px/frame — the clamp that keeps this a drift, not a drop. */
const MAX_FALL_SPEED = 7.5;
/** Per-frame retention of horizontal velocity and spin (air resistance). */
const AIR_DRAG = 0.988;
/** Amplitude of the flutter oscillation, px. */
const WOBBLE_AMPLITUDE = 1.2;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/*
 * REDUCED MOTION IS READ AS AN EXTERNAL STORE, not as state set from an effect.
 *
 * The previous version called `matchMedia` in the first effect pass and then
 * `setReducedMotion`, which is the cascading-render pattern React now lints as
 * an error: the component rendered once with the wrong answer, committed, and
 * immediately re-rendered with the right one. A lazy `useState` initialiser
 * would fix the render pass but reintroduce a hydration mismatch, because this
 * is a client component that the app router still renders on the server, where
 * `window` and `matchMedia` do not exist and the initialiser would have to
 * guess `false`.
 *
 * `useSyncExternalStore` is the one API that answers both: it uses the server
 * snapshot during SSR and hydration, subscribes for changes, and re-reads on
 * the client without a self-inflicted extra render. The three functions live at
 * module scope so their identities are stable across renders — passing inline
 * closures would resubscribe on every render.
 */
function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** SSR/hydration snapshot. No media queries on the server, so assume motion is fine. */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export interface CurtainCallCelebrationProps {
  /** Optional custom duration in milliseconds (defaults to 4500ms) */
  durationMs?: number;
  /** Whether the celebration is active */
  active?: boolean;
  /** Optional callback fired when particle cannon finishes */
  onComplete?: () => void;
  /** Optional custom title or tagline */
  title?: string;
}

export default function CurtainCallCelebration({
  durationMs = 4500,
  active = true,
  onComplete,
  title = "Curtain Call · Consensus Reached",
}: CurtainCallCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  /*
   * `visible` USED TO BE STATE mirroring `active`, kept in sync by an effect
   * that called setVisible on every pass — the second cascading-render error.
   * It is derived now: the only thing this component actually needs to remember
   * is whether the current run has PLAYED OUT, which is a one-way transition
   * made from inside the rAF/timeout callback, and a callback is exactly where
   * an effect is supposed to call setState. The effect's cleanup re-arms the
   * flag, so a celebration that is deactivated and reactivated (or whose
   * duration changes mid-flight) runs again instead of staying hidden forever.
   */
  const [runComplete, setRunComplete] = useState(false);
  const visible = active && !runComplete;

  /* `onComplete` lives in a ref so a caller passing an inline arrow cannot
     restart the cannon on every one of its own re-renders. That is also why it
     is absent from the animation effect's dependency list below. */
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!active) return;

    if (reducedMotion) {
      // Reduced motion: keep the static banner for the duration, then complete.
      const timer = setTimeout(() => {
        setRunComplete(true);
        onCompleteRef.current?.();
      }, durationMs);
      return () => {
        clearTimeout(timer);
        setRunComplete(false);
      };
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const startTime = performance.now();
    let lastTime = startTime;

    /*
     * HiDPI BACKING STORE. The old code set `canvas.width` to the CSS-pixel
     * width, so every flake was rasterised at 1x and upscaled by the browser —
     * visibly soft on any retina screen, which is most of them.
     *
     * The fix is the standard one: size the backing store in DEVICE pixels and
     * scale the 2D context by the same factor, so every drawing call below goes
     * on working in CSS pixels.
     *
     * A note on what we deliberately do NOT do, since the obvious third step is
     * to write `canvas.style.width/height`: this canvas is already sized by
     * Tailwind's `size-full` against its `inset-0` parent. An inline pixel size
     * would override that utility and then go stale the moment the parent
     * changed height without a window resize firing — leaving the canvas not
     * covering the overlay at all. Letting CSS keep the layout and only
     * re-deriving the backing store keeps the two in step. (src/lib/
     * ticket-canvas.ts is not a precedent either way: it rasterises an
     * off-screen fixed 1200x675 PNG for export, so it has no CSS size and no
     * DPR to reconcile.)
     *
     * DPR is capped at 2. Past that the extra fill cost buys nothing the eye
     * can find in a 12px confetti flake, and 3x-4x phones are exactly the
     * devices least able to afford it.
     */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Logical (CSS pixel) stage size — all particle maths is in these units.
    let viewW = 0;
    let viewH = 0;

    const resize = () => {
      const nextW = canvas.parentElement?.clientWidth || window.innerWidth;
      const nextH = canvas.parentElement?.clientHeight || window.innerHeight;

      /* A mid-celebration resize used to scatter the flakes: the canvas grew or
         shrank but every coordinate had been computed against the ORIGINAL
         stage, so the confetti ended up bunched into a corner or off-screen.
         They are rescaled proportionally instead, which preserves the
         composition and is trivial at 75 objects. Velocities are left alone on
         purpose — a fall speed is not a fraction of the viewport, and scaling
         it would make the same confetti fall faster in a wider window. */
      if (viewW > 0 && viewH > 0 && (nextW !== viewW || nextH !== viewH)) {
        const sx = nextW / viewW;
        const sy = nextH / viewH;
        for (const p of particles) {
          p.x *= sx;
          p.y *= sy;
        }
      }

      viewW = nextW;
      viewH = nextH;
      canvas.width = Math.max(1, Math.round(nextW * dpr));
      canvas.height = Math.max(1, Math.round(nextH * dpr));
      // setTransform, not scale: resize can fire dozens of times during a drag
      // and `scale` would compound.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // 75 golden confetti flakes/stars. Better physics, not more objects.
    const count = 75;
    const particles: Particle[] = [];

    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < count; i++) {
      const shapeRand = Math.random();
      particles.push({
        x: viewW * 0.5 + (Math.random() - 0.5) * (viewW * 0.6),
        y: Math.random() * -viewH * 0.4,
        w: Math.random() * 8 + 6,
        h: Math.random() * 12 + 6,
        vx: (Math.random() - 0.5) * 3.5,
        // Launches slow because GRAVITY does the work now. Keeping the old
        // 2.0-4.5 initial fall speed AND adding acceleration would have turned
        // the cannon into a hailstorm.
        vy: Math.random() * 1.4 + 0.6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 6,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        opacity: 1,
        shape: shapeRand > 0.8 ? "star" : shapeRand > 0.4 ? "rect" : "circle",
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.08 + 0.04,
      });
    }

    function drawStar(c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fill();
    }

    const render = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      /* Frame delta normalised to a 60Hz baseline, clamped so a backgrounded
         tab resuming after a long gap teleports the confetti a little rather
         than integrating one enormous step straight through the floor. */
      const step = Math.min(2.5, (currentTime - lastTime) / (1000 / 60));
      lastTime = currentTime;

      ctx.clearRect(0, 0, viewW, viewH);

      const progress = Math.min(1, elapsed / durationMs);
      const fadeOut = progress > 0.75 ? (1 - progress) / 0.25 : 1;
      const drag = Math.pow(AIR_DRAG, step);

      for (const p of particles) {
        p.wobble += p.wobbleSpeed * step;
        p.vy = Math.min(MAX_FALL_SPEED, p.vy + GRAVITY * step);
        p.vx *= drag;
        p.rotationSpeed *= drag;
        p.x += (p.vx + Math.sin(p.wobble) * WOBBLE_AMPLITUDE) * step;
        p.y += p.vy * step;
        p.rotation += p.rotationSpeed * step;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity * fadeOut);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "star") {
          drawStar(ctx, 0, 0, 5, p.w, p.w * 0.45);
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        setRunComplete(true);
        onCompleteRef.current?.();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      setRunComplete(false);
    };
  }, [active, durationMs, reducedMotion]);

  if (!visible) return null;

  return (
    <div
      aria-label={title}
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      {/* Dynamic Theatrical Spotlight Sweep */}
      {!reducedMotion ? (
        <div
          className="pointer-events-none absolute inset-0 animate-spotlight-sweep opacity-75"
          style={{
            background:
              "radial-gradient(circle 450px at 50% 20%, rgba(245, 197, 24, 0.22), transparent 70%)",
          }}
        />
      ) : (
        /* Reduced motion: Calm static gold ambient glow */
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle 500px at 50% 30%, rgba(245, 197, 24, 0.15), transparent 70%)",
          }}
        />
      )}

      {/* Canvas for Particle Cannon (Suppressed under reduced motion) */}
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 size-full"
        />
      )}

      {/* Accessible Celebration Callout Banner */}
      <div className="sr-only" role="status" aria-live="polite">
        {title}
      </div>
    </div>
  );
}
