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

  const dropdownVisible = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Search bar: the icon lives inside the field itself (no separate icon
          button). Narrow on phones so it still fits next to the logo and the
          hamburger, wider from `sm` up. */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-[2px] border bg-[color-mix(in_srgb,var(--color-juow-soft)_5%,transparent)] px-3 py-1.5 transition-colors duration-200 sm:px-3.5 sm:py-2',
          open ? 'border-juow-accent' : 'border-[color-mix(in_srgb,var(--color-juow-soft)_30%,transparent)] hover:border-juow-accent',
        )}
      >
        <Search className="size-4 shrink-0 text-[color-mix(in_srgb,var(--color-juow-soft)_50%,transparent)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search..."
          role="combobox"
          aria-label="Search songs and artists"
          aria-expanded={dropdownVisible}
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          className="w-20 bg-transparent text-sm text-juow-soft outline-none placeholder:text-[color-mix(in_srgb,var(--color-juow-soft)_40%,transparent)] sm:w-40 md:w-48"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus({ preventScroll: true });
            }}
            aria-label="Clear search"
            className="shrink-0 text-[color-mix(in_srgb,var(--color-juow-soft)_40%,transparent)] hover:text-juow-soft"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {dropdownVisible && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[2px] border border-white/10 bg-black text-juow-soft shadow-2xl [--color-juow-soft:#f5f5fc] [--color-juow-accent:#feec93]"
          >
            <div className="max-h-72 overflow-y-auto">
              {!hasResults && (
                <p className="px-4 py-6 text-center text-sm text-white/50">No results found</p>
              )}

              {results.map((result, index) => {
                const isActive = index === activeIndex;
                const isArtist = result.type === 'artist';
                const item = result.data;
                return (
                  <button
                    key={result.key}
                    id={`search-result-${index}`}
                    ref={(el) => (itemRefs.current[index] = el)}
                    type="button"
                    onClick={() => goTo(item.link)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-white/10 px-3 py-3 text-left transition-colors',
                      isActive ? 'bg-juow-accent text-black' : 'hover:bg-juow-accent hover:text-black',
                    )}
                  >
                    {isArtist ? (
                      <>
                        <img src={item.avtArtist} alt="" className="size-12 rounded-full object-cover" onError={handleImageError} />
                        <div className="min-w-0">
                          <p className="truncate font-[family-name:var(--font-anton)]">{item.nameArtist}</p>
                          <p className="text-sm opacity-80">Artist · Pop</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <img src={item.imgSrc} alt="" className="size-12 object-cover" onError={handleImageError} />
                        <div className="min-w-0">
                          <p className="truncate font-[family-name:var(--font-anton)]">{item.title}</p>
                          <p className="truncate text-sm opacity-80">{item.artist}</p>
                          <p className="flex items-center gap-1 text-xs opacity-70">
                            <Eye className="size-3" /> {item.views}
                          </p>
                        </div>
                      </>
                    )}
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
