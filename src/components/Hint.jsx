import { useEffect, useRef, useState } from 'react';
import { useUiHints } from '@/context/UiHintsContext';
import { cn } from '@/lib/utils';

/**
 * A label with an actual leader line connecting it to the specific element
 * it's explaining - not just text floating near it. Position is measured
 * live off `targetRef` (getBoundingClientRect), re-measured on resize/scroll,
 * so it stays correctly pointed at its target across breakpoints without any
 * hand-tuned pixel offsets per screen size.
 *
 * Two leader-line modes:
 * - Default (`offsetX` omitted): label sits directly above the target, line
 *   drops straight down to it. Used by the audio player's hints.
 * - Sideways (`offsetX` set): label is nudged left/right to dodge something
 *   sitting right where the vertical layout would otherwise land it (e.g.
 *   the lyrics page's cover art). The line then runs from the label's own
 *   rendered edge diagonally over to the real target instead of just
 *   hanging uselessly below the label's old position.
 *
 * Renders nothing (not just hidden) when hints are turned off (Settings >
 * Appearance) or before the target has been measured.
 */
export default function Hint({ targetRef, children, className, offsetY = 34, offsetX = 0, dark = false }) {
  const { hintsEnabled } = useUiHints();
  const [rect, setRect] = useState(null);
  const labelRef = useRef(null);
  const [labelRect, setLabelRect] = useState(null);

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
  const hasTarget = hintsEnabled && rect && !(rect.width === 0 && rect.height === 0);

  const targetX = hasTarget ? rect.left + 6 : 0;
  const targetY = hasTarget ? rect.top : 0;
  const horizontal = offsetX !== 0;

  // Clamp so a big sideways nudge can never push the label off the left
  // edge of the viewport (the actual bug being fixed here) - 8px of
  // breathing room from the edge, no matter how large offsetX is.
  const labelX = hasTarget ? Math.max(8, targetX + offsetX) : 0;
  const labelY = hasTarget ? targetY - offsetY : 0;

  // Re-measure the label's own box once it's actually on screen and sized -
  // only needed for the horizontal case, where the line has to start from
  // the label's real (text-dependent, possibly wrapped) edge rather than a
  // guessed one.
  useEffect(() => {
    if (horizontal && hasTarget && labelRef.current) {
      setLabelRect(labelRef.current.getBoundingClientRect());
    } else {
      setLabelRect(null);
    }
  }, [horizontal, hasTarget, labelX, labelY, children]);

  if (!hasTarget) return null;

  const leaderHeight = Math.max(4, offsetY - 4);
  // Roughly 6 dashes + 5 gaps between them, whatever the line's actual
  // length ends up being, so a taller/longer line doesn't just stretch a
  // fixed dash size into a sparse, barely-there row of ticks.
  const dashLength = (len) => Math.max(1, len / 11);
  const lineColorClass = dark ? 'text-black' : 'text-juow-accent/70';
  const dotColorClass = dark ? 'text-black' : 'text-juow-accent';

  let diagonalLine = null;
  if (horizontal && labelRect) {
    const fromRight = offsetX < 0; // label sits left of the target -> line departs from the label's right edge
    const x1 = fromRight ? labelRect.right + 4 : labelRect.left - 4;
    const y1 = labelRect.top + labelRect.height / 2;
    const length = Math.hypot(targetX - x1, targetY - y1);
    diagonalLine = (
      <svg className="pointer-events-none fixed inset-0 z-[70] overflow-visible" width="100%" height="100%" aria-hidden>
        <line
          x1={x1}
          y1={y1}
          x2={targetX}
          y2={targetY}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={`${dashLength(length)} ${dashLength(length)}`}
          className={lineColorClass}
        />
        <circle cx={targetX} cy={targetY} r="2.5" fill="currentColor" className={dotColorClass} />
      </svg>
    );
  }

  return (
    <>
      <div className="pointer-events-none fixed z-[70]" style={{ left: labelX, top: labelY }} aria-hidden>
        <span
          ref={labelRef}
          className={cn(
            'block w-max max-w-[16rem] text-[11px] leading-tight font-semibold',
            // Optional soft dark patch for spots where the hint can land
            // over busy/light content behind it (see GlobalAudioPlayer) -
            // plain text-shadow alone isn't always enough to stay legible.
            // White text (not the usual gold) reads best here; the gold
            // accent is reserved for the plain-background case.
            dark ? 'rounded-md text-white' : 'text-juow-accent',
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
          }}
        >
          {children}
        </span>
        {/* Default (vertical) mode only - straight down from the label to
            the target's top edge, ending in a small dot right on it. */}
        {!horizontal && (
          <svg width="2" height={leaderHeight} className="absolute top-full left-0 overflow-visible">
            <line
              x1="1"
              y1="0"
              x2="1"
              y2={leaderHeight}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray={`${dashLength(leaderHeight)} ${dashLength(leaderHeight)}`}
              className={lineColorClass}
            />
            <circle cx="1" cy={leaderHeight} r="2.5" fill="currentColor" className={dotColorClass} />
          </svg>
        )}
      </div>
      {diagonalLine}
    </>
  );
}
