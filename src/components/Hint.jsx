import { useEffect, useRef, useState } from 'react';
import { useUiHints } from '@/context/UiHintsContext';
import { cn } from '@/lib/utils';

/**
 * A label with an actual leader line connecting it down to the specific
 * element it's explaining - not just text floating near it. Position is
 * measured live off `targetRef` (getBoundingClientRect), re-measured on
 * resize, so it stays correctly pointed at its target across breakpoints
 * without any hand-tuned pixel offsets per screen size.
 *
 * Renders nothing (not just hidden) when hints are turned off (Settings >
 * Appearance) or before the target has been measured.
 */
export default function Hint({ targetRef, children, className, offsetY = 34, offsetX = 0, dark = false }) {
  const { hintsEnabled } = useUiHints();
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!hintsEnabled) return undefined;

    const measure = () => {
      if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
    };
    measure();

    // Fixed-position targets (the player bar's buttons) don't need the
    // scroll listener, but non-fixed targets (e.g. the lyrics block,
    // which scrolls with the page while this label stays viewport-fixed)
    // do, or the line drifts out of sync the moment the page scrolls.
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [hintsEnabled, targetRef]);

  // A `display: none` target (e.g. the crossfade toggle, hidden below the
  // `sm` breakpoint) still returns a rect from getBoundingClientRect, just
  // a zero-sized one - treat that the same as "nothing to point at yet"
  // rather than rendering a stray dot in the viewport corner.
  if (!hintsEnabled || !rect || (rect.width === 0 && rect.height === 0)) return null;

  const anchorX = rect.left + 6;
  const labelBottomY = rect.top - offsetY;
  const leaderHeight = Math.max(4, offsetY - 4);
  // Always render exactly 6 dashes on the leader line, however long it
  // ends up being (a taller line at a bigger offsetY used to keep the
  // same fixed "3 3" dash size, which meant a short, sparse-looking line
  // that didn't visually read as tall as it actually was, still letting
  // it feel like it intrudes on whatever's behind it). 6 dashes + 5 gaps
  // between them is 11 equal segments.
  const dashLength = Math.max(1, leaderHeight / 11);

  return (
    <div className="pointer-events-none fixed z-[70]" style={{ left: anchorX, top: labelBottomY }} aria-hidden>
      <span
        className={cn(
          'block w-max max-w-[16rem] text-[11px] leading-tight font-semibold',
          // Optional soft dark patch for spots where the hint can land
          // over busy/light content behind it (see GlobalAudioPlayer) -
          // plain text-shadow alone isn't always enough to stay legible.
          // White text (not the usual gold) reads best here; the gold
          // accent is reserved for the plain-background case.
          dark ? 'rounded-lg text-white' : 'text-juow-accent',
          className,
        )}
        style={{
          // Dark variant: a radial gradient rather than a flat fill +
          // border-radius, so the dark patch behind the text fades out
          // gradually at its edges instead of showing a visible box
          // outline against whatever it's sitting on top of.
          background: dark
            ? 'radial-gradient(ellipse 100% 140% at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)'
            : undefined,
          padding: dark ? '0.5rem 1.1rem' : undefined,
          textShadow: dark ? undefined : '0 1px 3px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.6)',
          // Nudges just the label sideways, independent of the leader
          // line below (which stays anchored to the real target) - lets a
          // label that would otherwise land on top of something (e.g. the
          // lyric page's cover art) get pulled clear of it while the line
          // still correctly points back at what it's actually labeling.
          transform: offsetX ? `translateX(${offsetX}px)` : undefined,
        }}
      >
        {children}
      </span>
      {/* The actual leader line - straight down from the label's anchor
          point to the target's top edge, ending in a small dot right on it. */}
      <svg width="2" height={leaderHeight} className="absolute top-full left-0 overflow-visible">
        <line
          x1="1"
          y1="0"
          x2="1"
          y2={leaderHeight}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={`${dashLength} ${dashLength}`}
          className={dark ? 'text-black' : 'text-juow-accent/70'}
        />
        <circle cx="1" cy={leaderHeight} r="2.5" fill="currentColor" className={dark ? 'text-black' : 'text-juow-accent'} />
      </svg>
    </div>
  );
}
