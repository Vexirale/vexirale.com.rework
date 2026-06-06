import { useState } from "react";

/* "Lite mode" flag for low-powered devices: renders the background static and
 * drops the heavier effects so the page stays smooth.
 *
 * Static heuristics only — coarse pointer (touch / phones), small screen, few
 * CPU cores, or low device memory. (An earlier runtime FPS probe was removed:
 * it sampled during the busy first second of page load, false-positived on
 * capable machines, and wrongly froze the animations.) */
function computeLite(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallScreen = window.innerWidth < 768;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  return coarse || smallScreen || fewCores || lowMemory;
}

export function useLite(): boolean {
  const [lite] = useState(computeLite);
  return lite;
}
