import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublicSongsStore } from '@/lib/publicSongsCache';
import { handleImageError } from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

/** Shelf of the most recently added/updated songs created in the admin
 * (the hand-written catalogue lives in the pages themselves). Renders
 * nothing until at least one admin song exists, so empty sites stay clean. */
export default function NewArrivals({ className, max = 8 }) {
  const songs = usePublicSongsStore((s) => s.songs);
  const latest = useMemo(() => [...songs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, max), [songs, max]);
  if (latest.length === 0) return null;

  return (
    <section className={cn('mt-24 md:mt-32', className)} aria-labelledby="new-arrivals-heading">
      <h2 id="new-arrivals-heading" className="section-heading text-4xl md:text-[3.6em]">
        NEW ARRIVALS
      </h2>
      <ul className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {latest.map((s) => (
          <li key={s.slug}>
            <Link to={s.link} className="group block">
              <img
                src={s.coverSrc}
                alt=""
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                onError={handleImageError}
              />
              <p className="mt-2 truncate font-medium group-hover:text-juow-accent">{s.songTitle}</p>
              <p className="truncate text-sm text-white/60">{s.artistName}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
