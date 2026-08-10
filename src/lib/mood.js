/**
 * Weighted-average energy/mood (0..1 each, see data/songMood.js) -> one of
 * 5 "conditions". Shared by ListeningWeather (a snapshot of top songs) and
 * AmbientMoodLighting (whatever's playing right now), so the same
 * energy/mood numbers always mean the same condition everywhere on the
 * site, instead of two components quietly drifting out of sync.
 */
export function classifyMood(energy, mood) {
  if (mood < 0.42 && energy < 0.55) return 'rain';
  if (energy >= 0.62 && mood >= 0.5) return 'sunny';
  if (energy >= 0.62 && mood < 0.5) return 'windy';
  if (mood >= 0.58 && energy < 0.55) return 'clear';
  return 'cloudy';
}

/** Weighted mean of energy/mood across a list of { slug, plays? } items,
 * looking each one up in `moodBySlug` (falls back to `defaultMood`). */
export function weightedMood(items, moodBySlug, defaultMood) {
  let weightSum = 0;
  let energySum = 0;
  let moodSum = 0;
  for (const item of items) {
    const m = moodBySlug[item.slug] ?? defaultMood;
    const w = item.plays ?? 1;
    weightSum += w;
    energySum += m.energy * w;
    moodSum += m.mood * w;
  }
  return {
    energy: weightSum ? energySum / weightSum : 0.5,
    mood: weightSum ? moodSum / weightSum : 0.5,
  };
}
