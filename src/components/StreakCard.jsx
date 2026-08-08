import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Info } from 'lucide-react';
import useCountUp from '@/hooks/useCountUp';

/** Milestones the streak "levels up" at, biggest first - first one the
 * streak meets or exceeds wins. Matches Duolingo/TikTok-style flame
 * escalation: the flame gets hotter-colored and visibly bigger the longer
 * the streak runs, capping out at 500. */
const TIERS = [
  { min: 500, color: '#c084fc', label: 'Legendary', scale: 1.55, glow: true },
  { min: 200, color: '#60a5fa', label: 'Unstoppable', scale: 1.42, glow: true },
  { min: 100, color: '#f472b6', label: 'On fire', scale: 1.3, glow: true },
  { min: 50, color: '#fb7185', label: 'Blazing', scale: 1.22, glow: false },
  { min: 30, color: '#f87171', label: 'Red hot', scale: 1.15, glow: false },
  { min: 20, color: '#fb923c', label: 'Heating up', scale: 1.1, glow: false },
  { min: 10, color: '#f59e0b', label: 'Building', scale: 1.04, glow: false },
  { min: 3, color: '#fbbf24', label: 'Getting started', scale: 1, glow: false },
  { min: 1, color: '#e5e7eb', label: 'Day one', scale: 0.92, glow: false },
  { min: 0, color: '#52525b', label: 'No streak yet', scale: 0.85, glow: false },
];

function getTier(streakDays) {
  return TIERS.find((t) => streakDays >= t.min) ?? TIERS[TIERS.length - 1];
}

export default function StreakCard({ streakDays, delay = 0 }) {
  const animated = useCountUp(streakDays);
  const tier = getTier(streakDays);
  const [infoOpen, setInfoOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!infoOpen) return undefined;
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setInfoOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [infoOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative rounded-lg border border-white/10 bg-white/5 p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-juow-accent">
          <Flame
            className={cnFlame(tier.glow)}
            style={{ color: tier.color, transform: `scale(${tier.scale})`, transformOrigin: 'left center' }}
            fill={streakDays > 0 ? tier.color : 'none'}
          />
          <span className="text-sm text-juow-soft/70">Current streak</span>
        </div>

        <div ref={wrapRef} className="relative">
          <button
            type="button"
            aria-label="About streaks"
            onClick={() => setInfoOpen((v) => !v)}
            onMouseEnter={() => setInfoOpen(true)}
            onMouseLeave={() => setInfoOpen(false)}
            className="flex size-6 items-center justify-center rounded-full text-juow-soft/40 transition-colors hover:bg-white/10 hover:text-juow-soft"
          >
            <Info className="size-4" />
          </button>

          {infoOpen && (
            <div className="absolute top-full right-0 z-20 mt-2 w-64 rounded-lg border border-white/10 bg-[#111] p-4 text-xs leading-relaxed text-juow-soft/80 shadow-2xl">
              <p className="mb-1.5 font-medium text-juow-soft">How streaks work</p>
              <p>
                Your streak counts consecutive days you&apos;ve listened to at least one song. Miss a day and it resets
                to zero.
              </p>
              <p className="mt-2">
                The flame levels up as it grows: <span className="text-juow-soft">1 → 3 → 10 → 20 → 30 → 50 → 100 →
                200 → 500</span> days (max).
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 font-[family-name:var(--font-anton)] text-3xl tabular-nums">{animated} days</p>
      <p className="mt-1 text-sm text-juow-soft/50">{tier.label}</p>
    </motion.div>
  );
}

function cnFlame(glow) {
  return glow ? 'size-5 streak-glow' : 'size-5';
}
