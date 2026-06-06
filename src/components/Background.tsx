import { motion, useReducedMotion } from "framer-motion";
import { rgbToCss } from "../lib/color";
import { useLite } from "../hooks/useLite";
import { useAlbumPalette } from "../hooks/useAlbumPalette";
import { Particles } from "./Particles";
import { Meteor } from "./Meteor";

interface BackgroundProps {
  /** Current Spotify album-art URL, or null when nothing is playing. The blob
   *  colors are pulled from it; when null they fall back to a neutral palette. */
  albumArt: string | null;
}

// Neutral white/grey palette used when no music is playing (heist.lol-style).
const NEUTRAL = ["#f0f0f5", "#c8c8d2", "#a2a2ae", "#dadae2", "#b0b0bc", "#8e8e9a"];

// Blob radial alpha mask + soft edge (the container blur softens further).
const MASK = "radial-gradient(circle at center, #000 0%, #000 32%, transparent 68%)";

interface BlobDef {
  className: string;
  duration: number;
  delay: number;
  path: { x: number[]; y: number[]; scale: number[] };
}

const BLOBS: BlobDef[] = [
  { className: "left-[-8%] top-[-8%] h-[44vmax] w-[44vmax]", duration: 9, delay: 0, path: { x: [0, 220, 120, -80, 0], y: [0, 140, 260, 120, 0], scale: [1, 1.25, 0.85, 1.15, 1] } },
  { className: "right-[-10%] top-[-6%] h-[42vmax] w-[42vmax]", duration: 11, delay: 0.5, path: { x: [0, -220, -90, 120, 0], y: [0, 180, 90, 240, 0], scale: [1, 1.2, 0.9, 1.18, 1] } },
  { className: "left-[30%] top-[28%] h-[40vmax] w-[40vmax]", duration: 8, delay: 1, path: { x: [0, 180, -200, 60, 0], y: [0, -160, 120, -90, 0], scale: [1, 1.22, 0.88, 1.12, 1] } },
  { className: "right-[-6%] bottom-[-8%] h-[42vmax] w-[42vmax]", duration: 10, delay: 0.3, path: { x: [0, -200, 120, 80, 0], y: [0, -180, -260, -100, 0], scale: [1, 1.2, 0.9, 1.16, 1] } },
  { className: "left-[-6%] bottom-[-10%] h-[46vmax] w-[46vmax]", duration: 12, delay: 1.4, path: { x: [0, 220, -120, -160, 0], y: [0, -200, -90, -240, 0], scale: [1, 1.18, 1.24, 0.9, 1] } },
  { className: "left-[40%] top-[-10%] h-[38vmax] w-[38vmax]", duration: 9.5, delay: 0.8, path: { x: [0, -160, 140, -60, 0], y: [0, 220, 120, 280, 0], scale: [1, 1.2, 0.92, 1.14, 1] } },
];

function Blob({
  def,
  color,
  opacity,
  animate,
}: {
  def: BlobDef;
  color: string;
  opacity: number;
  animate: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className={`absolute rounded-full ${def.className}`}
      style={{
        backgroundColor: color,
        opacity,
        mixBlendMode: "screen",
        WebkitMaskImage: MASK,
        maskImage: MASK,
        // Color/opacity ease smoothly when the track (and palette) changes;
        // transform is driven by Framer below.
        transition: "background-color 1.4s ease, opacity 1.4s ease",
        willChange: "transform",
      }}
      animate={animate ? { x: def.path.x, y: def.path.y, scale: def.path.scale } : undefined}
      transition={{ duration: def.duration, delay: def.delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Flowing "liquid" aurora: vivid orbs that overlap and blend under one big blur,
 *  roaming the whole viewport so the colors slosh everywhere.
 *
 *  Colors come from the current song's album art when playing; otherwise a
 *  neutral white/grey palette (heist.lol-style). Colors cross-fade on track
 *  changes. On phones / weak GPUs (useLite) the orbs render static. */
export function Background({ albumArt }: BackgroundProps) {
  const reduced = useReducedMotion();
  const lite = useLite();
  const animate = !reduced && !lite;

  const palette = useAlbumPalette(albumArt);
  const colorful = Boolean(albumArt && palette && palette.length);
  const colors = colorful ? palette!.map(rgbToCss) : NEUTRAL;
  const opacity = colorful ? 0.6 : 0.22;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#070708]">
      {/* Orb field — one big blur merges the orbs into a liquid gradient. */}
      <div className="orb-field absolute inset-0">
        {BLOBS.map((def, i) => (
          <Blob
            key={i}
            def={def}
            color={colors[i % colors.length]}
            opacity={opacity}
            animate={animate}
          />
        ))}
      </div>

      {/* Darken overall so the orbs read as a tasteful dark theme. */}
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
