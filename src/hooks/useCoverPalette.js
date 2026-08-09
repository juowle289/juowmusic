import { useEffect, useState } from 'react';

const FALLBACK = {
  gradient: 'linear-gradient(#2a2a2a, #474747)',
  isLight: false,
  accent: '#feec93',
};

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex(n) {
  return clampByte(n).toString(16).padStart(2, '0');
}

/** Mixes an [r,g,b] triple toward black (amount < 0) or white (amount > 0). */
function shade([r, g, b], amount) {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return [r + (target - r) * t, g + (target - g) * t, b + (target - b) * t];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

/**
 * Picks a "poster-worthy" dominant color from sampled pixels - the kind a
 * person would actually pick by eye (a rich accent hue), not a flat average
 * of every pixel. A plain average pulls hard toward muddy gray/brown on any
 * cover that's mostly a dark or neutral background with just an accent of
 * color (very common - moody portraits, grayscale photos with one warm
 * highlight, etc), because the neutral pixels vastly outnumber the colorful
 * ones. Instead: bucket pixels by quantized color, restrict candidates to
 * pixels with actual saturation, and score buckets by how much of the image
 * they cover. Falls back to a plain average only for genuinely monochrome
 * images where no saturated pixels exist at all.
 */
function pickDominantColor(pixels) {
  for (const minSaturation of [0.18, 0.1, 0.05]) {
    const buckets = new Map();
    for (const [r, g, b] of pixels) {
      const [, s, l] = rgbToHsl(r, g, b);
      if (s < minSaturation || l < 0.12 || l > 0.9) continue;
      const key = `${Math.round(r / 20)}_${Math.round(g / 20)}_${Math.round(b / 20)}`;
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
      buckets.set(key, bucket);
    }
    if (buckets.size === 0) continue;
    let best = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket;
    }
    return [best.r / best.count, best.g / best.count, best.b / best.count];
  }

  // Truly monochrome image (no saturated pixels at any threshold) - just average everything.
  let r = 0;
  let g = 0;
  let b = 0;
  for (const px of pixels) {
    r += px[0];
    g += px[1];
    b += px[2];
  }
  return [r / pixels.length, g / pixels.length, b / pixels.length];
}

/**
 * Samples a song's cover image on a tiny offscreen canvas to derive:
 * - a two-stop linear-gradient (a darker shade to a lighter shade of a
 *   deliberately-picked accent color) - matching the look of the original,
 *   hand-authored per-song gradients, but generated automatically from any
 *   cover image so new songs never need a manually written stylesheet.
 * - `isLight`, so hero text can flip between black/white for contrast.
 *
 * Falls back to a neutral dark gradient (white text) if the image hasn't
 * loaded yet, fails to load, or - for a cross-origin image without CORS
 * headers - can't actually be read back out of the canvas.
 */
export default function useCoverPalette(coverSrc) {
  const [palette, setPalette] = useState(FALLBACK);

  useEffect(() => {
    if (!coverSrc) {
      setPalette(FALLBACK);
      return undefined;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const pixels = [];
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue; // skip mostly-transparent pixels
          pixels.push([data[i], data[i + 1], data[i + 2]]);
        }
        if (!pixels.length) throw new Error('No opaque pixels sampled');

        const [dr, dg, db] = pickDominantColor(pixels);

        // A very light, *never-reducing* saturation nudge for genuinely dull
        // picks - NOT a lightness floor/ceiling and NOT a saturation cap.
        // Earlier versions clamped lightness into a fixed "pretty" band and
        // capped saturation at 0.72, which sounds safe but actively wrecked
        // two very different real cases: a deep, dark, already-rich color
        // (e.g. a moody navy album cover) got force-brightened into a much
        // lighter, more cartoonish blue than anyone would have picked by
        // hand; and an already vivid, highly-saturated color (e.g. a bold
        // red backdrop) got its saturation capped down into a duller,
        // washed-out tone. The raw sampled dominant color turned out to
        // already be very close to hand-picked references in testing - so
        // now we only ever nudge saturation *up* a little, and leave
        // lightness exactly as sampled.
        const [h, s, l] = rgbToHsl(dr, dg, db);
        const boostedS = Math.max(s, Math.min(0.85, s * 1.12));
        const [ar, ag, ab] = hslToRgb(h, boostedS, l);

        const [top1, top2, top3] = shade([ar, ag, ab], -0.16);
        const [bot1, bot2, bot3] = shade([ar, ag, ab], 0.16);
        const luminance = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab;

        setPalette({
          gradient: `linear-gradient(#${toHex(top1)}${toHex(top2)}${toHex(top3)}, #${toHex(bot1)}${toHex(bot2)}${toHex(bot3)})`,
          isLight: luminance > 150,
          accent: `#${toHex(ar)}${toHex(ag)}${toHex(ab)}`,
        });
      } catch {
        if (!cancelled) setPalette(FALLBACK);
      }
    };
    img.onerror = () => {
      if (!cancelled) setPalette(FALLBACK);
    };
    img.src = coverSrc;

    return () => {
      cancelled = true;
    };
  }, [coverSrc]);

  return palette;
}
