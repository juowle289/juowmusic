import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountryGlobe from '@/components/CountryGlobe';
import SiteFooter from '@/components/SiteFooter';
import { playableTracks } from '@/data/playableTracks';
import { SONG_COUNTRY_ID, COUNTRY_NAMES_BY_ID } from '@/data/songCountries';
import { handleImageError } from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

/**
 * Was previously a tab inside ProfilePage - moved out because it's a
 * catalog-browsing feature (spin the globe, see what songs exist per
 * country), not an account-management one. Living under /profile meant
 * it required being signed in for no real reason, and its full-bleed
 * globe section had to fight the profile page's own boxed sidebar layout
 * to display properly. Public route now: anyone can browse it, signed in
 * or not.
 */
export default function ExplorePage() {
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const availableCountryIds = useMemo(() => [...new Set(Object.values(SONG_COUNTRY_ID))], []);
  const songsInSelectedCountry = useMemo(
    () => (selectedCountryId ? playableTracks.filter((t) => SONG_COUNTRY_ID[t.slug] === selectedCountryId) : []),
    [selectedCountryId],
  );

  return (
    <div className="min-h-screen bg-black text-juow-soft">
      <main className="mx-auto px-4 pt-28 pb-16 sm:px-8 md:px-16 lg:w-4/5 lg:max-w-[1400px] lg:px-0">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <p className="text-sm uppercase tracking-widest text-juow-accent">Discover</p>
          <h1 className="section-heading text-left text-4xl md:text-5xl">Explore by Country</h1>
          <p className="mt-2 max-w-2xl text-juow-soft/60">
            Drag the globe to spin it, or just let it turn — countries that have songs in Juowle light up. Click one
            (or use a chip on the right) to see what&apos;s there.
          </p>
        </motion.div>

        {/* Full-bleed wrapper, same trick as the homepage carousel: breaks
            out of <main>'s max-w column so the "space" backdrop runs edge
            to edge instead of being boxed into a small square that
            matches the globe's own SVG canvas. */}
        <div className="relative left-1/2 mt-8 w-screen -translate-x-1/2 overflow-hidden bg-black py-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden
          />

          <div className="relative mx-auto grid gap-10 px-4 sm:px-8 md:px-16 lg:w-4/5 lg:max-w-[1400px] lg:grid-cols-[minmax(0,640px)_1fr] lg:items-center lg:px-0">
            <div className="mx-auto w-full max-w-[640px] lg:mx-0">
              <CountryGlobe
                availableIds={availableCountryIds}
                selectedId={selectedCountryId}
                onSelectCountry={(country) => setSelectedCountryId(country.id)}
              />
            </div>

            <div className="min-w-0">
              {/* Always visible, whether or not a country is already
                  selected - this is the "go back and pick a different
                  country" escape hatch, not just a one-shot empty state. */}
              <div className="flex flex-wrap gap-2">
                {availableCountryIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedCountryId(id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      selectedCountryId === id
                        ? 'border-juow-accent bg-juow-accent/10 text-juow-accent'
                        : 'border-white/15 text-juow-soft/80 hover:border-juow-accent hover:text-juow-accent',
                    )}
                  >
                    {COUNTRY_NAMES_BY_ID[id] ?? id}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-6">
                {!selectedCountryId ? (
                  <p className="text-juow-soft/70">Pick a highlighted country on the globe, or a chip above, to see its songs here.</p>
                ) : (
                  <>
                    <h3 className="font-[family-name:var(--font-anton)] text-2xl text-juow-soft">
                      {COUNTRY_NAMES_BY_ID[selectedCountryId] ?? 'Selected country'}
                    </h3>
                    <p className="mt-1 text-sm text-juow-soft/50">
                      {songsInSelectedCountry.length} song{songsInSelectedCountry.length === 1 ? '' : 's'}
                    </p>

                    <ul className="mt-5 divide-y divide-white/10">
                      {songsInSelectedCountry.map((song) => (
                        <li key={song.slug}>
                          <Link
                            to={`/lyrics/${song.slug}`}
                            className="flex items-center gap-3 py-3 transition-colors hover:text-juow-accent"
                          >
                            <img src={song.coverSrc} alt="" className="size-12 shrink-0 rounded object-cover" onError={handleImageError} />
                            <div className="min-w-0">
                              <p className="truncate">{song.songTitle}</p>
                              <p className="truncate text-sm text-juow-soft/50">{song.artistName}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter dark />
    </div>
  );
}
