import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import Loader from '@/components/Loader';
import { cn } from '@/lib/utils';

import sonTung from '@/data/artists/son-tung-mtp.json';
import theWeeknd from '@/data/artists/the-weeknd.json';

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
const SHADOW_S = '1px 1px 5px rgba(0,0,0,0.1)';
const SHADOW_XL_DROP = 'drop-shadow(0px 0px 10px rgba(0,0,0,.5))';

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
        className="scroll-mt-24 font-[family-name:var(--font-anton)] text-2xl font-bold [text-shadow:0px_3px_5px_rgba(0,0,0,0.25)] sm:text-4xl"
      >
        {children}
      </h1>
      {controls}
    </div>
  );
}

function BioRow({ icon, label, value }) {
  return (
    <tr>
      <td className="p-2">
        <i className={cn(icon, 'mr-1')} /> {label}
      </td>
      <td className="p-2 text-right font-medium">{value}</td>
    </tr>
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
      className="flex h-40 w-40 shrink-0 cursor-pointer flex-col justify-between rounded-md p-3 text-center"
      style={{ background: bg || '#f0f0f0', boxShadow: SHADOW_S }}
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
      className="group relative flex h-fit w-[23.8em] max-w-full shrink-0 gap-4 rounded-md border border-[#ddd] bg-white p-2"
      style={{ boxShadow: SHADOW_S }}
    >
      <img src={img} alt="" className="size-24 shrink-0 rounded object-cover" />
      <div className="flex min-w-0 flex-col justify-between py-1">
        <div className="min-w-0 overflow-hidden border-b border-[#ddd] pb-1">
          <h5 className="truncate font-bold" style={{ color: COLOR.blue }}>
            {title}
          </h5>
          <span className="truncate text-black/60">{artist}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-black/60">
          <i className="bi bi-calendar4-event" />
          <span>{date}</span>
        </div>
      </div>
      {to && (
        <i
          className="bi bi-play-circle-fill pointer-events-none absolute left-[8%] top-[22%] hidden text-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block"
          style={{ color: COLOR.main, filter: SHADOW_XL_DROP }}
        />
      )}
    </Comp>
  );
}

function AlbumCard({ img, title, meta }) {
  return (
    <div
      className="group relative h-fit w-60 shrink-0 cursor-pointer rounded-md border border-[#ddd] bg-white text-center"
      style={{ boxShadow: SHADOW_S }}
    >
      <img src={img} alt="" className="aspect-square w-full rounded object-cover" />
      <h5 className="mt-2 truncate px-2 font-bold" style={{ color: COLOR.blue }}>
        {title}
      </h5>
      <span className="block px-2 pb-2 text-sm text-black/60">{meta}</span>
      <i
        className="bi bi-play-circle-fill pointer-events-none absolute right-[5%] top-[55%] text-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ color: COLOR.main, filter: SHADOW_XL_DROP }}
      />
    </div>
  );
}

function RecommendedCard({ img, name, flag, to }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp
      to={to}
      className="group relative h-fit w-60 shrink-0 cursor-pointer rounded-md border border-[#ddd] bg-[#fdfbfb]"
      style={{ boxShadow: SHADOW_S }}
    >
      <img src={img} alt="" className="aspect-square w-full rounded-t object-cover" />
      <div className="flex items-center justify-between p-3">
        <h5 className="truncate font-bold" style={{ color: COLOR.blue }}>
          {name}
        </h5>
        {flag && <img src={flag} alt="" className="h-4 w-auto" />}
      </div>
      {to && (
        <i
          className="bi bi-play-circle-fill pointer-events-none absolute right-[5%] top-[45%] text-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ color: COLOR.main, filter: SHADOW_XL_DROP }}
        />
      )}
    </Comp>
  );
}

export default function ArtistPage() {
  const { slug } = useParams();
  const artist = ARTISTS[slug];
  const [songExpanded, setSongExpanded] = useState(false);

  const popularScroll = useRef(null);
  const albumScroll = useRef(null);
  const recommendedScroll = useRef(null);
  const scroll = (ref, dir) => ref.current?.scrollBy({ left: dir * 560, behavior: 'smooth' });

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
        className="pointer-events-none fixed inset-x-0 top-0 z-[-1] h-[70em] w-full object-cover"
      />

      {/* figure carries the same dark-to-white gradient as the original CSS so the
          fixed photo blends into the page's white body as you scroll past it. */}
      <figure
        className="relative flex h-[20em] w-full sm:h-[34em]"
        style={{ background: `linear-gradient(rgba(0,0,0,0.25) 10%, ${COLOR.white})` }}
      >
        {/* Avatar sits in the left ~35% column, not centered across the page
            (matches figcaption{width:35%;margin-left:2.3%;padding-top:40vh}). */}
        <figcaption className="flex w-full items-start justify-center pt-[12em] sm:w-[35%] sm:pt-[21em] sm:pl-[2.3%]">
          <img
            src={artist.avatarImg}
            alt={artist.displayName}
            className="pointer-events-none size-32 rounded-full object-cover sm:size-72"
            style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' }}
          />
        </figcaption>
      </figure>

      <main className="-mt-4 bg-[#f5f5fc] pb-8">
        {/* Profile row */}
        <section className="flex flex-wrap">
          {/* Left: profile / bio / links / about */}
          <div className="w-full px-4 pt-16 sm:w-1/2 sm:px-6 sm:pt-40" id="section1">
            <div className="py-3 text-center font-[family-name:var(--font-anton)]">
              <p className="mx-auto w-full text-3xl font-bold sm:w-3/4" style={{ textShadow: '0px 3px 5px rgba(0,0,0,0.25)' }}>
                {artist.displayName}
              </p>
              <div className="mx-auto flex w-full items-center justify-center gap-2 sm:w-3/4">
                {artist.countryFlag && <img src={artist.countryFlag} alt="" className="h-4 w-auto" />}
                <span className="text-black/90">{artist.countryName}</span>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-start gap-3 sm:flex-nowrap">
              {/* Bio */}
              <div
                className="w-full rounded-md border border-[#ddd] sm:w-[68%]"
                style={{
                  boxShadow: SHADOW_S,
                  background:
                    'linear-gradient(270deg, rgb(185,169,157) 0%, rgba(185,169,157,0.1) 100%, rgb(245,245,251) 100%)',
                }}
              >
                <p className="rounded-t-md border-b border-black px-3 py-1 font-medium">Bio Artist</p>
                <table className="w-full">
                  <tbody>
                    {artist.bio.map((row) => (
                      <BioRow key={row.label} {...row} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Links */}
              <div
                className="w-full shrink-0 rounded-md sm:w-[28%]"
                style={{
                  boxShadow: SHADOW_S,
                  background:
                    'linear-gradient(270deg, rgb(41,47,58) 0%, rgba(41,47,58,0.1) 100%, rgb(245,245,251) 100%)',
                }}
              >
                <p className="rounded-t-md border-b border-black px-3 py-1 font-medium">Links</p>
                <div className="grid grid-cols-4 gap-3 p-3">
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
                <img src={artist.aboutImg} alt="" className="mb-3 h-48 w-full rounded object-cover sm:hidden" />
              )}
              <div
                className="text-[1.05em] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: artist.aboutHtml }}
              />
            </div>
          </div>

          {/* Right: Top track */}
          <div className="w-full rounded-md px-4 pt-6 sm:w-1/2 sm:px-6 sm:pt-40" id="section2">
            <div className="rounded-md bg-white" style={{ boxShadow: SHADOW_S }}>
              <SectionHeading id="topTracks">Top Tracks</SectionHeading>

              <div
                className="m-3 flex flex-wrap gap-4 rounded-md p-4"
                style={{ border: '0.12em solid rgb(8,176,195)', background: 'rgba(8,176,195,0.03)' }}
              >
                <div className="flex w-full flex-col p-1 sm:w-[45%]">
                  <img src={artist.topTrack.img} alt="" className="w-full rounded object-cover" />
                  <p className="relative mt-3 text-center text-xl font-bold font-[family-name:var(--font-anton)]">
                    {artist.topTrack.title}
                    <span className="absolute -left-4 top-8 text-xs opacity-50">{artist.topTrack.legal}</span>
                  </p>
                </div>

                <div className="flex-1 border-l-4 border-[#ddd] pl-6">
                  {artist.topTrack.achievements.map((a, i) => (
                    <div key={i} className="mb-4">
                      <div className="text-xl font-bold uppercase" style={{ color: COLOR.blue }}>
                        {a.number}
                      </div>
                      <span className="text-sm uppercase text-black/70">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* About song */}
              <div className="relative m-3 rounded-md p-4" style={{ background: 'linear-gradient(#fff, #f5f5fc 90%)' }}>
                <div
                  className={cn('text-[1.05em] leading-relaxed', !songExpanded && 'line-clamp-[13]')}
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
        <section className="mx-[1.6%] mt-6 rounded-md bg-white" style={{ boxShadow: SHADOW_S }} id="section3">
          <SectionHeading id="fanbase">Fanbase</SectionHeading>
          <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-3 [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:h-[0.35em] [&::-webkit-scrollbar-thumb]:bg-[#979797]">
            {artist.fanbase.map((f, i) => (
              <FanbaseCard key={i} {...f} />
            ))}
          </div>
        </section>

        {/* Popular Songs */}
        <section className="mx-[1.6%] mt-6 rounded-md bg-white" style={{ boxShadow: SHADOW_S }} id="section4">
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
        <section className="mx-[1.6%] mt-6 rounded-md bg-white" style={{ boxShadow: SHADOW_S }} id="section5">
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
        <section className="mx-[1.6%] mt-6 rounded-md bg-white" style={{ boxShadow: SHADOW_S }} id="section6">
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
