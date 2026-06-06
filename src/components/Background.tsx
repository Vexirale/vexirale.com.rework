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

/** A vivid color orb. No per-blob blur — the parent applies one big blur so the
 *  orbs bleed and mix into a flowing liquid gradient; `mix-blend-mode: screen`
 *  makes overlaps brighten into new colors. Animates transform only. */
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
      className={`absolute rounded-full ${className}`}
      style={{
        background: `radial-gradient(circle at center, ${color}, transparent 68%)`,
        mixBlendMode: "screen",
        willChange: "transform",
      }}
      animate={animate ? { x: path.x, y: path.y, scale: path.scale } : undefined}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Flowing "liquid" aurora: several vivid orbs that overlap and blend under one
 *  big blur, drifting along looping paths so the colors slosh and mix
 *  (heist.lol-style). Plus sparse particles and the occasional meteor.
 *
 *  On phones / weak GPUs (useLite) the orbs are rendered static so there's no
 *  per-frame blur work; capable devices get the full motion. */
export function Background({ accent }: BackgroundProps) {
  const reduced = useReducedMotion();
  const lite = useLite();
  const animate = !reduced && !lite;
  const tint = rgbToRgba(accent, 0.6);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#070708]">
      {/* The orb field: one big blur on the container blends the orbs together
          so their colors bleed into each other as they move. */}
      <div className="absolute inset-0" style={{ filter: "blur(64px)" }}>
        <Blob
          className="left-[5%] top-[2%] h-[48vmax] w-[48vmax] opacity-70"
          color="#6d28d9"
          duration={9}
          path={{ x: [0, 180, 90, -60, 0], y: [0, 120, 220, 80, 0], scale: [1, 1.25, 0.85, 1.15, 1] }}
          animate={animate}
        />
        <Blob
          className="right-[2%] top-[-5%] h-[44vmax] w-[44vmax] opacity-70"
          color="#2563eb"
          duration={11}
          delay={0.5}
          path={{ x: [0, -170, -70, 90, 0], y: [0, 150, 60, 200, 0], scale: [1, 1.2, 0.9, 1.18, 1] }}
          animate={animate}
        />
        <Blob
          className="left-[28%] top-[20%] h-[42vmax] w-[42vmax] opacity-60"
          color="#db2777"
          duration={8}
          delay={1}
          path={{ x: [0, 120, -130, 40, 0], y: [0, -100, 90, -60, 0], scale: [1, 1.22, 0.88, 1.12, 1] }}
          animate={animate}
        />
        <Blob
          className="right-[18%] bottom-[2%] h-[40vmax] w-[40vmax] opacity-60"
          color="#0891b2"
          duration={10}
          delay={0.3}
          path={{ x: [0, -140, 80, 60, 0], y: [0, -120, -200, -70, 0], scale: [1, 1.2, 0.9, 1.16, 1] }}
          animate={animate}
        />
        <Blob
          className="left-[35%] bottom-[-8%] h-[46vmax] w-[46vmax] opacity-55"
          color="#7e22ce"
          duration={12}
          delay={1.4}
          path={{ x: [0, 150, -90, -120, 0], y: [0, -150, -60, -180, 0], scale: [1, 1.18, 1.24, 0.9, 1] }}
          animate={animate}
        />

        {/* Accent orb — softly tinted by the live album-art / accent color. */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/3 h-[46vmax] w-[46vmax] -translate-x-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle at center, ${tint}, transparent 70%)`,
            mixBlendMode: "screen",
            opacity: 0.5,
            transition: "background 1.2s ease",
            willChange: "transform",
          }}
          animate={animate ? { x: [0, 90, -70, 0], y: [0, -70, 90, 0] } : undefined}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Darken overall so the vivid orbs still read as a tasteful dark theme. */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sparse upward-drifting particles + the occasional meteor (full mode). */}
      {animate && (
        <>
          <Particles />
          <Meteor />
        </>
      )}

      {/* A faint vignette to settle the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6))]" />
    </div>
  );
}
