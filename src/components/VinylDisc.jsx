import { cn } from '@/lib/utils';

/**
 * A vinyl record rendered entirely in code (SVG), no image asset needed.
 * `labelSrc` fills the center label with a song/album cover; omit it for a
 * plain black label. `spinning` toggles the built-in rotation animation.
 */
export default function VinylDisc({ labelSrc, spinning = false, className, labelId = 'vinyl' }) {
  const grooves = Array.from({ length: 14 }, (_, i) => 46 - i * 3);

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('block', spinning && 'animate-spin [animation-duration:3s]', className)}
      role="img"
      aria-label="Vinyl record"
    >
      <defs>
        <radialGradient id={`${labelId}-sheen`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#4a4a4a" />
          <stop offset="45%" stopColor="#161616" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
        <clipPath id={`${labelId}-clip`}>
          <circle cx="50" cy="50" r="17" />
        </clipPath>
      </defs>

      {/* Vinyl body */}
      <circle cx="50" cy="50" r="49" fill={`url(#${labelId}-sheen)`} stroke="#000" strokeWidth="0.5" />

      {/* Grooves */}
      {grooves.map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
      ))}

      {/* Label */}
      {labelSrc ? (
        <image href={labelSrc} x="33" y="33" width="34" height="34" clipPath={`url(#${labelId}-clip)`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <circle cx="50" cy="50" r="17" fill="#7a1f1f" />
      )}
      <circle cx="50" cy="50" r="17" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />

      {/* Spindle hole */}
      <circle cx="50" cy="50" r="2.2" fill="#000" />
      <circle cx="50" cy="50" r="2.2" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
    </svg>
  );
}
