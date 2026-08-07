import { useEffect, useState } from 'react';

const BAR_COUNT = 150;

// Module-level cache: once a song's waveform is decoded, reuse it - toggling
// mini/fullscreen or navigating back to the same track shouldn't re-fetch
// and re-decode the whole audio file again.
const cache = new Map();

/**
 * Downloads and decodes an audio file with the Web Audio API to produce a
 * small array of normalized (0-1) peak-amplitude values, for drawing an
 * actual waveform instead of a flat progress line.
 *
 * This does a *separate* fetch of the audio file from the one the <audio>
 * element itself streams - decodeAudioData needs the full ArrayBuffer up
 * front, it can't work off a streaming media element. For files this size
 * that's a fine trade-off; it's skipped entirely (and cached) on repeat
 * plays of the same track.
 */
export default function useWaveform(audioSrc) {
  const [bars, setBars] = useState(() => cache.get(audioSrc) ?? null);

  useEffect(() => {
    if (!audioSrc) return undefined;

    const cached = cache.get(audioSrc);
    if (cached) {
      setBars(cached);
      return undefined;
    }

    setBars(null);
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(audioSrc);
        const arrayBuffer = await response.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        const raw = audioBuffer.getChannelData(0);
        const blockSize = Math.max(1, Math.floor(raw.length / BAR_COUNT));
        const peaks = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) sum += Math.abs(raw[start + j] ?? 0);
          peaks.push(sum / blockSize);
        }
        const max = Math.max(...peaks) || 1;
        const normalized = peaks.map((v) => v / max);

        cache.set(audioSrc, normalized);
        if (!cancelled) setBars(normalized);
        ctx.close?.();
      } catch {
        // Decoding can fail (unsupported format, CORS, etc.) - the seek bar
        // just falls back to its plain flat-line rendering.
        if (!cancelled) setBars(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioSrc]);

  return bars;
}
