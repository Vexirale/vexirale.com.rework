import { motion, useReducedMotion } from "framer-motion";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";
import { useLite } from "../hooks/useLite";
import { Particles } from "./Particles";
import { Meteor } from "./Meteor";

interface BackgroundProps {
  /** Accent color (album art or static accent) used to tint a soft bloom. */
  accent: Rgb;
}

/** A soft gradient blob that slowly drifts along a looping path, so several of
 *  them overlapping read as a flowing, swirling aurora. Animates transform only
 *  (translate + gentle scale), promoted to its own compositor layer. */
function Blob({
  className,
  color,
  duration,
  delay = 0,
  path,
  animate,
}: {
  className: string;
  color: string;
  duration: number;
  delay?: number;
  path: { x: number[]; y: number[]; scale: number[] };
  animate: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className={`absolute rounded-full blur-2xl ${className}`}
      style={{ background: color, willChange: "transform", transform: "translateZ(0)" }}
      animate={animate ? { x: path.x, y: path.y, scale: path.scale } : undefined}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Animated aurora/mesh background: slow swirling colored blobs, sparse
 *  floating particles, and the occasional meteor — layered behind everything.
 *
 *  On phones / weak GPUs (useLite) the whole thing is rendered static so the
 *  browser isn't doing per-frame work; capable devices get the full motion. */
export function Background({ accent }: BackgroundProps) {
  const reduced = useReducedMotion();
  const lite = useLite();
  const animate = !reduced && !lite;
  const tint = rgbToRgba(accent, 0.55);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0a]">
      {/* Swirling aurora blobs — kept dark and tasteful. */}
      <Blob
        className="left-[-10%] top-[-12%] h-[52vmax] w-[52vmax] opacity-[0.22]"
        color="radial-gradient(circle at center, #4b338a, transparent 70%)"
        duration={9}
        path={{ x: [0, 120, 60, -60, 0], y: [0, 70, 160, 90, 0], scale: [1, 1.12, 0.92, 1.08, 1] }}
        animate={animate}
      />
      <Blob
        className="right-[-15%] top-[6%] h-[46vmax] w-[46vmax] opacity-[0.2]"
        color="radial-gradient(circle at center, #155e7a, transparent 70%)"
        duration={11}
        delay={0.6}
        path={{ x: [0, -100, -40, 70, 0], y: [0, 90, 180, 100, 0], scale: [1, 1.14, 0.9, 1.1, 1] }}
        animate={animate}
      />
      <Blob
        className="bottom-[-22%] left-[18%] h-[56vmax] w-[56vmax] opacity-[0.18]"
        color="radial-gradient(circle at center, #6e2068, transparent 70%)"
        duration={8}
        delay={1.1}
        path={{ x: [0, 90, -70, -30, 0], y: [0, -90, -40, -120, 0], scale: [1, 1.1, 1.16, 0.94, 1] }}
        animate={animate}
      />
      <Blob
        className="right-[10%] bottom-[-10%] h-[40vmax] w-[40vmax] opacity-[0.16]"
        color="radial-gradient(circle at center, #2a3f8f, transparent 70%)"
        duration={10}
        delay={0.4}
        path={{ x: [0, -80, 60, 45, 0], y: [0, -60, -130, -45, 0], scale: [1, 1.14, 0.9, 1.08, 1] }}
        animate={animate}
      />

      {/* Accent bloom — softly tinted by the live album-art / accent color. */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/3 h-[46vmax] w-[46vmax] -translate-x-1/2 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle at center, ${tint}, transparent 70%)`,
          opacity: 0.14,
          transition: "background 1.2s ease",
        }}
        animate={animate ? { x: [0, 60, -40, 0], y: [0, -50, 60, 0] } : undefined}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sparse upward-drifting particles + the occasional meteor (full mode). */}
      {animate && (
        <>
          <Particles />
          <Meteor />
        </>
      )}

      {/* A faint vignette to settle the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
