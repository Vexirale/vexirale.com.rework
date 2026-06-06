import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Shot {
  top: number; // % from top
  left: number; // % from left
  dx: number; // px travel x
  dy: number; // px travel y
  angle: number; // deg, trail orientation
  len: number; // px, trail length
  duration: number; // s
}

function randomShot(): Shot {
  const goLeft = Math.random() < 0.5;
  // Down-left (~145°) or down-right (~35°), with a little jitter.
  const angle = (goLeft ? 145 : 35) + (Math.random() * 20 - 10);
  const rad = (angle * Math.PI) / 180;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const dist = Math.max(vw, vh) * (0.5 + Math.random() * 0.35);
  return {
    top: -5 + Math.random() * 25,
    left: goLeft ? 55 + Math.random() * 45 : Math.random() * 45,
    dx: Math.cos(rad) * dist,
    dy: Math.sin(rad) * dist,
    angle,
    len: 90 + Math.random() * 70,
    duration: 1 + Math.random() * 0.6,
  };
}

/** Occasional shooting star: a small white dot with a fading trail that streaks
 *  across the background roughly every ~10s, in a random side/downward
 *  direction. */
export function Meteor() {
  const [count, setCount] = useState(0);
  const [shot, setShot] = useState<Shot>(randomShot);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      const wait = 8000 + Math.random() * 5000; // ~10s between meteors
      timer = setTimeout(() => {
        setShot(randomShot());
        setCount((c) => c + 1);
        loop();
      }, wait);
    };
    loop();
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      key={count}
      className="absolute"
      style={{ top: `${shot.top}%`, left: `${shot.left}%` }}
      initial={{ x: 0, y: 0, opacity: 0 }}
      animate={{ x: shot.dx, y: shot.dy, opacity: [0, 1, 1, 0] }}
      transition={{ duration: shot.duration, times: [0, 0.08, 0.85, 1], ease: "easeIn" }}
    >
      <div
        className="relative"
        style={{ transform: `rotate(${shot.angle}deg)`, transformOrigin: "right center" }}
      >
        {/* trail */}
        <div
          className="h-px rounded-full"
          style={{
            width: shot.len,
            background:
              "linear-gradient(to left, rgba(255,255,255,0.9), rgba(255,255,255,0))",
          }}
        />
        {/* head */}
        <div className="absolute right-0 top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.6)]" />
      </div>
    </motion.div>
  );
}
