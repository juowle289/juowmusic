import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Floating "back to top" button. The ring around it fills in as you scroll
 * down the page (a complete circle once you've hit the bottom) and unwinds
 * as you scroll back up - starting point is straight up (12 o'clock),
 * filling counter-clockwise. Only shown once there's meaningfully somewhere
 * to scroll back up to.
 */
export default function ScrollToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0);
      setVisible(scrollTop > 480);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      // sm+: the player bar sits at bottom-[6%] with inset-x-[10%] and is 4.25rem tall,
      // so this button shares its row: same baseline (+ half the height difference
      // to centre it on the bar) and centred inside the bar's 10% right margin.
      // Below sm the bar spans the full width, so it stays just above the bar
      // instead of covering the controls.
      className="fixed bottom-24 right-4 z-40 grid size-12 place-items-center rounded-full bg-black text-white shadow-[0_0.2em_0.8em_rgba(0,0,0,0.35)] transition-transform hover:scale-105 sm:bottom-[calc(6%+0.625rem)] sm:right-[calc(5%-1.5rem)]"
    >
      <svg viewBox="0 0 48 48" className="pointer-events-none absolute inset-0 size-full">
        <circle cx="24" cy="24" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          stroke="var(--color-juow-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          // Starting point at 12 o'clock, filling counter-clockwise as
          // progress grows: rotate(-90deg) moves the SVG circle's default
          // 3-o'clock start up to 12; scaleY(-1) flips the fill direction
          // from its default clockwise to counter-clockwise.
          style={{ transform: 'rotate(-90deg) scaleY(-1)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <ArrowUp className="size-5" />
    </button>
  );
}
