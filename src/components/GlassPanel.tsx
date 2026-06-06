import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";
import { useLite } from "../hooks/useLite";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  /** Accent for the hover glow / spotlight tint. */
  accent: Rgb;
  /** Enable the gentle 3D tilt toward the cursor (project panels). */
  tilt?: boolean;
}

// Coarse pointers (touch) have no hover: skip tilt + spotlight there.
const isTouch =
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

// Diameter of the cursor spotlight (px).
const SPOT = 340;

/** Frosted-glass surface that reacts to hover: lift + scale, brightening
 *  accent border, a cursor-following spotlight, and (optionally) a 3D tilt.
 *
 *  The spotlight is a fixed-size gradient moved with `transform` (composited,
 *  no repaint) rather than animating `background`, which would force a full
 *  panel repaint on every mouse move — the main cause of poor INP. Hover
 *  effects are skipped on touch, reduced-motion, and auto-downgraded devices. */
export function GlassPanel({
  children,
  className = "",
  accent,
  tilt = false,
}: GlassPanelProps) {
  const reduced = useReducedMotion();
  const lite = useLite();
  const ref = useRef<HTMLDivElement>(null);
  const interactive = !reduced && !isTouch && !lite;

  // Normalized cursor position within the panel (0..1), for the tilt.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  // Spotlight offset in px (translated, not repainted).
  const spotX = useMotionValue(-SPOT);
  const spotY = useMotionValue(-SPOT);

  // Tilt springs derived from cursor position.
  const rotX = useSpring(useTransform(py, [0, 1], [6, -6]), {
    stiffness: 150,
    damping: 18,
  });
  const rotY = useSpring(useTransform(px, [0, 1], [-6, 6]), {
    stiffness: 150,
    damping: 18,
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    px.set(lx / rect.width);
    py.set(ly / rect.height);
    spotX.set(lx - SPOT / 2);
    spotY.set(ly - SPOT / 2);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const accentBorder = rgbToRgba(accent, 0.5);
  const glow = rgbToRgba(accent, 0.22);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`glass group relative overflow-hidden rounded-3xl ${className}`}
      style={
        interactive && tilt
          ? {
              rotateX: rotX,
              rotateY: rotY,
              transformPerspective: 1000,
              transformStyle: "preserve-3d",
            }
          : undefined
      }
      whileHover={
        interactive
          ? { y: -6, scale: 1.02, borderColor: accentBorder }
          : undefined
      }
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {/* Cursor spotlight: a static gradient circle moved via transform. */}
      {interactive && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            width: SPOT,
            height: SPOT,
            x: spotX,
            y: spotY,
            background: `radial-gradient(circle, ${glow}, transparent 70%)`,
            willChange: "transform",
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
