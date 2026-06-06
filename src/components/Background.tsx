import { motion, useReducedMotion } from "framer-motion";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";
import { useLite } from "../hooks/useLite";
import { Particles } from "./Particles";

interface BackgroundProps {
  /** Accent color (album art or static accent) used to tint a soft bloom. */
  accent: Rgb;
}

/** A soft gradient blob. Animated only when motion is allowed; it animates
 *  position (transform) only — never blur or scale — so the blurred layer is
 *  rasterized once and just moved, which is cheap on the compositor. */
function Blob({
  className,
  color,
  duration,
  delay = 0,
  animate,
}: {
  className: string;
  color: string;
  duration: number;
  delay?: number;
  animate: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className={`absolute rounded-full blur-2xl ${className}`}
      // translateZ promotes the blob to its own compositor layer so moving it
      // doesn't repaint the blur each frame.
      style={{ background: color, willChange: "transform", transform: "translateZ(0)" }}
      animate={animate ? { x: [0, 36, -28, 0], y: [0, -44, 26, 0] } : undefined}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Animated aurora/mesh background: slow colored blobs + (optionally) floating
 *  particles, layered behind everything so the frosted glass has depth to blur.
 *
 *  IMPORTANT for performance: when the background animates, every frosted panel
 *  must re-blur its backdrop every frame. On phones / weak GPUs we therefore
 *  render the background completely static (see useLite), which lets the browser
 *  cache each panel's blur and keeps the page smooth. */
export function Background({ accent }: BackgroundProps) {
  const reduced = useReducedMotion();
  const lite = useLite();
  const animate = !reduced && !lite;
  const tint = rgbToRgba(accent, 0.5);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0a]">
      {/* Colored aurora blobs — kept dark and tasteful. */}
      <Blob
        className="left-[-10%] top-[-10%] h-[50vmax] w-[50vmax] opacity-[0.18]"
        color="radial-gradient(circle at center, #3b2a6b, transparent 70%)"
        duration={26}
        animate={animate}
      />
      <Blob
        className="right-[-15%] top-[10%] h-[45vmax] w-[45vmax] opacity-[0.16]"
        color="radial-gradient(circle at center, #14506e, transparent 70%)"
        duration={32}
        delay={2}
        animate={animate}
      />
      <Blob
        className="bottom-[-20%] left-[20%] h-[55vmax] w-[55vmax] opacity-[0.14]"
        color="radial-gradient(circle at center, #5a1f55, transparent 70%)"
        duration={38}
        delay={4}
        animate={animate}
      />

      {/* Accent bloom — softly tinted by the live album-art / accent color.
          Static (no animation) to avoid forcing panel re-blurs. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/3 h-[45vmax] w-[45vmax] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, ${tint}, transparent 70%)`,
          opacity: 0.12,
          transition: "background 1.2s ease",
        }}
      />

      {/* Sparse upward-drifting particles for ambient depth (full mode only). */}
      {animate && <Particles />}

      {/* A faint vignette to settle the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
