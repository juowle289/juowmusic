import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radio, Search, X } from 'lucide-react';
import CountryGlobe from '@/components/CountryGlobe';
import SiteFooter from '@/components/SiteFooter';
import { playableTracks } from '@/data/playableTracks';
import { SONG_COUNTRY_ID, COUNTRY_NAMES_BY_ID } from '@/data/songCountries';
import { handleImageError } from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

/**
 * THE METAPHOR: a shortwave radio, dialed around the planet.
 *
 * Spinning the globe (below) is tuning the dial. A country lighting up is a
 * signal coming in. "On Air" is the shelf of whatever's currently playing
 * on that frequency. "Station Log" is the full logbook of every frequency
 * this radio has ever picked up - the dense, browse-everything section
 * this page needed so it didn't read as one lonely globe on a black page.
 *
 * Kept to CSS/Framer Motion only (no new deps, no WebGL) - the globe
 * itself is already hand-rolled CSS/SVG 3D (see CountryGlobe.jsx); this
 * page just gives it a tactile frame and somewhere to go once you've
 * tuned in.
 */

const VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

// How many country groups Station Log shows before "Load more" - keeps
// the page from rendering a huge wall of logbook rows up front if the
// catalog ever grows to cover a few hundred countries.
const LOG_PAGE_SIZE = 6;

/** Same deterministic-scatter approach as CountryGlobe's own starfield
 * (seeded LCG, varied radius/opacity) instead of a tiled CSS
 * background-image - a repeating grid of dots reads as a hard pattern,
 * not open space. Percent-based coordinates on an SVG with
 * preserveAspectRatio="none" so it fills whatever width/height this
 * section ends up being, at any viewport. */
function useScatteredStars(count, seed = 7) {
  return useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    return Array.from({ length: count }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: rand() * 1.3 + 0.25,
      o: rand() * 0.55 + 0.15,
    }));
  }, [count, seed]);
}

function Starfield() {
  const stars = useScatteredStars(220);
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
      {stars.map((star, i) => (
        <circle key={i} cx={`${star.x}%`} cy={`${star.y}%`} r={star.r} fill="#fff" opacity={star.o} />
      ))}
    </svg>
  );
}


function Reveal({ className, delay = 0, as: Component = motion.div, ...props }) {
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={VARIANTS}
      transition={{ delay }}
      className={className}
      {...props}
    />
  );
}

/** A single card on the "On Air" grid. Hovering it pulls it forward and
 * dims its neighbors (Focus-Detach) - `dimmed` is passed down from the
 * grid's own hover state rather than each card tracking its siblings. */
function OnAirCard({ song, countryName, dimmed, onHover }) {
  return (
    <Link
      to={`/lyrics/${song.slug}`}
      onMouseEnter={() => onHover(song.slug)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(song.slug)}
      onBlur={() => onHover(null)}
      className={cn(
        'group relative block transition-all duration-500',
        dimmed ? 'scale-[0.97] opacity-40 blur-[1px]' : 'opacity-100',
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="relative overflow-hidden rounded-md shadow-[0_12px_28px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:scale-[1.04]">
        <img src={song.coverSrc} alt="" className="aspect-square w-full object-cover" onError={handleImageError} />
        <span className="absolute top-2 right-2 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-juow-accent uppercase">
          {countryName}
        </span>
      </div>
      <p className="mt-2 truncate text-sm text-juow-soft">{song.songTitle}</p>
      <p className="truncate text-xs text-juow-soft/45">{song.artistName}</p>
    </Link>
  );
}

/** One row of the Station Log - a logbook entry, not a card. */
function LogRow({ index, song, countryName }) {
  return (
    <Link
      to={`/lyrics/${song.slug}`}
      className="group flex items-center gap-4 border-b border-white/8 px-2 py-3 transition-colors hover:bg-juow-accent sm:px-4"
    >
      <span className="w-10 shrink-0 font-mono text-xs text-juow-soft/30 tabular-nums group-hover:text-black/50">
        {String(index).padStart(2, '0')}
      </span>
      <img src={song.coverSrc} alt="" className="size-11 shrink-0 rounded object-cover" onError={handleImageError} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-juow-soft group-hover:text-black">{song.songTitle}</p>
        <p className="truncate text-xs text-juow-soft/40 group-hover:text-black/60">{song.artistName}</p>
      </div>
      <span className="hidden shrink-0 font-mono text-[11px] text-juow-soft/30 uppercase group-hover:text-black/50 sm:block">
        {countryName}
      </span>
    </Link>
  );
}

export default function ExplorePage() {
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [hoveredSlug, setHoveredSlug] = useState(null);
  const [query, setQuery] = useState('');
  const [visibleLogGroups, setVisibleLogGroups] = useState(LOG_PAGE_SIZE);

  const availableCountryIds = useMemo(() => [...new Set(Object.values(SONG_COUNTRY_ID))], []);

  const songsByCountry = useMemo(() => {
    const map = new Map();
    availableCountryIds.forEach((id) => map.set(id, []));
    playableTracks.forEach((song) => {
      const id = SONG_COUNTRY_ID[song.slug];
      if (id && map.has(id)) map.get(id).push(song);
    });
    return map;
  }, [availableCountryIds]);

  // Both Presets and Station Log read from this one filtered list, so
  // typing in the single search box narrows both at once instead of
  // needing two separate search boxes that could drift out of sync. This
  // is what keeps the page usable once there are a couple hundred
  // countries instead of four - scrolling/scanning a flat list stops
  // being realistic well before then, searching doesn't.
  const filteredCountryIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCountryIds;
    return availableCountryIds.filter((id) => (COUNTRY_NAMES_BY_ID[id] ?? id).toLowerCase().includes(q));
  }, [availableCountryIds, query]);

  // "On Air" shelf: tuned to one frequency (the selected country) once
  // something's been picked, otherwise it's scanning the whole band.
  const onAirSongs = selectedCountryId ? (songsByCountry.get(selectedCountryId) ?? []) : playableTracks;

  const stationName = selectedCountryId ? (COUNTRY_NAMES_BY_ID[selectedCountryId] ?? selectedCountryId) : 'Scanning…';

  // Station Log groups are capped by default (see LOG_PAGE_SIZE) rather
  // than dumping every country's full track list onto the page at once -
  // a search query bypasses the cap since a filtered result set is
  // already small by definition.
  const logIds = query.trim() ? filteredCountryIds : filteredCountryIds.slice(0, visibleLogGroups);
  const hasMoreLogGroups = !query.trim() && filteredCountryIds.length > visibleLogGroups;

  return (
    <div className="min-h-screen bg-black text-juow-soft">
      <main className="mx-auto px-4 pt-28 pb-20 sm:px-8 md:px-16 lg:w-4/5 lg:max-w-[1400px] lg:px-0">
        {/* ---- The Dial (left) + On Air (right), side by side. Roughly
             55/45 - the globe/search column needs the extra room, but
             On Air still gets enough width for a real 2-3 col grid
             instead of a cramped single column. Both columns stretch to
             the taller one (CSS grid's default item stretch, no JS
             height math needed) - On Air scrolls internally to match
             rather than pushing the row taller. ---- */}
        <div className="relative left-1/2 mt-10 w-screen -translate-x-1/2 overflow-hidden bg-black py-16">
          <Starfield />

          <div className="relative mx-auto grid gap-10 px-4 sm:px-8 md:px-16 md:grid-cols-[1.2fr_1fr] lg:w-4/5 lg:max-w-[1400px] lg:px-0">
            {/* LEFT: Explore by Country - heading, globe, search, presets */}
            <Reveal className="mx-auto w-full max-w-xl text-center md:mx-0">
              <p className="flex items-center justify-center gap-2 text-sm tracking-widest text-juow-accent uppercase">
                <Radio className="size-4" /> Worldwide Frequency
              </p>
              <h1 className="section-heading text-4xl md:text-5xl">Explore by Country</h1>
              <p className="mx-auto mt-2 max-w-md text-juow-soft/60">
                Spin the dial. Somewhere on Earth, someone&apos;s playing something you haven&apos;t heard yet —
                click a lit-up country, search below, or a preset chip, to tune in.
              </p>

              <div className="mt-8">
                <CountryGlobe
                  availableIds={availableCountryIds}
                  selectedId={selectedCountryId}
                  onSelectCountry={(country) => setSelectedCountryId(country.id)}
                />

                <div className="mx-auto flex max-w-md items-center justify-center gap-1.5 font-mono text-xs tracking-wider text-juow-soft/50 uppercase">
                  <span
                    className={cn('size-1.5 rounded-full', selectedCountryId ? 'bg-juow-accent' : 'bg-juow-soft/30')}
                    style={selectedCountryId ? { boxShadow: '0 0 6px 1px rgba(254,236,147,0.8)' } : undefined}
                  />
                  {selectedCountryId ? 'Signal locked' : 'No signal'}
                  <span className="text-juow-soft/70">— {stationName}</span>
                </div>

                {/* Search: the one control that scales - typing here
                    narrows both the presets row and the Station Log
                    below together. */}
                <div className="mx-auto mt-8 max-w-md">
                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 focus-within:border-juow-accent">
                    <Search className="size-4 shrink-0 text-juow-soft/40" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search a country…"
                      className="w-full bg-transparent font-mono text-sm text-juow-soft placeholder:text-juow-soft/35 focus:outline-none"
                    />
                    {query && (
                      <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-juow-soft/40 hover:text-juow-soft">
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Presets: horizontal scroll, never wraps - stays
                    exactly one row tall whether there are 4 countries or
                    400. */}
                <div className="mt-4 flex justify-center gap-2 overflow-x-auto px-1 pb-2" style={{ scrollbarWidth: 'thin' }}>
                  {filteredCountryIds.length === 0 ? (
                    <p className="py-1.5 text-sm text-juow-soft/35">No countries match &quot;{query}&quot;.</p>
                  ) : (
                    filteredCountryIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedCountryId((cur) => (cur === id ? null : id))}
                        className={cn(
                          'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                          selectedCountryId === id
                            ? 'border-juow-accent bg-juow-accent/10 text-juow-accent'
                            : 'border-white/15 text-juow-soft/80 hover:border-juow-accent hover:text-juow-accent',
                        )}
                      >
                        <span
                          className={cn('size-1.5 rounded-full', selectedCountryId === id ? 'bg-juow-accent' : 'bg-juow-soft/25')}
                        />
                        {COUNTRY_NAMES_BY_ID[id] ?? id}
                      </button>
                    ))
                  )}
                </div>

                <p className="text-center text-sm text-juow-soft/45">
                  {onAirSongs.length} song{onAirSongs.length === 1 ? '' : 's'} on this frequency.
                </p>
              </div>
            </Reveal>

            {/* RIGHT: On Air - wraps freely, height-matched to the left
                column, scrolls internally past that. */}
            <Reveal delay={0.05} className="flex min-h-0 flex-col md:h-full">
              <div className="flex items-baseline justify-between">
                <h2 className="font-[family-name:var(--font-anton)] text-2xl tracking-wide text-juow-soft md:text-3xl">On Air</h2>
                <span className="font-mono text-xs text-juow-soft/40 uppercase">{stationName}</span>
              </div>

              {onAirSongs.length === 0 ? (
                <p className="mt-6 text-juow-soft/40">Dead air on this frequency — try another preset.</p>
              ) : (
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto pt-1 pr-1 pb-1" style={{ scrollbarWidth: 'thin' }}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                    {onAirSongs.map((song) => (
                      <OnAirCard
                        key={song.slug}
                        song={song}
                        countryName={COUNTRY_NAMES_BY_ID[SONG_COUNTRY_ID[song.slug]] ?? ''}
                        dimmed={hoveredSlug !== null && hoveredSlug !== song.slug}
                        onHover={setHoveredSlug}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </div>

        {/* ---- Scene 3: Station Log (dense show-everything ledger) ---- */}
        <Reveal className="mt-16" delay={0.05}>
          <h2 className="font-[family-name:var(--font-anton)] text-2xl tracking-wide text-juow-soft md:text-3xl">Station Log</h2>
          <p className="mt-1 text-sm text-juow-soft/45">Every frequency this radio has ever logged, grouped by country.</p>

          <div className="mt-6 divide-y divide-white/8 rounded-lg border border-white/10">
            {logIds.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-juow-soft/35">No countries match &quot;{query}&quot;.</p>
            ) : (
              logIds.map((id) => {
                const songs = songsByCountry.get(id) ?? [];
                if (songs.length === 0) return null;
                return (
                  <div key={id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCountryId((cur) => (cur === id ? null : id))}
                      className="flex w-full items-center justify-between bg-white/[0.03] px-2 py-2.5 text-left sm:px-4"
                    >
                      <span className="font-mono text-xs tracking-widest text-juow-accent uppercase">
                        Tuning: {COUNTRY_NAMES_BY_ID[id] ?? id}
                      </span>
                      <span className="font-mono text-[11px] text-juow-soft/35">{songs.length} track{songs.length === 1 ? '' : 's'}</span>
                    </button>
                    {songs.map((song, i) => (
                      <LogRow key={song.slug} index={i + 1} song={song} countryName={COUNTRY_NAMES_BY_ID[id] ?? id} />
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {hasMoreLogGroups && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleLogGroups((v) => v + LOG_PAGE_SIZE)}
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-juow-soft/70 hover:border-juow-accent hover:text-juow-accent"
              >
                Load more countries
              </button>
            </div>
          )}
        </Reveal>
      </main>

      <SiteFooter dark />
    </div>
  );
}
