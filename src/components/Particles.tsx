import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ===========================================================================
 *  PARTICLE TUNING — keep these subtle. Err on the side of TOO FEW.
 *  If the background ever looks busy or cheap, lower COUNT and OPACITY,
 *  or set COUNT to 0 to turn particles off entirely.
 * =========================================================================== */
const COUNT: number = 8; // how many particles (sparse on purpose)
const OPACITY = 0.35; // peak opacity of a single particle (very faint)
const MAX_SIZE = 2.5; // px — keep tiny
const MIN_DURATION = 16; // s — slow drift
const MAX_DURATION = 30; // s

interface Particle {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

/** Sparse field of tiny white dots that drift slowly upward and fade out near
 *  the top. Sits behind the panels so the frosted glass partly veils them. */
export function Particles() {
  const reduced = useReducedMotion();

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: COUNT }, () => ({
      left: Math.random() * 100,
      size: 1 + Math.random() * (MAX_SIZE - 1),
      duration: MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION),
      delay: Math.random() * -MAX_DURATION,
      drift: (Math.random() - 0.5) * 40,
    }));
  }, []);

  // No drifting particles under reduced motion; the blobs already convey depth.
  if (reduced || COUNT === 0) return null;

  return (
    <div aria-hidden className="absolute inset-0">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0 rounded-full bg-white"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: ["0vh", "-100vh"],
            x: [0, p.drift],
            opacity: [0, OPACITY, OPACITY, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.1, 0.8, 1],
          }}
        />
      ))}
    </div>
  );
}
