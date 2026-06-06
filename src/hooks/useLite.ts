import { useEffect, useState } from "react";

/** Heuristic for whether to run the lightweight visual mode.
 *
 *  The expensive thing on this site is `backdrop-filter` (frosted glass) layered
 *  over a continuously animating background: the browser must re-blur every
 *  panel every frame, which is brutal on phones and weaker GPUs. In "lite" mode
 *  the background is rendered static (no per-frame motion) so the browser can
 *  cache each panel's blur — the page stays pretty but smooth.
 *
 *  Triggers on coarse pointers (touch / phones), small screens, low core
 *  counts, or low device memory. Defaults to the full experience otherwise. */
export function useLite(): boolean {
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };

    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const smallScreen = window.innerWidth < 768;
    const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
    const lowMemory = (nav.deviceMemory ?? 8) <= 4;

    setLite(Boolean(coarse || smallScreen || fewCores || lowMemory));
  }, []);

  return lite;
}
