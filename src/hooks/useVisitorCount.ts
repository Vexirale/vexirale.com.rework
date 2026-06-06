import { useEffect, useState } from "react";
import { siteConfig } from "../config";

const ABACUS = "https://abacus.jasoncameron.dev";

/** ISO-8601 week key like "2026-W23" (Mon-based, used to bucket the count by
 *  week so the counter shows "visitors this week"). */
function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Weekly visitor counter via the free Abacus API (no backend).
 *
 *  Each ISO week gets its own key. A visitor is counted once per week (tracked
 *  in localStorage); repeat visits within the week just read the value. Returns
 *  the count, or null while loading / on failure (callers degrade gracefully). */
export function useVisitorCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!siteConfig.visitorCounter.enabled) return;

    const ns = encodeURIComponent(siteConfig.visitorCounter.namespace);
    const week = isoWeekKey();
    const key = encodeURIComponent(`week-${week}`);
    const flag = `vx-visit-${week}`;

    let alreadyCounted = false;
    try {
      alreadyCounted = localStorage.getItem(flag) === "1";
    } catch {
      // localStorage may be blocked (private mode); just count as a hit.
    }

    // Hit increments + returns; get only reads.
    const url = `${ABACUS}/${alreadyCounted ? "get" : "hit"}/${ns}/${key}`;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { value?: number }) => {
        if (typeof data.value === "number") setCount(data.value);
        if (!alreadyCounted) {
          try {
            localStorage.setItem(flag, "1");
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        // Service down / blocked — leave count null so the UI hides it.
      });

    return () => controller.abort();
  }, []);

  return count;
}
