import VinylDisc from '@/components/VinylDisc';

/**
 * The visual for the site's loading screen - a spinning vinyl with a music
 * note bouncing beside it, instead of a generic spinner. Kept as its own
 * component so it can also be reused as the Suspense fallback for lazily
 * loaded routes (see App.jsx), not just the initial page-load gate.
 */
export default function MusicLoader({ label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-20">
        <VinylDisc labelId="pageload" spinning className="size-full [animation-duration:1.4s]" />
        <svg
          viewBox="0 0 24 24"
          className="absolute -right-3 -top-3 size-7 animate-[note-bounce_1.1s_ease-in-out_infinite] fill-juow-accent drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        >
          <path d="M9 17V4.5a1 1 0 0 1 1.2-.98l8 1.6a1 1 0 0 1 .8.98V15a3 3 0 1 1-1.5-2.6V6.9l-6.5-1.3V17a3 3 0 1 1-2 0Z" />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-juow-soft/50">{label}</p>
    </div>
  );
}
