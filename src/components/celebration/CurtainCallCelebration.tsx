"use client";

import { useEffect, useRef, useState } from "react";

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
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    // Check user preference for reduced motion
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);

    if (reducedMotion) {
      // Reduced motion: Keep static banner for duration then complete
      const timer = setTimeout(() => {
        onComplete?.();
      }, durationMs);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let startTime = performance.now();

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize 75 golden confetti flakes/stars
    const count = 75;
    const particles: Particle[] = [];
    const width = canvas.width;
    const height = canvas.height;

    for (let i = 0; i < count; i++) {
      const shapeRand = Math.random();
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * (width * 0.6),
        y: Math.random() * -height * 0.4,
        w: Math.random() * 8 + 6,
        h: Math.random() * 12 + 6,
        vx: (Math.random() - 0.5) * 3.5,
        vy: Math.random() * 2.5 + 2.0,
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const progress = Math.min(1, elapsed / durationMs);
      const fadeOut = progress > 0.75 ? (1 - progress) / 0.25 : 1;

      for (const p of particles) {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 1.2;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

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
        setVisible(false);
        onComplete?.();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [active, durationMs, onComplete, reducedMotion]);

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
