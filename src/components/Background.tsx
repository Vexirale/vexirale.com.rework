import { motion, useReducedMotion } from "framer-motion";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";
import { useLite } from "../hooks/useLite";
import { Particles } from "./Particles";
import { Meteor } from "./Meteor";

interface BackgroundProps {
  /** Accent color (album art or static accent) used to tint the reactive orb. */
  accent: Rgb;
  /** True while a Spotify track is playing — strengthens the album-color wash. */
  playing: boolean;
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

/** Flowing "liquid" aurora: vivid orbs that overlap and blend under one big blur,
 *  roaming the whole viewport so the colors slosh everywhere. The palette slowly
 *  hue-cycles (transforms over time), and a separate album-colored orb washes
 *  over the scene while music plays.
 *
 *  On phones / weak GPUs (useLite) the orbs render static so there's no per-frame
 *  blur work; capable devices get the full motion. */
export function Background({ accent, playing }: BackgroundProps) {
  const reduced = useReducedMotion();
  const lite = useLite();
  const animate = !reduced && !lite;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#070708]">
      {/* Base orb field — spread across the whole page, blended + hue-cycling. */}
      <div className={`absolute inset-0 orb-field ${animate ? "animate-hue" : ""}`}>
        <Blob
          className="left-[-8%] top-[-8%] h-[44vmax] w-[44vmax] opacity-70"
          color="#6d28d9"
          duration={4}
          path={{ x: [0, 220, 120, -80, 0], y: [0, 140, 260, 120, 0], scale: [1, 1.25, 0.85, 1.15, 1] }}
          animate={animate}
        />
        <Blob
          className="right-[-10%] top-[-6%] h-[42vmax] w-[42vmax] opacity-70"
          color="#2563eb"
          duration={6}
          delay={0.5}
          path={{ x: [0, -220, -90, 120, 0], y: [0, 180, 90, 240, 0], scale: [1, 1.2, 0.9, 1.18, 1] }}
          animate={animate}
        />
        <Blob
          className="left-[30%] top-[28%] h-[40vmax] w-[40vmax] opacity-60"
          color="#db2777"
          duration={7}
          delay={1}
          path={{ x: [0, 180, -200, 60, 0], y: [0, -160, 120, -90, 0], scale: [1, 1.22, 0.88, 1.12, 1] }}
          animate={animate}
        />
        <Blob
          className="right-[-6%] bottom-[-8%] h-[42vmax] w-[42vmax] opacity-60"
          color="#0891b2"
          duration={5}
          delay={0.3}
          path={{ x: [0, -200, 120, 80, 0], y: [0, -180, -260, -100, 0], scale: [1, 1.2, 0.9, 1.16, 1] }}
          animate={animate}
        />
        <Blob
          className="left-[-6%] bottom-[-10%] h-[46vmax] w-[46vmax] opacity-55"
          color="#7e22ce"
          duration={6}
          delay={1.4}
          path={{ x: [0, 220, -120, -160, 0], y: [0, -200, -90, -240, 0], scale: [1, 1.18, 1.24, 0.9, 1] }}
          animate={animate}
        />
        <Blob
          className="left-[40%] top-[-10%] h-[38vmax] w-[38vmax] opacity-55"
          color="#0ea5e9"
          duration={4.5}
          delay={0.8}
          path={{ x: [0, -160, 140, -60, 0], y: [0, 220, 120, 280, 0], scale: [1, 1.2, 0.92, 1.14, 1] }}
          animate={animate}
        />
      </div>

      {/* Album-reactive wash — true album color (not hue-rotated), prominent
          while a song plays, faint otherwise. Roams the page too. */}
      <div className="absolute inset-0" style={{ filter: "blur(64px)" }}>
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[62vmax] w-[62vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle at center, ${rgbToRgba(accent, 0.75)}, transparent 70%)`,
            mixBlendMode: "screen",
            opacity: playing ? 0.6 : 0.1,
            transition: "opacity 1.5s ease, background 1.5s ease",
            willChange: "transform",
          }}
          animate={animate ? { x: [0, 160, -140, 0], y: [0, -120, 140, 0] } : undefined}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Darken overall so the vivid orbs still read as a tasteful dark theme. */}
      <div className="absolute inset-0 bg-black/45" />

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
