import { useEffect, useState } from "react";
import { extractPalette, type Rgb } from "../lib/color";

/** Extract a small color palette from the current album art (for the background
 *  blobs). Returns null when nothing is playing or extraction fails/blocks. */
export function useAlbumPalette(src: string | null): Rgb[] | null {
  const [palette, setPalette] = useState<Rgb[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setPalette(null);
      return;
    }
    extractPalette(src, 5).then((p) => {
      if (!cancelled) setPalette(p);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return palette;
}
