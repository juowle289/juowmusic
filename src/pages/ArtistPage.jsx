import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import Loader from '@/components/Loader';
import useCoverPalette from '@/hooks/useCoverPalette';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';

import sonTung from '@/data/artists/son-tung-mtp.json';
import theWeeknd from '@/data/artists/the-weeknd.json';
import { handleImageError } from '@/lib/imageFallback';

const ARTISTS = {
  'son-tung-mtp': sonTung,
  'the-weeknd': theWeeknd,
};

/** Palette lifted 1:1 from the original css/artist.css custom properties. */
const COLOR = {
  main: '#feec93',
  white: '#f5f5fc',
  gray: '#ddd',
  gray2: '#979797',
  blue: '#337ab7',
};
// Responsive shadow/glow/text-shadow classes - lighter/thinner on mobile
// (dense stacked cards make the desktop-tuned shadow feel heavy at that
// size), unchanged from `sm:` up. Used wherever a card previously only had
// a fixed inline `style={{ boxShadow: ... }}` (an inline style can't vary
// by breakpoint the way a className can).
const CARD_SHADOW = 'shadow-[1px_1px_3px_rgba(0,0,0,0.06)] sm:shadow-[1px_1px_5px_rgba(0,0,0,0.1)]';
const GLOW_SHADOW = 'drop-shadow-[0px_0px_4px_rgba(0,0,0,0.25)] sm:drop-shadow-[0px_0px_10px_rgba(0,0,0,0.5)]';
const TITLE_SHADOW = '[text-shadow:0px_1px_2px_rgba(0,0,0,0.12)] sm:[text-shadow:0px_3px_5px_rgba(0,0,0,0.25)]';

/** Mixes a '#rrggbb' color toward black (amount < 0) or white (amount > 0)
 * and returns it as an rgba() string at the given alpha - same idea as the
 * shade() helper useCoverPalette uses internally to build its gradients. */
function tint(hex, amount, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const nr = Math.round(r + (t - r) * p);
  const ng = Math.round(g + (t - g) * p);
  const nb = Math.round(b + (t - b) * p);
  return `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
}

function resolveLink(link) {
  if (!link) return null;
  if (link.type === 'artist') return `/artist/${link.slug}`;
  if (link.type === 'lyric') return `/lyrics/${link.slug}`;
  return null;
}

function ScrollControls({ onLeft, onRight }) {
  return (
    <div className="flex items-center gap-3 pr-[3%] text-black">
      <div className="hidden items-center gap-3 sm:flex">
        <button
          type="button"
          onClick={onLeft}
          aria-label="Scroll left"
          className="grid size-7 place-items-center rounded-full border border-transparent text-lg transition-colors duration-200 hover:border-black hover:bg-black hover:text-[#feec93]"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRight}
          aria-label="Scroll right"
          className="grid size-7 place-items-center rounded-full border border-transparent text-lg transition-colors duration-200 hover:border-black hover:bg-black hover:text-[#feec93]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <span className="cursor-pointer rounded-2xl border border-black px-3 py-1 text-sm transition-colors duration-200 hover:bg-black hover:text-[#feec93]">
        See All
      </span>
    </div>
  );
}

function SectionHeading({ id, children, controls }) {
  return (
    <div className="flex items-center justify-between border-b border-[#ddd] px-4 pb-4 pt-4 sm:px-6">
      <h1
        id={id}
        className={cn(
          'scroll-mt-24 font-[family-name:var(--font-anton)] text-2xl font-bold sm:text-4xl',
          TITLE_SHADOW,
        )}
      >
        {children}
      </h1>
      {controls}
    </div>
  );
}

function BioRow({ icon, label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-black/5 p-2 text-sm last:border-b-0 sm:text-base">
      <span className="flex shrink-0 items-center gap-1 text-black/80">
        <i className={icon} /> {label}
      </span>
      <span className="text-right font-medium break-words">{value}</span>
    </div>
  );
}

function LinkIcon({ href, icon, color }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="grid size-8 place-items-center rounded-full border border-[#ddd] bg-white text-center text-lg transition-transform duration-200 hover:scale-110"
    >
      <i className={icon} style={{ color: color || '#000' }} />
    </a>
  );
}

function FanbaseCard({ icon, iconColor, platform, number, label, bg }) {
  return (
    <div
      className={cn('flex h-40 w-40 shrink-0 cursor-pointer flex-col justify-between rounded-md p-3 text-center', CARD_SHADOW)}
      style={{ background: bg || '#f0f0f0' }}
    >
      <div>
        <i className={icon} style={{ color: iconColor }} />
        <span className="ml-1 text-black/75">{platform}</span>
      </div>
      <span className="text-2xl text-black">{number}</span>
      <span className="text-black/75">{label}</span>
    </div>
  );
}

function SongCard({ img, title, artist, date, to }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp
      to={to}
      className={cn(
        'group relative flex h-fit w-[78vw] max-w-[23.8em] shrink-0 gap-2.5 rounded-md border border-[#ddd] bg-white p-2 sm:w-[23.8em] sm:gap-4',
        CARD_SHADOW,
      )}
    >
      <img src={img} alt="" className="size-20 shrink-0 rounded object-cover sm:size-24" onError={handleImageError} />
      <div className="flex min-w-0 flex-col justify-between py-1">
        <div className="min-w-0 overflow-hidden border-b border-[#ddd] pb-1">
          <h5 className="truncate text-sm font-bold sm:text-base" style={{ color: COLOR.blue }}>
            {title}
          </h5>
          <span className="truncate text-xs text-black/60 sm:text-sm">{artist}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-black/60 sm:text-sm">
          <i className="bi bi-calendar4-event" />
          <span>{date}</span>
        </div>
      </div>
      {to && (
        <i
          className={cn(
            'bi bi-play-circle-fill pointer-events-none absolute left-[8%] top-[22%] hidden text-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block',
            GLOW_SHADOW,
          )}
          style={{ color: COLOR.main }}
        />
      )}
    </Comp>
  );
}

function AlbumCard({ img, title, meta }) {
  return (
    <div className={cn('group relative h-fit w-60 shrink-0 cursor-pointer rounded-md border border-[#ddd] bg-white text-center', CARD_SHADOW)}>
      <img src={img} alt="" className="aspect-square w-full rounded object-cover" onError={handleImageError} />
      <h5 className="mt-2 truncate px-2 font-bold" style={{ color: COLOR.blue }}>
        {title}
      </h5>
      <span className="block px-2 pb-2 text-sm text-black/60">{meta}</span>
      <i
        className={cn(
          'bi bi-play-circle-fill pointer-events-none absolute right-[5%] top-[55%] text-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          GLOW_SHADOW,
        )}
        style={{ color: COLOR.main }}
      />
    </div>
  );
}

function RecommendedCard({ img, name, flag, to }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp to={to} className={cn('group relative h-fit w-60 shrink-0 cursor-pointer rounded-md border border-[#ddd] bg-[#fdfbfb]', CARD_SHADOW)}>
      <img src={img} alt="" className="aspect-square w-full rounded-t object-cover" onError={handleImageError} />
      <div className="flex items-center justify-between p-3">
        <h5 className="truncate font-bold" style={{ color: COLOR.blue }}>
          {name}
        </h5>
        {flag && <img src={flag} alt="" className="h-4 w-auto" onError={handleImageError} />}
      </div>
      {to && (
        <i
          className={cn(
            'bi bi-play-circle-fill pointer-events-none absolute right-[5%] top-[45%] text-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100',
            GLOW_SHADOW,
          )}
          style={{ color: COLOR.main }}
        />
      )}
    </Comp>
  );
}

export default function ArtistPage() {
  const { slug } = useParams();
  const artist = ARTISTS[slug];
  useDocumentTitle(artist?.docTitle);
  const [songExpanded, setSongExpanded] = useState(false);

  const popularScroll = useRef(null);
  const albumScroll = useRef(null);
  const recommendedScroll = useRef(null);
  const scroll = (ref, dir) => ref.current?.scrollBy({ left: dir * 560, behavior: 'smooth' });

  // Same sampling technique as the /lyrics hero nav (useCoverPalette), just
  // fed the artist's avatar instead of a song cover - so the Bio/Links cards
  // pick up a color actually lifted from the artist photo instead of a
  // hardcoded tan/navy pair.
  const avatarPalette = useCoverPalette(artist?.avatarImg);
  const bioBg = `linear-gradient(270deg, ${tint(avatarPalette.accent, 0.35, 1)} 0%, ${tint(avatarPalette.accent, 0.35, 0.1)} 100%, rgb(245,245,251) 100%)`;
  const linksBg = `linear-gradient(270deg, ${tint(avatarPalette.accent, -0.45, 1)} 0%, ${tint(avatarPalette.accent, -0.45, 0.1)} 100%, rgb(245,245,251) 100%)`;

  const popularLinks = useMemo(
    () => artist?.popularSongs.map((s) => ({ ...s, to: resolveLink(s.link) })) ?? [],
    [artist],
  );
  const recommendedLinks = useMemo(
    () => artist?.recommended.map((r) => ({ ...r, to: resolveLink(r.link) })) ?? [],
    [artist],
  );

  if (!artist) {
    return (
      <main className="flex min-h-screen items-center justify-center pt-24 text-white">
        <h1 className="text-3xl">Artist not found</h1>
      </main>
    );
  }

  return (
    <div className="text-black">
      <Loader />

      {/* Cover photo: truly position:fixed (matches original #cover-img position-fixed z-n1),
          so it stays put behind the page while everything else scrolls over it.
          z-[-1] pins it behind every other section (matches the original's z-n1). */}
      <img
        src={artist.coverImg}
        alt=""
        className="pointer-events-none fixed inset-x-0 top-0 z-[-1] h-[70em] w-full object-cover" onError={handleImageError} />

      {/* figure carries the same dark-to-white gradient as the original CSS so the
          fixed photo blends into the page's white body as you scroll past it. */}
      <figure
        className="relative flex h-[20em] w-full sm:h-[34em]"
        style={{ background: `linear-gradient(rgba(0,0,0,0.25) 10%, ${COLOR.white})` }}
      >
        {/* Avatar sits in the left ~35% column, not centered across the page
            (matches figcaption{width:35%;margin-left:2.3%;padding-top:40vh}). */}
        <figcaption className="flex w-full items-start justify-center pt-[12em] sm:w-[35%] sm:pt-[23em] sm:pl-[15%]">
          <img
            src={artist.avatarImg}
            alt={artist.displayName}  
            className="pointer-events-none size-32 rounded-full object-cover sm:size-72"
            style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' }} onError={handleImageError} />
        </figcaption>
      </figure>

      <main className="-mt-4 bg-[#f5f5fc] pb-8">
        {/* Profile row */}
        <section className="flex flex-wrap">
          {/* Left: profile / bio / links / about */}
          <div className="w-full px-4 pt-16 sm:w-1/2 sm:px-6 sm:pt-40" id="section1">
            <div className="py-3 text-center font-[family-name:var(--font-anton)]">
              <p className={cn('mx-auto w-full text-2xl font-bold sm:w-3/4 sm:text-3xl md:text-4xl', TITLE_SHADOW)}>
                {artist.displayName}
              </p>
              <div className="mx-auto flex w-full items-center justify-center gap-2 sm:w-3/4">
                {artist.countryFlag && <img src={artist.countryFlag} alt="" className="h-4 w-auto" onError={handleImageError} />}
                <span className="text-sm text-black/90 sm:text-base">{artist.countryName}</span>
              </div>
            </div>

            {/* items-stretch (default) instead of items-start so both cards
                match the height of the taller one (Bio Artist) - Links then
                fills that same height and just centers its icon grid in it. */}
            <div className="mb-6 flex flex-wrap items-stretch gap-3 sm:flex-nowrap">
              {/* Bio */}
              <div
                className={cn('w-full rounded-md border border-[#ddd] sm:w-[68%]', CARD_SHADOW)}
                style={{ background: bioBg }}
              >
                <p className="rounded-t-md border-b border-black px-3 py-1 font-medium">Bio Artist</p>
                <div className="px-1">
                  {artist.bio.map((row) => (
                    <BioRow key={row.label} {...row} />
                  ))}
                </div>
              </div>

              {/* Links */}
              <div
                className={cn('flex w-full shrink-0 flex-col rounded-md sm:w-[28%]', CARD_SHADOW)}
                style={{ background: linksBg }}
              >
                <p className="rounded-t-md border-b border-black px-3 py-1 font-medium">Links</p>
                <div className="grid flex-1 grid-cols-4 content-center gap-3 p-3">
                  {artist.links.map((l, i) => (
                    <div key={i} className="flex justify-center">
                      <LinkIcon {...l} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* About artist */}
            <div
              className="rounded-md p-4"
              style={{
                background: '#f5f5fc',
                boxShadow: 'inset 5px 5px 5px #d8d8de, inset -5px -5px 5px #ffffff',
              }}
            >
              {artist.aboutImg && (
                <img src={artist.aboutImg} alt="" className="mb-3 h-48 w-full rounded object-cover sm:hidden" onError={handleImageError} />
              )}
              <div
                className="text-[1.05em] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: artist.aboutHtml }}
              />
            </div>
          </div>

          {/* Right: Top track */}
          <div className="w-full rounded-md px-4 pt-6 sm:w-1/2 sm:px-6 sm:pt-40" id="section2">
            <div className={cn("rounded-md bg-white", CARD_SHADOW)}>
              <SectionHeading id="topTracks">Top Tracks</SectionHeading>

              <div
                className="m-3 flex flex-wrap gap-4 rounded-md p-3 sm:p-4"
                style={{ border: '0.12em solid rgb(8,176,195)', background: 'rgba(8,176,195,0.03)' }}
              >
                <div className="relative flex w-full flex-col p-1 sm:w-[45%]">
                  <img
                    src={artist.topTrack.img}
                    alt=""
                    className="aspect-square w-full rounded object-cover"
                    onError={handleImageError}
                  />
                  <p className="mt-3 text-center text-lg font-bold font-[family-name:var(--font-anton)] sm:text-xl">
                    {artist.topTrack.title}
                  </p>
                  {/* Stacks centered under the title on mobile (there's no
                      room to the side); becomes the original absolutely
                      positioned side-note once the image column is a fixed
                      45% next to the achievements list on sm+. */}
                  <span className="mt-1 block text-center text-xs opacity-50 sm:absolute sm:-left-4 sm:top-8 sm:mt-0 sm:text-left">
                    {artist.topTrack.legal}
                  </span>
                </div>

                {/* Achievements: a top border/padding when stacked full-width
                    below the image on mobile, switching to the original
                    left border + left padding once it sits beside the image
                    on sm+. */}
                <div className="w-full border-t-4 border-[#ddd] pt-4 sm:w-auto sm:flex-1 sm:border-l-4 sm:border-t-0 sm:pl-6 sm:pt-0">
                  {artist.topTrack.achievements.map((a, i) => (
                    <div key={i} className="mb-4">
                      <div className="text-lg font-bold uppercase sm:text-xl" style={{ color: COLOR.blue }}>
                        {a.number}
                      </div>
                      <span className="text-sm uppercase text-black/70">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* About song */}
              <div className="relative m-3 rounded-md p-3 sm:p-4" style={{ background: 'linear-gradient(#fff, #f5f5fc 90%)' }}>
                <div
                  className={cn('text-sm leading-relaxed sm:text-[1.05em]', !songExpanded && 'line-clamp-6 sm:line-clamp-[13]')}
                  dangerouslySetInnerHTML={{ __html: artist.topTrack.aboutHtml }}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSongExpanded((v) => !v)}
                    className="flex items-center gap-2 rounded-2xl border border-transparent px-3 py-1 text-sm transition-colors duration-200 hover:border-black hover:bg-black hover:text-[#feec93]"
                  >
                    <i className={cn('bi bi-caret-down-fill transition-transform duration-300', songExpanded && 'rotate-180')} />
                    {songExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fanbase */}
        <section className={cn("mx-[1.6%] mt-6 rounded-md bg-white", CARD_SHADOW)} id="section3">
          <SectionHeading id="fanbase">Fanbase</SectionHeading>
          <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-3 [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:h-[0.35em] [&::-webkit-scrollbar-thumb]:bg-[#979797]">
            {artist.fanbase.map((f, i) => (
              <FanbaseCard key={i} {...f} />
            ))}
          </div>
        </section>

        {/* Popular Songs */}
        <section className={cn("mx-[1.6%] mt-6 rounded-md bg-white", CARD_SHADOW)} id="section4">
          <SectionHeading
            id="popularSongs"
            controls={<ScrollControls onLeft={() => scroll(popularScroll, -1)} onRight={() => scroll(popularScroll, 1)} />}
          >
            Popular Songs
          </SectionHeading>
          <div
            ref={popularScroll}
            className="flex h-[21em] flex-col flex-wrap content-start gap-4 overflow-x-auto px-4 py-4 [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:h-[0.35em] [&::-webkit-scrollbar-thumb]:bg-[#979797]"
          >
            {popularLinks.map((s, i) => (
              <SongCard key={i} img={s.img} title={s.title} artist={s.artist} date={s.date} to={s.to} />
            ))}
          </div>
        </section>

        {/* Albums */}
        <section className={cn("mx-[1.6%] mt-6 rounded-md bg-white", CARD_SHADOW)} id="section5">
          <SectionHeading
            id="albums"
            controls={<ScrollControls onLeft={() => scroll(albumScroll, -1)} onRight={() => scroll(albumScroll, 1)} />}
          >
            Albums
          </SectionHeading>
          <div
            ref={albumScroll}
            className="flex gap-4 overflow-x-auto px-4 py-4 [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:h-[0.35em] [&::-webkit-scrollbar-thumb]:bg-[#979797]"
          >
            {artist.albums.map((a, i) => (
              <AlbumCard key={i} {...a} />
            ))}
          </div>
        </section>

        {/* Recommended */}
        <section className={cn("mx-[1.6%] mt-6 rounded-md bg-white", CARD_SHADOW)} id="section6">
          <SectionHeading
            id="recommended"
            controls={
              <ScrollControls onLeft={() => scroll(recommendedScroll, -1)} onRight={() => scroll(recommendedScroll, 1)} />
            }
          >
            Recommended Artist
          </SectionHeading>
          <div
            ref={recommendedScroll}
            className="flex gap-4 overflow-x-auto px-4 py-4 [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:h-[0.35em] [&::-webkit-scrollbar-thumb]:bg-[#979797]"
          >
            {recommendedLinks.map((r, i) => (
              <RecommendedCard key={i} img={r.img} name={r.name} flag={r.flag} to={r.to} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter dark />
    </div>
  );
}
