import { useEffect, useState } from 'react';

// A "comfortable middle" RMS level to normalize every track toward. Chosen
// empirically - most competently mastered pop/electronic tracks sit
// somewhere around here; it's not a broadcast-standard (LUFS) number, just a
// practical reference point for relative loudness matching between tracks
// in this catalog.
const TARGET_RMS = 0.14;

// Clamp how hard normalization is allowed to push a track. Wide swings would
// either audibly distort a track that's already loud (pushing it toward
// clipping) or make a very quiet/ambient track sound artificially pumped up
// with its noise floor raised - the point is to smooth *between-track*
// jumps, not to fight a track's own intentional dynamics.
const MIN_GAIN = 0.55;
const MAX_GAIN = 1.6;

// Module-level cache: once a track's loudness has been measured, reuse the
// result - replaying the same song shouldn't re-fetch and re-decode the
// whole audio file again just to recompute the same number.
const cache = new Map();

/**
 * Downloads and decodes a track (same approach as useWaveform - a separate
 * fetch from what the <audio> element itself streams, since decodeAudioData
 * needs the full buffer up front) and measures its RMS loudness, returning
 * a gain multiplier that brings it toward `TARGET_RMS`. Quiet tracks get
 * boosted, already-loud tracks get pulled down slightly - so back-to-back
 * songs in the queue land at roughly the same perceived volume instead of
 * one being jarringly louder or quieter than the next.
 *
 * Returns 1 (no adjustment) while the measurement is still in flight or if
 * decoding fails for any reason (unsupported format, CORS, etc.) - playback
 * itself is never blocked on this.
 */
export default function useLoudnessGain(audioSrc) {
  const [gain, setGain] = useState(() => cache.get(audioSrc) ?? 1);

  useEffect(() => {
    if (!audioSrc) {
      setGain(1);
      return undefined;
    }

    const cached = cache.get(audioSrc);
    if (cached != null) {
      setGain(cached);
      return undefined;
    }

    setGain(1);
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
        // Sampling every Nth sample (rather than every single one) keeps
        // this fast even on a long track - RMS over a large enough stride
        // converges to essentially the same value as using every sample.
        const step = Math.max(1, Math.floor(raw.length / 200000));
        let sumSquares = 0;
        let count = 0;
        for (let i = 0; i < raw.length; i += step) {
          const v = raw[i];
          sumSquares += v * v;
          count += 1;
        }
        const rms = Math.sqrt(sumSquares / Math.max(1, count)) || 0.0001;
        const computedGain = Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_RMS / rms));

        cache.set(audioSrc, computedGain);
        if (!cancelled) setGain(computedGain);
        ctx.close?.();
      } catch {
        if (!cancelled) setGain(1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioSrc]);

  return gain;
}
