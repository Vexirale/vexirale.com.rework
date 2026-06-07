import { useState } from "react";
import { siteConfig } from "../config";

/** All-time visit counter rendered by Moe Counter (count.getloli.com): a cute
 *  image where themed characters hold up each digit. It counts automatically on
 *  load (no backend of ours). Hides itself if the image can't be loaded. */
export function CatgirlCounter() {
  const c = siteConfig.moeCounter;
  const [failed, setFailed] = useState(false);

  if (!c.enabled || !c.name || failed) return null;

  // padding=1 → no leading zeros (show the real number only).
  const src = `https://count.getloli.com/get/@${encodeURIComponent(
    c.name,
  )}?theme=${encodeURIComponent(c.theme)}&padding=1`;

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        total views
      </span>
      <img
        src={src}
        alt="Visitor counter"
        onError={() => setFailed(true)}
        className="h-11 w-auto max-w-[55vw] object-contain object-right sm:h-12 sm:max-w-[260px]"
      />
    </div>
  );
}
