import { useUiHints } from '@/context/UiHintsContext';
import { cn } from '@/lib/utils';

/**
 * Faint "(•)⎯⎯⎯⎯[hint text]" label. Renders nothing when hints are
 * turned off (Settings > Appearance) - not just hidden via CSS, actually
 * unmounted, so it can't be tabbed to or read by a screen reader either.
 */
export default function Hint({ children, dark, className }) {
  const { hintsEnabled } = useUiHints();
  if (!hintsEnabled) return null;

  return (
    <span
      className={cn(
        'pointer-events-none inline-flex items-center gap-1.5 text-[11px] tracking-wide select-none',
        dark ? 'text-white/35' : 'text-black/35',
        className,
      )}
    >
      <span>(•)</span>
      <span className={cn('inline-block h-px w-8', dark ? 'bg-white/25' : 'bg-black/25')} aria-hidden />
      {children}
    </span>
  );
}
