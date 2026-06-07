import { useSyncExternalStore } from "react";

/* Performance mode store.
 *
 * Drives "lite mode" (static background, no particles/meteor, no hover spotlight
 * /tilt) and the notice shown when we auto-reduce.
 *
 * Decision order:
 *  1. Saved choice in localStorage ("full" | "lite") — respected, no measuring.
 *  2. Static heuristics (touch / small screen / few cores / low memory) → lite,
 *     quietly (these devices expect it; no notice).
 *  3. Otherwise start in full mode and watch the real frame rate. If it stays
 *     below ~30 FPS for a few seconds (measured only AFTER load settles, so the
 *     busy first moments don't false-trigger), drop to lite and show a notice
 *     with an option to force the full experience back on.
 */

type Mode = "full" | "lite";
const STORAGE_KEY = "vx-perf-mode";

let lite = false;
let notice = false; // show the "reduced effects" toast
let decided = false; // monitor finished / no longer changing automatically
let needsMonitor = false; // run the FPS watcher once mounted
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function staticLite(): boolean {
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

function savedMode(): Mode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "full" || v === "lite" ? v : null;
  } catch {
    return null;
  }
}

function save(mode: Mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function monitor() {
  let raf = 0;
  let frames = 0;
  let windowStart = 0;
  let lowWindows = 0;

  const tick = (now: number) => {
    if (decided) return;
    if (!windowStart) windowStart = now;
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      const fps = (frames * 1000) / elapsed;
      if (document.hidden) {
        lowWindows = 0; // ignore throttled/background frames
      } else if (fps < 30) {
        lowWindows += 1;
        if (lowWindows >= 3) {
          // ~3s of sustained low frame rate → reduce and notify.
          decided = true;
          lite = true;
          notice = true;
          emit();
          return;
        }
      } else {
        lowWindows = 0;
      }
      frames = 0;
      windowStart = now;
    }
    raf = requestAnimationFrame(tick);
  };

  const begin = () => {
    // Let the page settle first so load jank doesn't count against the device.
    window.setTimeout(() => {
      if (!decided) raf = requestAnimationFrame(tick);
    }, 2500);
    // Stop watching after a while; if it's been smooth, it'll stay full.
    window.setTimeout(() => {
      decided = true;
      if (raf) cancelAnimationFrame(raf);
    }, 25000);
  };

  if (document.readyState === "complete") begin();
  else window.addEventListener("load", begin, { once: true });
}

// Decide the initial mode synchronously at module load (no first-render flash).
// A saved choice wins; then static heuristics; otherwise start full and plan to
// watch the frame rate after the page mounts.
(function initMode() {
  if (typeof window === "undefined") return;
  const saved = savedMode();
  if (saved === "full") {
    decided = true;
  } else if (saved === "lite") {
    lite = true;
    decided = true;
  } else if (staticLite()) {
    lite = true;
    decided = true; // quiet — expected on these devices
  } else {
    needsMonitor = true;
  }
})();

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (needsMonitor && !decided) monitor();
}

/** User chose to run everything regardless of frame rate. */
export function enableFullExperience() {
  decided = true;
  lite = false;
  notice = false;
  save("full");
  emit();
}

/** User dismissed the notice — keep the reduced visuals and don't nag again. */
export function dismissReducedNotice() {
  notice = false;
  save("lite");
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => listeners.delete(cb);
}

export function useLite(): boolean {
  return useSyncExternalStore(subscribe, () => lite, () => false);
}

/** Whether to show the "effects reduced automatically" notice. */
export function useReducedNotice(): boolean {
  return useSyncExternalStore(subscribe, () => notice, () => false);
}
