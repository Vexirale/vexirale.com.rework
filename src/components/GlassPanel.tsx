import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";

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

/** Frosted-glass surface that reacts to hover: lift + scale, brightening
 *  accent border, a cursor-following spotlight, and (optionally) a 3D tilt. */
export function GlassPanel({
  children,
  className = "",
  accent,
  tilt = false,
}: GlassPanelProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const interactive = !reduced && !isTouch;

  // Raw normalized cursor position within the panel (0..1).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  // Spotlight position in %.
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);
  const glow = rgbToRgba(accent, 0.22);
  const spotlight = useMotionTemplate`radial-gradient(circle at ${spotX}% ${spotY}%, ${glow}, transparent 60%)`;

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
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    px.set(nx);
    py.set(ny);
    spotX.set(nx * 100);
    spotY.set(ny * 100);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
    spotX.set(50);
    spotY.set(50);
  };

  const accentBorder = rgbToRgba(accent, 0.5);
  const accentShadow = rgbToRgba(accent, 0.25);

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
          ? {
              y: -6,
              scale: 1.02,
              borderColor: accentBorder,
              boxShadow: `0 18px 50px rgba(0,0,0,0.5), 0 0 30px ${accentShadow}`,
            }
          : undefined
      }
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {/* Cursor spotlight overlay. */}
      {interactive && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlight }}
        />
      )}
      {children}
    </motion.div>
  );
}
