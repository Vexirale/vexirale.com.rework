import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useBioRotation } from "../hooks/useBioRotation";

/** Replace the {visitors} token with the live weekly count (or "…" while it
 *  loads / "—" if unavailable). */
function fill(line: string, visitors: number | null): string {
  if (!line.includes("{visitors}")) return line;
  const value =
    visitors === null ? "…" : visitors.toLocaleString();
  return line.replace(/\{visitors\}/g, value);
}

/** Rotating bio lines with smooth swaps. The container keeps a stable min
 *  height so the panel doesn't jump as line lengths change. Under reduced
 *  motion it's a quick crossfade (no slide/blur), but rotation continues.
 *  A {visitors} token in any line is replaced with the weekly visitor count. */
export function BioRotator({
  lines,
  visitors,
}: {
  lines: string[];
  visitors: number | null;
}) {
  const reduced = useReducedMotion();
  const index = useBioRotation(lines);
  const line = fill(lines[index] ?? "", visitors);

  const variants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 8, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -8, filter: "blur(6px)" },
      };

  return (
    <div className="relative flex min-h-[3.5rem] items-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: reduced ? 0.2 : 0.5, ease: "easeOut" }}
          className="text-base leading-relaxed text-white/75"
        >
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
