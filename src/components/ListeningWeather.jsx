import { useMemo } from 'react';
import { DEFAULT_MOOD, SONG_MOOD } from '@/data/songMood';
import { classifyMood, weightedMood } from '@/lib/mood';

const SKY = {
  rain: 'linear-gradient(180deg, #2a323f 0%, #1c222b 55%, #11151b 100%)',
  cloudy: 'linear-gradient(180deg, #454c58 0%, #33383f 60%, #22262c 100%)',
  windy: 'linear-gradient(180deg, #3a4552 0%, #29323c 55%, #1a2027 100%)',
  clear: 'linear-gradient(180deg, #3c4d63 0%, #6b5a4e 55%, #2a2320 100%)',
  sunny: 'linear-gradient(180deg, #4d84a8 0%, #e8a24d 60%, #3a2a1c 100%)',
};

const COPY = {
  rain: { title: 'Light Rain', desc: "Your top plays lean slow and melancholic lately." },
  cloudy: { title: 'Overcast', desc: 'A mixed bag of moods this week — no clear front.' },
  windy: { title: 'Windy', desc: 'High-energy, high-intensity tracks have been on repeat.' },
  clear: { title: 'Clear Skies', desc: 'Calm, easy-going listening — nothing too intense.' },
  sunny: { title: 'Sunny', desc: 'Upbeat, feel-good tracks are dominating your rotation.' },
};

/** Weighted-average energy/mood (from SONG_MOOD) across the given songs ->
 * one of 5 weather conditions. Deliberately just a couple of thresholds on
 * two axes rather than anything fancier - the point is that real listening
 * data drives which one shows, not the exact shape of the mapping. */

/** Deterministic pseudo-random in [0,1) - drop/cloud/star positions should
 * be stable across re-renders without reaching for Math.random(). */
function pseudo(i, salt = 1) {
  const x = Math.sin(i * 12.9898 * salt + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export default function ListeningWeather({ topSongs }) {
  const { energy, mood, condition } = useMemo(() => {
    const { energy: avgEnergy, mood: avgMood } = weightedMood(topSongs, SONG_MOOD, DEFAULT_MOOD);
    return { energy: avgEnergy, mood: avgMood, condition: classifyMood(avgEnergy, avgMood) };
  }, [topSongs]);

  const raindrops = useMemo(
    () =>
      condition === 'rain'
        ? Array.from({ length: 46 }, (_, i) => ({
            left: pseudo(i) * 100,
            delay: pseudo(i, 2) * 1.4,
            duration: 0.9 + pseudo(i, 3) * 0.6,
            height: 10 + pseudo(i, 4) * 14,
          }))
        : [],
    [condition],
  );

  const windLines = useMemo(
    () =>
      condition === 'windy'
        ? Array.from({ length: 9 }, (_, i) => ({
            top: 10 + pseudo(i, 5) * 75,
            delay: pseudo(i, 6) * 1.6,
            duration: 1.1 + pseudo(i, 7) * 0.8,
            width: 40 + pseudo(i, 8) * 60,
          }))
        : [],
    [condition],
  );

  const clouds = useMemo(() => {
    const count = condition === 'cloudy' ? 5 : condition === 'clear' || condition === 'sunny' ? 2 : 3;
    return Array.from({ length: count }, (_, i) => ({
      top: 8 + pseudo(i, 9) * 40,
      left: pseudo(i, 10) * 70,
      scale: 0.7 + pseudo(i, 11) * 0.8,
      duration: 14 + pseudo(i, 12) * 10,
      opacity: condition === 'cloudy' ? 0.5 : 0.28,
    }));
  }, [condition]);

  const copy = COPY[condition];
  const energyPct = Math.round(energy * 100);
  const moodPct = Math.round(mood * 100);

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-white/10">
      <div className="relative h-52 overflow-hidden sm:h-60" style={{ background: SKY[condition] }}>
        {/* Stars - subtle everywhere but the sunny sky, purely atmospheric */}
        {condition !== 'sunny' && (
          <div className="absolute inset-0" aria-hidden>
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="weather-twinkle absolute rounded-full bg-white"
                style={{
                  top: `${pseudo(i, 20) * 55}%`,
                  left: `${pseudo(i, 21) * 100}%`,
                  width: 1 + pseudo(i, 22) * 1.4,
                  height: 1 + pseudo(i, 22) * 1.4,
                  animationDuration: `${2 + pseudo(i, 23) * 3}s`,
                  animationDelay: `${pseudo(i, 24) * 3}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Sun */}
        {(condition === 'sunny' || condition === 'clear') && (
          <div
            className="weather-sun absolute rounded-full"
            aria-hidden
            style={{
              width: condition === 'sunny' ? 92 : 60,
              height: condition === 'sunny' ? 92 : 60,
              top: condition === 'sunny' ? 26 : 34,
              right: 48,
              background: condition === 'sunny' ? '#ffd873' : '#f4d9a8',
              boxShadow:
                condition === 'sunny' ? '0 0 60px 18px rgba(255,216,115,0.55)' : '0 0 30px 8px rgba(244,217,168,0.3)',
            }}
          />
        )}

        {/* Clouds */}
        {clouds.map((c, i) => (
          <div
            key={i}
            className="weather-cloud absolute rounded-full bg-white blur-md"
            aria-hidden
            style={{
              top: `${c.top}%`,
              left: `${c.left}%`,
              width: 90 * c.scale,
              height: 34 * c.scale,
              opacity: c.opacity,
              animationDuration: `${c.duration}s`,
            }}
          />
        ))}

        {/* Rain */}
        {raindrops.map((d, i) => (
          <span
            key={i}
            className="weather-raindrop absolute w-px bg-gradient-to-b from-transparent via-sky-200/70 to-transparent"
            aria-hidden
            style={{
              left: `${d.left}%`,
              height: d.height,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}

        {/* Wind streaks */}
        {windLines.map((w, i) => (
          <span
            key={i}
            className="weather-wind absolute h-px bg-white/50"
            aria-hidden
            style={{
              top: `${w.top}%`,
              width: w.width,
              animationDuration: `${w.duration}s`,
              animationDelay: `${w.delay}s`,
            }}
          />
        ))}

        {/* Copy overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
          <p className="text-xs tracking-widest text-white/60 uppercase">Listening Weather</p>
          <h3 className="font-[family-name:var(--font-anton)] text-2xl text-white">{copy.title}</h3>
          <p className="mt-1 max-w-md text-sm text-white/70">{copy.desc}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 bg-white/5 px-5 py-4">
        <MoodBar label="Energy" value={energyPct} />
        <MoodBar label="Mood" value={moodPct} />
        <p className="ml-auto text-xs text-juow-soft/40">Based on your top {topSongs.length} songs</p>
      </div>
    </div>
  );
}

function MoodBar({ label, value }) {
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-xs text-juow-soft/60">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-juow-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
