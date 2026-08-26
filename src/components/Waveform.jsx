import { useEffect, useState } from 'react';

const BAR_COUNT = 150;
const FLAT_BARS = Array.from({ length: BAR_COUNT }, () => 0.35);

// On a narrow mobile seek bar, cramming all 150 bars into ~100-150px real
// pixels makes each one sub-pixel thin - they blur together into visual
// noise rather than reading as a waveform. Showing fewer, wider bars there
// looks far cleaner (same technique as bucketing in EqualizerBars above).
const MOBILE_BAR_COUNT = 36;
const MOBILE_QUERY = '(max-width: 639px)';

function downsample(data, targetCount) {
  if (targetCount >= data.length) return data;
  const bucket = data.length / targetCount;
  const out = [];
  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < data.length; j++) {
      sum += data[j];
      count++;
    }
    out.push(count > 0 ? sum / count : 0);
  }
  return out;
}

/**
 * Renders `bars` (normalized 0-1 peak values from useWaveform) as an SVG
 * waveform, with the "played" portion recoloured up to `progress` (0-100).
 *
 * Both the muted background bars and the coloured "played" bars are drawn
 * from the exact same geometry inside one viewBox, and the played layer is
 * clipped with an SVG <clipPath> sized to `progress`% of that viewBox width.
 * Because the clip is in viewBox units (not pixels), it always lines up
 * perfectly with the bars underneath no matter how the SVG is actually
 * stretched on screen - simpler and more robust than trying to keep two
 * separately-sized flexbox bar rows in sync.
 */
export default function Waveform({ bars, progress = 0, mutedColor = 'rgba(0,0,0,0.25)', playedColor = '#000' }) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const source = bars ?? FLAT_BARS;
  const data = isMobile ? downsample(source, MOBILE_BAR_COUNT) : source;
  const n = data.length;
  const clipWidth = Math.max(0, Math.min(100, progress)) / 100 * n;

  return (
    <svg viewBox={`0 0 ${n} 40`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <defs>
        <clipPath id="waveform-played-clip">
          <rect x="0" y="0" width={clipWidth} height="40" />
        </clipPath>
      </defs>

      {data.map((v, i) => {
        const h = Math.max(4, v * 36);
        return <rect key={i} x={i + 0.15} y={(40 - h) / 2} width="0.7" height={h} rx="0.35" fill={mutedColor} />;
      })}

      <g clipPath="url(#waveform-played-clip)">
        {data.map((v, i) => {
          const h = Math.max(4, v * 36);
          return <rect key={`p-${i}`} x={i + 0.15} y={(40 - h) / 2} width="0.7" height={h} rx="0.35" fill={playedColor} />;
        })}
      </g>
    </svg>
  );
}
