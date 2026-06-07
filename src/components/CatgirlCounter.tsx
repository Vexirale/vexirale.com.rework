import { useEffect, useState } from "react";
import { siteConfig } from "../config";
import { useTotalVisits } from "../hooks/useTotalVisits";

/** All-time visit counter rendered as digits with a little catgirl above each
 *  one (images from nekos.best). The count works on its own; the catgirls are a
 *  decorative bonus that fails silently if the image API is unreachable. */
export function CatgirlCounter() {
  const total = useTotalVisits();
  const digits = total != null ? String(total) : null;
  const len = digits?.length ?? 0;

  const [imgs, setImgs] = useState<string[]>([]);

  useEffect(() => {
    if (!len) return;
    let cancelled = false;
    fetch(`https://nekos.best/api/v2/neko?amount=${Math.min(len, 20)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const urls = (d?.results ?? [])
          .map((x: { url?: string }) => x.url)
          .filter(Boolean) as string[];
        setImgs(urls);
      })
      .catch(() => {
        /* decorative only */
      });
    return () => {
      cancelled = true;
    };
  }, [len]);

  if (!siteConfig.catgirl.enabled) return null;

  const cells = digits ? digits.split("") : ["", "", ""]; // 3 skeleton cells

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        visitors
      </span>
      <div className="flex items-end gap-1">
        {cells.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="h-7 w-7 overflow-hidden rounded-md border border-white/10 bg-white/[0.05] sm:h-8 sm:w-8">
              {imgs[i] && (
                <img
                  src={imgs[i]}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover object-top"
                />
              )}
            </span>
            <span
              className={`flex h-7 w-6 items-center justify-center rounded-md border border-white/10 bg-black/40 font-mono text-sm font-bold tabular-nums sm:h-8 sm:w-7 ${
                digits ? "text-white" : "animate-pulse text-transparent"
              }`}
            >
              {digits ? d : "0"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
