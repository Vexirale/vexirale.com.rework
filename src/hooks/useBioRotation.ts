import { useEffect, useRef, useState } from "react";

/** Compute how long a line should stay on screen, scaled by its length.
 *  ~2s base + ~55ms/char, clamped to [4s, 9s]. */
function durationFor(line: string): number {
  const ms = 2000 + line.length * 55;
  return Math.min(Math.max(ms, 4000), 9000);
}

/** Rotates through bio lines: random next pick, never the same line twice in a
 *  row, with length-scaled on-screen time. Returns the active index. */
export function useBioRotation(lines: string[]): number {
  const [index, setIndex] = useState(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lines.length <= 1) return;

    const schedule = (current: number) => {
      timeout.current = setTimeout(() => {
        // Pick a different index at random.
        let next = current;
        while (next === current) {
          next = Math.floor(Math.random() * lines.length);
        }
        setIndex(next);
        schedule(next);
      }, durationFor(lines[current]));
    };

    schedule(index);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
    // Re-arm whenever the active line changes (or the list changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lines]);

  // Reset if the config shrinks below the current index.
  useEffect(() => {
    if (index >= lines.length) setIndex(0);
  }, [index, lines.length]);

  return index;
}
