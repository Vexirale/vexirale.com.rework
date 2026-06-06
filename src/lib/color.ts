/* Tiny client-side dominant-color sampler for album art.
 *
 * Reading pixels from a remote image requires the host to allow cross-origin
 * canvas reads, so we set crossOrigin = "anonymous". If the read is blocked by
 * CORS (a tainted canvas throws on getImageData), we catch it and the caller
 * falls back to the static accent color. This never throws to the caller. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbToRgba({ r, g, b }: Rgb, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Parse "#rgb" / "#rrggbb" into an Rgb. Falls back to white on bad input. */
export function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(h, 16);
  if (Number.isNaN(int) || h.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

/** Score a color so we prefer vivid, mid-bright pixels over grey/black/white. */
function vibrancy({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 2 / 255;
  // Penalise very dark and very light pixels; reward saturation.
  const lightnessWeight = 1 - Math.abs(lightness - 0.55) * 1.4;
  return saturation * Math.max(lightnessWeight, 0.05);
}

/** Resolve to the most vibrant dominant color, or null if unavailable/blocked. */
export function extractDominantColor(src: string): Promise<Rgb | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const size = 32; // downscale — we only need an approximate color
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Bucket colors and track the best-scoring vivid one, plus a fallback
        // average in case nothing is vivid.
        let best: Rgb | null = null;
        let bestScore = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 125) continue;
          const c: Rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
          sumR += c.r;
          sumG += c.g;
          sumB += c.b;
          count += 1;
          const score = vibrancy(c);
          if (score > bestScore) {
            bestScore = score;
            best = c;
          }
        }

        if (count === 0) return resolve(null);

        if (best && bestScore > 0.12) return resolve(best);

        // No vivid pixel — fall back to the average.
        return resolve({
          r: Math.round(sumR / count),
          g: Math.round(sumG / count),
          b: Math.round(sumB / count),
        });
      } catch {
        // Tainted canvas / CORS block — let the caller use the static accent.
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function colorDist(a: Rgb, b: Rgb): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

/** Extract up to `count` distinct prominent colors from an image, ranked by
 *  frequency × vibrancy. Returns null if unavailable / blocked by CORS. Used to
 *  color the background blobs from the current album art. */
export function extractPalette(
  src: string,
  count = 5,
): Promise<Rgb[] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const size = 40;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Quantize into 4-bit-per-channel buckets, accumulating averages.
        const buckets = new Map<
          number,
          { r: number; g: number; b: number; n: number; score: number }
        >();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 125) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          let bk = buckets.get(key);
          if (!bk) {
            bk = { r: 0, g: 0, b: 0, n: 0, score: 0 };
            buckets.set(key, bk);
          }
          bk.r += r;
          bk.g += g;
          bk.b += b;
          bk.n += 1;
          bk.score += vibrancy({ r, g, b });
        }
        if (buckets.size === 0) return resolve(null);

        const ranked = [...buckets.values()]
          .map((b) => ({
            color: {
              r: Math.round(b.r / b.n),
              g: Math.round(b.g / b.n),
              b: Math.round(b.b / b.n),
            },
            weight: b.n * (0.35 + b.score / b.n),
          }))
          .sort((a, b) => b.weight - a.weight);

        // Pick distinct colors (keep them visibly different).
        const picked: Rgb[] = [];
        for (const { color } of ranked) {
          if (picked.length >= count) break;
          if (picked.every((p) => colorDist(p, color) > 48)) picked.push(color);
        }
        resolve(picked.length ? picked : null);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = src;
  });
}
