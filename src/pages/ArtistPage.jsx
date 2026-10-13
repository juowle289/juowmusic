import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Disc3, Flame, Trophy, UserRoundSearch, Users } from 'lucide-react';
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

function SeeAll() {
  return (
    <span className="cursor-pointer rounded-[2px] border border-black px-3 py-1 text-sm transition-colors duration-200 hover:bg-black hover:text-[#feec93]">
      See All
    </span>
  );
}

/** Section title with a small black/yellow icon tile in front of it. No text-shadow. */
function SectionHeading({ id, icon: Icon, children, controls }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#ddd] px-4 pb-4 pt-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-[2px] bg-black text-[#feec93] sm:size-11"
        >
          <Icon className="size-[1.15rem] sm:size-5" />
        </span>
        <h1
          id={id}
          className="scroll-mt-24 truncate font-[family-name:var(--font-anton)] text-2xl font-bold sm:text-4xl"
        >
          {children}
        </h1>
      </div>
      {controls}
    </div>
  );
}

/**
 * Mouse drag-to-scroll for a horizontally scrolling row (touch keeps using
 * the browser's own swipe scrolling). Pressing on a card's image/padding and
 * dragging left/right scrolls the row; pressing on text marked
 * `data-selectable` does NOT start a drag, so that text can still be
 * highlighted. A drag (or a text selection) never counts as a click, so it
 * can't accidentally open a card's link.
 */
function useDragScroll(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let active = false;
    let dragged = false;
    let startX = 0;
    let startLeft = 0;

    const onDown = (e) => {
      if (e.button !== 0 || e.target.closest('[data-selectable]')) return;
      active = true;
      dragged = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      // Stops native image/link dragging and text/image highlighting from
      // starting on this press; a plain click is unaffected.
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
    };
    const onMove = (e) => {
      if (!active) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) > 5) {
        dragged = true;
        el.style.cursor = 'grabbing';
      }
      if (dragged) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      if (!active) return;
      active = false;
      el.style.cursor = '';
    };
    const onClickCapture = (e) => {
      const hasSelection = (window.getSelection()?.toString() ?? '').length > 0;
      if (dragged || hasSelection) {
        e.preventDefault();
        e.stopPropagation();
      }
      dragged = false;
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [ref]);
}

function CarouselEdge({ side, show, onClick }) {
  const isLeft = side === 'left';
  const Icon = isLeft ? ChevronLeft : ChevronRight;
  return (
    <div
      aria-hidden={!show}
      className={cn(
        'pointer-events-none absolute inset-y-0 z-20 flex w-16 items-center from-white via-white/70 to-transparent transition-opacity duration-200 sm:w-28',
        isLeft ? 'left-0 justify-start bg-gradient-to-r pl-2' : 'right-0 justify-end bg-gradient-to-l pr-2',
        show ? 'opacity-100' : 'opacity-0',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        tabIndex={show ? 0 : -1}
        aria-label={isLeft ? 'Scroll left' : 'Scroll right'}
        className={cn(
          'hidden size-10 place-items-center rounded-[2px] bg-black text-[#feec93] shadow-md transition-colors duration-200 hover:bg-[#feec93] hover:text-black sm:grid',
          show ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <Icon className="size-5" />
      </button>
    </div>
  );
}

/** Horizontally scrolling row: drag to scroll, chevrons at the row's ends
 * (stacked above the cards, over a soft white fade) that appear only when
 * there's more to scroll in that direction. */
function Carousel({ className, children }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  useDragScroll(ref);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [update]);

  const page = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn(
          'cursor-grab overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {children}
      </div>
      <CarouselEdge side="left" show={canLeft} onClick={() => page(-1)} />
      <CarouselEdge side="right" show={canRight} onClick={() => page(1)} />
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
      className="grid size-8 place-items-center rounded-[2px] border border-[#ddd] bg-white text-center text-lg transition-colors duration-200 hover:border-black/40"
    >
      <i className={icon} style={{ color: color || '#000' }} />
    </a>
  );
}

/** "86.6M" / "183K" / "7M" -> { value: 86.6, decimals: 1, suffix: 'M' }.
 * Anything non-numeric ("Not Found") returns null and is shown as-is. */
function parseStat(str) {
  const m = /^\s*([\d.,]+)\s*([KMB]?)\s*$/i.exec(str || '');
  if (!m) return null;
  const value = parseFloat(m[1].replace(/,/g, ''));
  if (Number.isNaN(value)) return null;
  return { value, decimals: (m[1].split('.')[1] || '').length, suffix: m[2].toUpperCase() };
}

/** Counts up from 0 to `target` the first time the element scrolls into view
 * (the Fanbase section is far down the page, so counting on mount would be
 * finished before anyone sees it). Shows the final value straight away when
 * the user prefers reduced motion. */
function useCountUpInView(target, duration = 1200) {
  const ref = useRef(null);
  const [value, setValue] = useState(target ?? 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || target == null) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      setValue(target);
      return undefined;
    }
    setValue(0);
    let raf;
    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        setValue(target * (1 - (1 - t) ** 3));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return [ref, value];
}

function FanbaseCard({ icon, iconColor, platform, number, label, featured }) {
  const parsed = parseStat(number);
  const [ref, animated] = useCountUpInView(parsed ? parsed.value : null);
  const display = parsed ? `${animated.toFixed(parsed.decimals)}${parsed.suffix}` : null;
  const iconClass = icon.replace(/\bme-\d\b/g, '').trim();

  return (
    <div
      ref={ref}
      style={{ '--stat': iconColor }}
      className={cn(
        'group relative overflow-hidden rounded-[4px] border border-[#e6e6ea] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:[border-color:var(--stat)] sm:p-5',
        featured && 'col-span-2',
        CARD_SHADOW,
      )}
    >
      {/* platform-colored top edge, soft glow and an oversized watermark icon */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: iconColor }} />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-[0.14] blur-2xl"
        style={{ background: iconColor }}
      />
      <i
        aria-hidden
        className={cn(
          iconClass,
          'pointer-events-none absolute -bottom-3 -right-2 select-none leading-none opacity-[0.07]',
          featured ? 'text-[9rem]' : 'text-[6rem]',
        )}
        style={{ color: iconColor }}
      />

      <div className="relative flex items-center gap-2.5">
        <span
          className="grid size-9 place-items-center rounded-[2px] text-lg text-white"
          style={{ background: iconColor }}
        >
          <i className={iconClass} />
        </span>
        <span className="text-sm font-semibold uppercase tracking-wider text-black/70">{platform}</span>
      </div>

      <div
        className={cn(
          'relative mt-5 font-[family-name:var(--font-anton)] leading-none tracking-wide text-black tabular-nums',
          featured ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl',
        )}
      >
        {display ?? <span className="text-xl text-black/35 sm:text-2xl">{number}</span>}
      </div>
      <div className="relative mt-2 text-xs uppercase tracking-[0.18em] text-black/50 sm:text-sm">{label}</div>
    </div>
  );
}

function SongCard({ img, title, artist, date, to }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp
      to={to}
      draggable={false}
      className={cn(
        'group relative flex h-fit w-[78vw] max-w-[23.8em] shrink-0 select-none gap-2.5 rounded-[4px] border border-[#ddd] bg-white p-2 sm:w-[23.8em] sm:gap-4',
        CARD_SHADOW,
      )}
    >
      <img src={img} alt="" draggable={false} className="size-20 shrink-0 select-none rounded-[2px] object-cover [-webkit-user-drag:none] sm:size-24" onError={handleImageError} />
      <div className="flex min-w-0 flex-col justify-between py-1">
        <div className="min-w-0 overflow-hidden border-b border-[#ddd] pb-1">
          <h5 data-selectable className="select-text truncate text-sm font-bold sm:text-base" style={{ color: COLOR.blue }}>
            {title}
          </h5>
          <span data-selectable className="select-text truncate text-xs text-black/60 sm:text-sm">{artist}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-black/60 sm:text-sm">
          <i className="bi bi-calendar4-event" />
          <span data-selectable className="select-text">{date}</span>
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
    <div className={cn('group relative h-fit w-60 shrink-0 cursor-pointer select-none rounded-[4px] border border-[#ddd] bg-white text-center', CARD_SHADOW)}>
      <img src={img} alt="" draggable={false} className="aspect-square w-full select-none rounded-t-[3px] object-cover [-webkit-user-drag:none]" onError={handleImageError} />
      <h5 data-selectable className="mt-2 select-text truncate px-2 font-bold" style={{ color: COLOR.blue }}>
        {title}
      </h5>
      <span data-selectable className="block select-text px-2 pb-2 text-sm text-black/60">{meta}</span>
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
    <Comp to={to} draggable={false} className={cn('group relative h-fit w-60 shrink-0 cursor-pointer select-none rounded-[4px] border border-[#ddd] bg-[#fdfbfb]', CARD_SHADOW)}>
      <img src={img} alt="" draggable={false} className="aspect-square w-full select-none rounded-t-[3px] object-cover [-webkit-user-drag:none]" onError={handleImageError} />
      <div className="flex items-center justify-between p-3">
        <h5 data-selectable className="select-text truncate font-bold" style={{ color: COLOR.blue }}>
          {name}
        </h5>
        {flag && <img src={flag} alt="" draggable={false} className="h-4 w-auto select-none" onError={handleImageError} />}
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

  // Same sampling technique as the /lyrics hero nav (useCoverPalette), just
  // fed the artist's avatar instead of a song cover - so the Bio/Links cards
  // pick up a color actually lifted from the artist photo instead of a
  // hardcoded tan/navy pair.
  const avatarPalette = useCoverPalette(artist?.avatarImg);
  const bioBg = `linear-gradient(270deg, ${tint(avatarPalette.accent, 0.35, 1)} 0%, ${tint(avatarPalette.accent, 0.35, 0.1)} 100%, rgb(245,245,251) 100%)`;

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
                className={cn('w-full rounded-[4px] border border-[#ddd] sm:w-[68%]', CARD_SHADOW)}
                style={{ background: bioBg }}
              >
                <p className="rounded-t-[4px] border-b border-black px-3 py-1 font-medium">Bio Artist</p>
                <div className="px-1">
                  {artist.bio.map((row) => (
                    <BioRow key={row.label} {...row} />
                  ))}
                </div>
              </div>

              {/* Links */}
              <div
                className={cn('flex w-full shrink-0 flex-col rounded-[4px] border border-[#ddd] sm:w-[28%]', CARD_SHADOW)}
                style={{ background: bioBg }}
              >
                <p className="rounded-t-[4px] border-b border-black px-3 py-1 font-medium">Links</p>
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
              className="rounded-[4px] p-4"
              style={{
                background: '#f5f5fc',
                boxShadow: 'inset 5px 5px 5px #d8d8de, inset -5px -5px 5px #ffffff',
              }}
            >
              {artist.aboutImg && (
                <img src={artist.aboutImg} alt="" className="mb-3 h-48 w-full rounded-[2px] object-cover sm:hidden" onError={handleImageError} />
              )}
              <div
                className="text-[1.05em] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: artist.aboutHtml }}
              />
            </div>
          </div>

          {/* Right: Top track */}
          <div className="w-full px-4 pt-6 sm:w-1/2 sm:px-6 sm:pt-40" id="section2">
            <div className={cn("rounded-[4px] bg-white", CARD_SHADOW)}>
              <SectionHeading id="topTracks" icon={Trophy}>Top Tracks</SectionHeading>

              <div
                className="m-3 flex flex-wrap gap-4 rounded-[4px] p-3 sm:p-4"
                style={{ border: '0.12em solid rgb(8,176,195)', background: 'rgba(8,176,195,0.03)' }}
              >
                <div className="relative flex w-full flex-col p-1 sm:w-[45%]">
                  <img
                    src={artist.topTrack.img}
                    alt=""
                    className="aspect-square w-full rounded-[2px] object-cover"
                    onError={handleImageError}
                  />
                  <p className="mt-3 text-center text-lg font-bold font-[family-name:var(--font-anton)] sm:text-xl">
                    {artist.topTrack.title}
                  </p>
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
              <div className="relative m-3 p-3 sm:p-4">
                <div
                  className={cn('text-sm leading-relaxed sm:text-[1.05em]', !songExpanded && 'line-clamp-6 sm:line-clamp-[13]')}
                  dangerouslySetInnerHTML={{ __html: artist.topTrack.aboutHtml }}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSongExpanded((v) => !v)}
                    className="flex items-center gap-2 rounded-[2px] border border-transparent px-3 py-1 text-sm transition-colors duration-200 hover:border-black hover:bg-black hover:text-[#feec93]"
                  >
                    <i className={cn('bi bi-caret-down-fill transition-transform duration-300', songExpanded && 'rotate-180')} />
                    {songExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fanbase: bento grid - the first stat is the featured 2-wide tile, the
            other six fill the remaining cells (4 + 4 columns on desktop). */}
        <section className={cn("mx-[1.6%] mt-6 rounded-[4px] bg-white", CARD_SHADOW)} id="section3">
          <SectionHeading id="fanbase" icon={Users}>Fanbase</SectionHeading>
          <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6 md:grid-cols-4">
            {artist.fanbase.map((f, i) => (
              <FanbaseCard key={f.platform} {...f} featured={i === 0} />
            ))}
          </div>
        </section>

        {/* Popular Songs */}
        <section className={cn("mx-[1.6%] mt-6 rounded-[4px] bg-white", CARD_SHADOW)} id="section4">
          <SectionHeading id="popularSongs" icon={Flame} controls={<SeeAll />}>
            Popular Songs
          </SectionHeading>
          <Carousel key={artist.slug} className="flex h-[21em] flex-col flex-wrap content-start gap-4 px-4 py-4">
            {popularLinks.map((s, i) => (
              <SongCard key={i} img={s.img} title={s.title} artist={s.artist} date={s.date} to={s.to} />
            ))}
          </Carousel>
        </section>

        {/* Albums */}
        <section className={cn("mx-[1.6%] mt-6 rounded-[4px] bg-white", CARD_SHADOW)} id="section5">
          <SectionHeading id="albums" icon={Disc3} controls={<SeeAll />}>
            Albums
          </SectionHeading>
          <Carousel key={artist.slug} className="flex gap-4 px-4 py-4">
            {artist.albums.map((a, i) => (
              <AlbumCard key={i} {...a} />
            ))}
          </Carousel>
        </section>

        {/* Similar Artists */}
        <section className={cn("mx-[1.6%] mt-6 rounded-[4px] bg-white", CARD_SHADOW)} id="section6">
          <SectionHeading id="recommended" icon={UserRoundSearch} controls={<SeeAll />}>
            Similar Artists
          </SectionHeading>
          <Carousel key={artist.slug} className="flex gap-4 px-4 py-4">
            {recommendedLinks.map((r, i) => (
              <RecommendedCard key={i} img={r.img} name={r.name} flag={r.flag} to={r.to} />
            ))}
          </Carousel>
        </section>
      </main>

      <SiteFooter dark />
    </div>
  );
}
