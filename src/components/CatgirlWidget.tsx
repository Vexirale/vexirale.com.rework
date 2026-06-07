import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { siteConfig } from "../config";

interface Pic {
  url: string;
  artist?: string;
  source?: string;
}

const API = "https://nekos.best/api/v2/neko?amount=1";
const ROTATE_MS = 15000;

/** A small decorative widget that shows a rotating catgirl image (nekos.best).
 *  Click for a new one; auto-rotates while the tab is visible. Purely cosmetic
 *  — fails silently (renders nothing) if the API is unreachable. */
export function CatgirlWidget() {
  const reduced = useReducedMotion();
  const [pic, setPic] = useState<Pic | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  const next = useCallback(async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const r = data?.results?.[0];
      if (!r?.url) throw new Error();
      // Preload so the swap is smooth (no blank flash).
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = r.url;
      });
      if (!mounted.current) return;
      setPic({ url: r.url, artist: r.artist_name, source: r.source_url });
      setLoading(false);
    } catch {
      if (mounted.current && !pic) setFailed(true);
    }
  }, [pic]);

  useEffect(() => {
    mounted.current = true;
    next();
    const id = setInterval(() => {
      if (!document.hidden) next();
    }, ROTATE_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
    // run once; `next` closes over pic but we only need it to kick off + tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!siteConfig.catgirl.enabled || failed) return null;

  return (
    <button
      type="button"
      onClick={() => next()}
      title={
        pic?.artist ? `art by ${pic.artist} — click for another` : "click for another"
      }
      aria-label="Show another catgirl"
      className="group/cat relative h-16 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:h-20 sm:w-44"
    >
      {loading || !pic ? (
        <span className="flex h-full w-full items-center justify-center text-white/30">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.img
            key={pic.url}
            src={pic.url}
            alt="catgirl"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </AnimatePresence>
      )}
      {/* tiny heart badge */}
      <span className="pointer-events-none absolute bottom-1 right-1 text-rose-300/90 drop-shadow">
        <Heart className="h-3 w-3" fill="currentColor" />
      </span>
    </button>
  );
}
