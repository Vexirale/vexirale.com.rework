import { useEffect, useState } from "react";
import { siteConfig } from "../config";

const ABACUS = "https://abacus.jasoncameron.dev";

/** All-time visit counter via the free Abacus API. Counted once per browser
 *  session (sessionStorage); repeat views in the same session just read it.
 *  Returns the total, or null while loading / on failure. */
export function useTotalVisits(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!siteConfig.visitorCounter.enabled) return;

    const ns = encodeURIComponent(siteConfig.visitorCounter.namespace);
    const flag = "vx-total-hit";
    let counted = false;
    try {
      counted = sessionStorage.getItem(flag) === "1";
    } catch {
      /* ignore */
    }

    const url = `${ABACUS}/${counted ? "get" : "hit"}/${ns}/total`;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { value?: number }) => {
        if (typeof data.value === "number") setCount(data.value);
        if (!counted) {
          try {
            sessionStorage.setItem(flag, "1");
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* leave null — the counter just won't render */
      });

    return () => controller.abort();
  }, []);

  return count;
}
