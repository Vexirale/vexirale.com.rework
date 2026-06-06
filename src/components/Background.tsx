import { motion, useReducedMotion } from "framer-motion";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";
import { Particles } from "./Particles";

interface BackgroundProps {
  /** Accent color (album art or static accent) used to tint a soft bloom. */
  accent: Rgb;
}

/** A soft moving gradient blob. */
function Blob({
  className,
  color,
  duration,
  delay = 0,
  reduced,
}: {
  className: string;
  color: string;
  duration: number;
  delay?: number;
  reduced: boolean | null;
}) {
  return (
    <motion.div
      aria-hidden
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{ background: color }}
      animate={
        reduced
          ? undefined
          : {
              x: [0, 40, -30, 0],
              y: [0, -50, 30, 0],
              scale: [1, 1.15, 0.95, 1],
            }
      }
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/** Animated aurora/mesh background: slow colored blobs + floating particles,
 *  layered behind everything so the frosted glass has depth to blur. */
export function Background({ accent }: BackgroundProps) {
  const reduced = useReducedMotion();
  const tint = rgbToRgba(accent, 0.5);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0a]">
      {/* Colored aurora blobs — kept dark and tasteful. */}
      <Blob
        className="left-[-10%] top-[-10%] h-[55vmax] w-[55vmax] opacity-[0.18]"
        color="radial-gradient(circle at center, #3b2a6b, transparent 70%)"
        duration={26}
        reduced={reduced}
      />
      <Blob
        className="right-[-15%] top-[10%] h-[50vmax] w-[50vmax] opacity-[0.16]"
        color="radial-gradient(circle at center, #14506e, transparent 70%)"
        duration={32}
        delay={2}
        reduced={reduced}
      />
      <Blob
        className="bottom-[-20%] left-[20%] h-[60vmax] w-[60vmax] opacity-[0.14]"
        color="radial-gradient(circle at center, #5a1f55, transparent 70%)"
        duration={38}
        delay={4}
        reduced={reduced}
      />

      {/* Accent bloom — softly tinted by the live album-art / accent color. */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/3 h-[45vmax] w-[45vmax] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, ${tint}, transparent 70%)`,
          opacity: 0.12,
        }}
        animate={reduced ? undefined : { scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sparse upward-drifting particles for ambient depth. */}
      <Particles />

      {/* A faint vignette to settle the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
