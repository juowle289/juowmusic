import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reproduces the original site's button hover: a solid fill sweeps in from
 * the left on hover, and - unlike a plain CSS reverse-transition - sweeps
 * back out towards the right on mouse-leave too, instead of retreating back
 * to the left. That's done by flipping `transform-origin` between "left" and
 * "right" right as the hover state changes: growing scaleX from 0->1 with
 * origin "left" reveals the fill left-to-right, and shrinking scaleX from
 * 1->0 with origin "right" makes the remaining sliver of colour recede off
 * the right edge - so the visible edge of the sweep always travels left to
 * right, both entering and leaving.
 */
export default function SweepButton({
  as: Component = 'a',
  fillClassName = 'bg-juow-accent',
  hoverTextClassName = 'text-black',
  className,
  children,
  ...props
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Component
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn('relative isolate inline-flex items-center justify-center overflow-hidden', className)}
      {...props}
    >
      <span
        aria-hidden
        className={cn('absolute inset-0 -z-10', fillClassName)}
        style={{
          transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: hovered ? 'left' : 'right',
          transition: 'transform 300ms ease',
        }}
      />
      <span className={cn('relative transition-colors duration-300', hovered && hoverTextClassName)}>
        {children}
      </span>
    </Component>
  );
}
