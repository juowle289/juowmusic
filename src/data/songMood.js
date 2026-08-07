/**
 * Subjective energy/mood (valence) scores per song, both 0..1, used to turn
 * "what you've been listening to" into a weather condition in
 * ListeningWeather. Not derived from any audio-analysis API (this project
 * has none) - just a reasonable read of each track's actual feel, in the
 * same spirit as the country mapping in songCountries.js.
 *
 *   energy: 0 = slow/sparse, 1 = intense/driving
 *   mood:   0 = melancholic, 1 = upbeat/happy
 */
export const SONG_MOOD = {
  chungTaCuaTuongLai: { energy: 0.72, mood: 0.68 },
  hayTraoChoAnh: { energy: 0.78, mood: 0.75 },
  nerves: { energy: 0.85, mood: 0.35 },
  ballroomExtravaganza: { energy: 0.8, mood: 0.5 },
  afterHours: { energy: 0.55, mood: 0.3 },
  oneOfTheGirls: { energy: 0.4, mood: 0.45 },
  theColorViolet: { energy: 0.45, mood: 0.4 },
  blue: { energy: 0.25, mood: 0.2 },
};

export const DEFAULT_MOOD = { energy: 0.5, mood: 0.5 };
