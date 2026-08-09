import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchAll } from '@/data/songs';
import { handleImageError } from '@/lib/imageFallback';

/**
 * A small, self-contained search dropdown anchored under the header search icon.
 *
 * Note: this intentionally avoids the shadcn/Radix Popover. Radix mounts its
 * content in a portal and moves focus into it as soon as it opens, and on this
 * page that focus change was making the browser scroll the freshly-focused
 * (but not-yet-positioned) element into view - which looked like the whole
 * page jumping back to the top the moment you clicked the search icon.
 * A plain absolutely-positioned dropdown avoids that entirely.
 */
export default function SearchBox() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  const { matchedSongs, matchedArtists } = searchAll(query);
  const hasResults = matchedSongs.length > 0 || matchedArtists.length > 0;
  const showResults = query.trim().length > 0 && hasResults;

  // Flat, render-order list so arrow-key navigation can move through
  // artists then songs the same way the eye sees them on screen.
  const results = [
    ...matchedArtists.map((artist) => ({ type: 'artist', key: artist.nameArtist, link: artist.link, data: artist })),
    ...matchedSongs.map((song) => ({ type: 'song', key: song.title, link: song.link, data: song })),
  ];

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, results.length);
  }, [results.length]);

  // Reset the highlighted item whenever the query (and therefore the result
  // list) changes, so an old selection doesn't linger over new results.
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus({ preventScroll: true });

    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const goTo = (link) => {
    setQuery('');
    setOpen(false);
    if (!link || link === '#') return;
    navigate(link);
  };

  const handleInputKeyDown = (event) => {
    if (!showResults) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => {
        const next = current < results.length - 1 ? current + 1 : 0;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => {
        const next = current > 0 ? current - 1 : results.length - 1;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        goTo(results[activeIndex].link);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-10 items-center justify-center rounded-full text-juow-soft transition-colors hover:text-juow-accent"
        aria-label="Search"
      >
        <Search className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+0.75rem)] w-80 overflow-hidden rounded-lg border border-white/10 bg-black text-juow-soft shadow-2xl"
          >
          <div className="flex items-center gap-2 border-b border-white/10 p-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search for songs..."
              role="combobox"
              aria-expanded={showResults}
              aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
              className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-juow-soft outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-juow-accent/40"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close search"
              className="shrink-0 text-white/50 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {!showResults && query.trim() && (
              <p className="px-4 py-6 text-center text-sm text-white/50">No results found</p>
            )}

            {results.map((result, index) => {
              const isActive = index === activeIndex;
              if (result.type === 'artist') {
                const artist = result.data;
                return (
                  <button
                    key={result.key}
                    id={`search-result-${index}`}
                    ref={(el) => (itemRefs.current[index] = el)}
                    type="button"
                    onClick={() => goTo(artist.link)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-white/10 px-3 py-3 text-left transition-colors',
                      isActive ? 'bg-juow-accent text-black' : 'hover:bg-juow-accent hover:text-black',
                    )}
                  >
                    <img src={artist.avtArtist} alt="" className="size-12 rounded-full object-cover" onError={handleImageError} />
                    <div className="min-w-0">
                      <p className="truncate font-[family-name:var(--font-anton)]">{artist.nameArtist}</p>
                      <p className="text-sm opacity-80">Artist · Pop</p>
                    </div>
                  </button>
                );
              }

              const song = result.data;
              return (
                <button
                  key={result.key}
                  id={`search-result-${index}`}
                  ref={(el) => (itemRefs.current[index] = el)}
                  type="button"
                  onClick={() => goTo(song.link)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-white/10 px-3 py-3 text-left transition-colors',
                    isActive ? 'bg-juow-accent text-black' : 'hover:bg-juow-accent hover:text-black',
                  )}
                >
                  <img src={song.imgSrc} alt="" className="size-12 object-cover" onError={handleImageError} />
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-anton)]">{song.title}</p>
                    <p className="truncate text-sm opacity-80">{song.artist}</p>
                    <p className="flex items-center gap-1 text-xs opacity-70">
                      <Eye className="size-3" /> {song.views}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
