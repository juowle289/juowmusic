/**
 * The visual for the site's loading screen - 3 vertical soundwave bars
 * bouncing at staggered offsets, instead of a generic spinner. Kept as its
 * own component so it can also be reused as the Suspense fallback for
 * lazily loaded routes (see App.jsx), not just the initial page-load gate.
 */
export default function MusicLoader({ label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex h-14 items-end gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 origin-bottom rounded-full bg-juow-accent animate-[soundbar-bounce_1s_ease-in-out_infinite]"
            style={{ height: '100%', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-juow-soft/50">{label}</p>
    </div>
  );
}
