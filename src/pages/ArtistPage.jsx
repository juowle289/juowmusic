import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Disc3, Flame, Trophy, UserRoundSearch, Users } from 'lucide-react';
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

/** Section title: icon + text, Geist (the site's sans stack), small, no divider line. */
function SectionHeading({ id, icon: Icon, children, className = 'px-4 pb-2 pt-4' }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Icon aria-hidden className="size-5 shrink-0 text-black sm:size-6" />
      <h1 id={id} className="scroll-mt-24 truncate font-sans text-lg font-semibold text-black sm:text-2xl">
        {children}
      </h1>
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
        'pointer-events-none absolute inset-y-0 z-20 flex w-16 items-center from-[#f5f5fc] via-[#f5f5fc]/70 to-transparent transition-opacity duration-200 sm:w-28',
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
          'hidden size-14 place-items-center text-black transition-opacity duration-200 hover:opacity-60 sm:grid',
          show ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <Icon className="size-10" strokeWidth={2.25} />
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
      className="grid size-8 place-items-center rounded-[2px] border border-[#ddd] text-center text-lg transition-colors duration-200 hover:border-black/40"
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

/** Fanbase shows these six platforms, in this order (SoundCloud is left out). */
const FAN_ORDER = ['Spotify', 'Instagram', 'YouTube', 'TikTok', 'Twitter', 'Facebook'];

function FanbaseCard({ icon, iconColor, platform, number, label }) {
  const parsed = parseStat(number);
  const [ref, animated] = useCountUpInView(parsed ? parsed.value : null);
  const display = parsed ? `${animated.toFixed(parsed.decimals)}${parsed.suffix}` : null;
  const iconClass = icon.replace(/\bme-\d\b/g, '').trim();

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-[4px] border border-[#e6e6ea] bg-white px-2 py-3 text-center',
        CARD_SHADOW,
      )}
    >
      {/* the platform icon lives in the tile's background */}
      <i
        aria-hidden
        className={cn(iconClass, 'pointer-events-none absolute -bottom-2 -right-1 select-none text-[3.5rem] leading-none opacity-[0.12]')}
        style={{ color: iconColor }}
      />
      <div className="relative font-[family-name:var(--font-anton)] text-xl leading-none tracking-wide text-black tabular-nums sm:text-2xl">
        {display ?? <span className="text-base text-black/35">{number}</span>}
      </div>
      <div className="relative mt-2 truncate text-[0.65rem] font-semibold uppercase tracking-wider text-black/75">{platform}</div>
      <div className="relative truncate text-[0.6rem] uppercase tracking-wider text-black/40">{label}</div>
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
    <div
      className={cn(
        'group relative aspect-square w-52 shrink-0 cursor-pointer select-none overflow-hidden rounded-[4px] bg-black sm:w-60',
        CARD_SHADOW,
      )}
    >
      <img
        src={img}
        alt=""
        draggable={false}
        className="size-full select-none object-cover transition-transform duration-500 [-webkit-user-drag:none] group-hover:scale-[1.04]"
        onError={handleImageError}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 p-3 text-center sm:p-4">
        <h5
          data-selectable
          className="max-w-full select-text truncate font-[family-name:var(--font-anton)] text-xl leading-tight tracking-wide text-white"
        >
          {title}
        </h5>
        <span data-selectable className="max-w-full select-text truncate text-xs text-white/70 sm:text-sm">
          {meta}
        </span>
      </div>
    </div>
  );
}

function RecommendedCard({ img, name, flag, to }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp
      to={to}
      draggable={false}
      className={cn(
        'group relative block aspect-[4/5] w-52 shrink-0 select-none overflow-hidden rounded-[4px] bg-black sm:w-60',
        to && 'cursor-pointer',
        CARD_SHADOW,
      )}
    >
      <img
        src={img}
        alt=""
        draggable={false}
        className="size-full select-none object-cover transition-transform duration-500 [-webkit-user-drag:none] group-hover:scale-[1.04]"
        onError={handleImageError}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 sm:p-4">
        <h5
          data-selectable
          className="min-w-0 select-text truncate font-[family-name:var(--font-anton)] text-xl leading-tight tracking-wide text-white"
        >
          {name}
        </h5>
        {flag && <img src={flag} alt="" draggable={false} className="h-4 w-auto shrink-0 select-none rounded-[1px]" onError={handleImageError} />}
      </div>
    </Comp>
  );
}

/** Artist FAQ - same accordion look as the Q&A on the lyrics page (max 4). */
function ArtistFaq({ items }) {
  const [openIndex, setOpenIndex] = useState(null);
  if (!items?.length) return null;
  return (
    <div>
      <SectionHeading id="artistFaq" icon={CircleHelp} className="px-0 pb-3">
        Artist FAQ
      </SectionHeading>
      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        {items.slice(0, 4).map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="overflow-hidden rounded-[2px] border border-black/10">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className={cn(
                  'flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors',
                  isOpen ? 'bg-black text-[#f5f5fc] hover:bg-[#feec93] hover:text-black' : 'bg-white text-black hover:bg-black/5',
                )}
              >
                <span className="font-medium">{item.question}</span>
                <ChevronDown className={cn('size-5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div
                  className="border-t border-black/10 bg-white px-4 py-4 text-black [&_p]:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpandToggle({ expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="inline-flex items-center gap-1.5 rounded-[2px] border border-black/15 bg-white px-4 py-1.5 text-sm font-medium text-black shadow-sm transition-colors duration-200 hover:border-black hover:bg-black hover:text-[#feec93]"
    >
      {expanded ? 'Show less' : 'Read more'}
      <ChevronDown className={cn('size-4 transition-transform duration-300', expanded && 'rotate-180')} />
    </button>
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

            {/* Fanbase: one row of six compact stats (3 + 3 when the column is narrow) */}
            <div className="mt-2 scroll-mt-24 @container" id="section3">
              <SectionHeading id="fanbase" icon={Users} className="px-0 pb-3">
                Fanbase
              </SectionHeading>
              <div className="grid grid-cols-3 gap-2 @md:grid-cols-6">
                {FAN_ORDER.map((name) => artist.fanbase.find((f) => f.platform === name))
                  .filter(Boolean)
                  .map((f) => (
                    <FanbaseCard key={f.platform} {...f} />
                  ))}
              </div>
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

              {/* About song: clamped text fading out into white, with a centered
                  "Read more" control sitting on the fade; "Show less" once open. */}
              <div className="relative m-3 p-3 sm:p-4">
                <div className="relative">
                  <div
                    className={cn('text-sm leading-relaxed sm:text-[1.05em]', !songExpanded && 'line-clamp-6 sm:line-clamp-[13]')}
                    dangerouslySetInnerHTML={{ __html: artist.topTrack.aboutHtml }}
                  />
                  {!songExpanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/85 to-transparent" />
                  )}
                  {!songExpanded && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-center">
                      <ExpandToggle expanded={false} onClick={() => setSongExpanded(true)} />
                    </div>
                  )}
                </div>
                {songExpanded && (
                  <div className="mt-3 flex justify-center">
                    <ExpandToggle expanded onClick={() => setSongExpanded(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Popular Songs */}
        <section className="mx-[1.6%] mt-6" id="section4">
          <SectionHeading id="popularSongs" icon={Flame}>
            Popular Songs
          </SectionHeading>
          <Carousel key={artist.slug} className="flex h-[21em] flex-col flex-wrap content-start gap-4 px-4 py-4">
            {popularLinks.map((s, i) => (
              <SongCard key={i} img={s.img} title={s.title} artist={s.artist} date={s.date} to={s.to} />
            ))}
          </Carousel>
        </section>

        {/* Albums */}
        <section className="mx-[1.6%] mt-6" id="section5">
          <SectionHeading id="albums" icon={Disc3}>
            Albums
          </SectionHeading>
          <Carousel key={artist.slug} className="flex gap-4 px-4 py-4">
            {artist.albums.map((a, i) => (
              <AlbumCard key={i} {...a} />
            ))}
          </Carousel>
        </section>

        {/* Similar Artists */}
        <section className="mx-[1.6%] mt-6" id="section6">
          <SectionHeading id="recommended" icon={UserRoundSearch}>
            Similar Artists
          </SectionHeading>
          <Carousel key={artist.slug} className="flex gap-4 px-4 py-4">
            {recommendedLinks.map((r, i) => (
              <RecommendedCard key={i} img={r.img} name={r.name} flag={r.flag} to={r.to} />
            ))}
          </Carousel>
        </section>

        {/* Artist FAQ */}
        <section className="mx-[1.6%] mt-8 pb-10" id="faq">
          <ArtistFaq key={artist.slug} items={artist.faq} />
        </section>
      </main>

      <SiteFooter dark />
    </div>
  );
}
