import { useMemo } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { DEFAULT_MOOD, SONG_MOOD } from '@/data/songMood';
import { classifyMood } from '@/lib/mood';

// Two soft, muted colors per condition - kept deliberately low-saturation
// so `mix-blend-mode: screen` (which is what lets this show through the
// site's mostly-solid-black cards/sections) reads as ambient light, not a
// neon wash. 'idle' is near-invisible - nothing playing means nothing to
// react to.
const PALETTES = {
  rain: ['#2f4a7a', '#16213b'],
  cloudy: ['#4b5567', '#262c36'],
  windy: ['#0e93a8', '#0a5f74'],
  clear: ['#a8763a', '#6b4a24'],
  sunny: ['#c47a1f', '#8a5514'],
  idle: ['#1c1c1f', '#111113'],
};

/**
 * Mounted once, at the app root (AppLayout) - a fixed, pointer-events-none
 * pair of large blurred blobs whose colors follow whatever's currently
 * playing (via SONG_MOOD + the same classifyMood used by ListeningWeather),
 * so the "weather" concept isn't boxed into one card on the Profile page.
 * `mix-blend-mode: screen` is what makes this show through solid-black
 * sections instead of only being visible in the gaps between them.
 */
export default function AmbientMoodLighting() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const condition = useMemo(() => {
    if (!isPlaying || !currentSong) return 'idle';
    const m = SONG_MOOD[currentSong.slug] ?? DEFAULT_MOOD;
    return classifyMood(m.energy, m.mood);
  }, [currentSong?.slug, isPlaying]);

  const [colorA, colorB] = PALETTES[condition];
  const active = isPlaying && currentSong;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" style={{ mixBlendMode: 'screen' }} aria-hidden>
      <div
        className="ambient-blob-a absolute size-[70vmax] rounded-full transition-colors duration-[2500ms] ease-out"
        style={{
          top: '-20%',
          left: '-15%',
          backgroundColor: colorA,
          opacity: active ? 0.22 : 0.06,
          filter: 'blur(120px)',
        }}
      />
      <div
        className="ambient-blob-b absolute size-[60vmax] rounded-full transition-colors duration-[2500ms] ease-out"
        style={{
          bottom: '-25%',
          right: '-15%',
          backgroundColor: colorB,
          opacity: active ? 0.18 : 0.05,
          filter: 'blur(120px)',
        }}
      />
    </div>
  );
}
