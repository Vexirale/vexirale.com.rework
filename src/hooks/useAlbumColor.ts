import { useEffect, useState } from "react";
import { extractDominantColor, hexToRgb, type Rgb } from "../lib/color";

/** Resolves an accent color from the current album art, falling back to the
 *  static accent whenever nothing is playing or extraction fails/blocks.
 *
 *  Returns an Rgb; consumers animate the change via CSS transition so the
 *  color shifts smoothly (no hard cut) when the track changes. */
export function useAlbumColor(
  albumArtUrl: string | null,
  accentHex: string,
): Rgb {
  const fallback = hexToRgb(accentHex);
  const [color, setColor] = useState<Rgb>(fallback);

  useEffect(() => {
    let cancelled = false;

    if (!albumArtUrl) {
      setColor(fallback);
      return;
    }

    extractDominantColor(albumArtUrl).then((rgb) => {
      if (cancelled) return;
      setColor(rgb ?? fallback);
    });

    return () => {
      cancelled = true;
    };
    // fallback is derived from accentHex; depend on the primitive instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumArtUrl, accentHex]);

  return color;
}
