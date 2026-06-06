import { useSyncExternalStore } from "react";

/* Shared "lite mode" flag. Lite mode renders the background static and drops
 * the heavier effects so the page stays smooth on devices that can't keep up.
 *
 * Two triggers:
 *  1. Static heuristics: coarse pointer (touch), small screen, few CPU cores,
 *     or low device memory.
 *  2. A one-time runtime FPS probe — catches devices that pass the static
 *     checks but still render slowly (e.g. desktops where the browser is
 *     software-rendering, which crushes frame rates). This is why a powerful-
 *     looking PC can still be janky: core/memory counts don't reflect the GPU. */

let lite = false;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setLite(value: boolean) {
  if (value !== lite) {
    lite = value;
    emit();
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallScreen = window.innerWidth < 768;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;

  if (coarse || smallScreen || fewCores || lowMemory) {
    lite = true;
    return;
  }

  // Probe the real frame rate for a short window, then downgrade if low.
  let frames = 0;
  let startTs = 0;
  const tick = (now: number) => {
    if (!startTs) startTs = now;
    frames += 1;
    const elapsed = now - startTs;
    if (elapsed < 1200) {
      requestAnimationFrame(tick);
    } else {
      const fps = (frames * 1000) / elapsed;
      // Ignore results while the tab is hidden (rAF is throttled there).
      if (!document.hidden && fps < 45) setLite(true);
    }
  };
  requestAnimationFrame(tick);
}

export function useLite(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      start();
      return () => listeners.delete(onChange);
    },
    () => lite,
    () => false,
  );
}
