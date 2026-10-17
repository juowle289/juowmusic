import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CircleCheck,
  CirclePlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Disc3,
  MessageCircleQuestionMark,
  Music4,
  TrendingUp,
  UserGroup,
  UserRoundSearch,
} from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import Loader from '@/components/Loader';
import useCoverPalette from '@/hooks/useCoverPalette';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useFollowStore } from '@/stores/useFollowStore';

import { ARTISTS_BY_SLUG } from '@/data/artists';
import { ALL_ARTISTS } from '@/data/recommendedArtists';
import { handleImageError } from '@/lib/imageFallback';

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
// Bootstrap-style page container: centered, 12px side padding, and the same
// max-widths as .container (540 / 720 / 960 / 1140 / 1320). Every block of the
// page uses it so all content shares the same left/right edges.
const CONTAINER = 'mx-auto w-full px-3 sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] xl:max-w-[1140px] 2xl:max-w-[1320px]';
// One vertical gap between all page sections.
const SECTION_GAP = 'mt-10';
// Slightly stronger than CARD_SHADOW: photo cards sit straight on the #f5f5fc page, where
// the very light card shadow is barely visible.
const CARD_SHADOW_MEDIA = 'shadow-[0_2px_6px_rgba(0,0,0,0.16)] sm:shadow-[0_3px_10px_rgba(0,0,0,0.2)]';
const CARD_SHADOW = 'shadow-[1px_1px_3px_rgba(0,0,0,0.06)] sm:shadow-[1px_1px_5px_rgba(0,0,0,0.1)]';
const GLOW_SHADOW = 'drop-shadow-[0px_0px_4px_rgba(0,0,0,0.25)] sm:drop-shadow-[0px_0px_10px_rgba(0,0,0,0.5)]';

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
function SectionHeading({ id, icon: Icon, children, className = 'pb-3' }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Icon aria-hidden className="size-5 shrink-0 text-black sm:size-6" />
      <h2 id={id} className="scroll-mt-24 truncate font-sans text-lg font-semibold text-black sm:text-2xl">
        {children}
      </h2>
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
        'pointer-events-none absolute inset-y-0 z-20 flex w-[4.75rem] items-center from-[#f5f5fc] via-[#f5f5fc]/70 to-transparent transition-opacity duration-200 sm:w-[7.75rem]',
        isLeft ? '-left-3 justify-start bg-gradient-to-r pl-5' : '-right-3 justify-end bg-gradient-to-l pr-5',
        show ? 'opacity-100' : 'opacity-0',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        tabIndex={show ? 0 : -1}
        aria-label={isLeft ? 'Scroll left' : 'Scroll right'}
        className={cn(
          'hidden size-14 place-items-center text-black/40 transition-colors duration-200 hover:text-black/70 sm:grid',
          show ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <Icon className="size-10" strokeWidth={1.25} />
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

const LINK_LABELS = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  apple: 'Apple Music',
  facebook: 'Facebook',
  instagram: 'Instagram',
  'x-twitter': 'X (Twitter)',
  twitter: 'Twitter',
  tiktok: 'TikTok',
  amazon: 'Amazon Music',
  soundcloud: 'SoundCloud',
  'house-chimney': 'Official website',
  globe: 'Official website',
};

/** "fa-brands fa-spotify me-1" -> "Spotify" (the icon-only links need a name for screen readers). */
function linkLabel(icon) {
  const key = String(icon).match(/fa-(?!brands\b|solid\b|regular\b)([a-z0-9-]+)/)?.[1];
  return LINK_LABELS[key] || (key ? key.replace(/-/g, ' ') : 'Link');
}

function LinkIcon({ href, icon, color }) {
  const label = linkLabel(icon);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      title={label}
      className="grid size-8 place-items-center rounded-[2px] border border-[#ddd] text-center text-lg transition-colors duration-200 hover:border-black/40"
    >
      <i aria-hidden className={icon} style={{ color: color || '#000' }} />
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
        'relative overflow-hidden rounded-[4px] border border-[#e6e6ea] bg-white px-2 py-5 text-center sm:py-6',
        CARD_SHADOW,
      )}
    >
      {/* the platform icon lives in the tile's background */}
      <i
        aria-hidden
        className={cn(iconClass, 'pointer-events-none absolute -bottom-3 -right-2 select-none text-[4.75rem] leading-none opacity-[0.12]')}
        style={{ color: iconColor }}
      />
      <div className="relative whitespace-nowrap font-[family-name:var(--font-anton)] text-3xl leading-none tracking-wide text-black tabular-nums lg:text-4xl">
        {display ?? <span className="text-xl text-black/55">{number}</span>}
      </div>
      <div className="relative mt-3 truncate text-[0.65rem] font-semibold uppercase tracking-wider text-black/75">{platform}</div>
      <div className="relative truncate text-[0.6rem] uppercase tracking-wider text-black/60">{label}</div>
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
      <img src={img} alt="" draggable={false} loading="lazy" decoding="async" className="size-20 shrink-0 select-none rounded-[2px] object-cover [-webkit-user-drag:none] sm:size-24" onError={handleImageError} />
      <div className="flex min-w-0 flex-col justify-between py-1">
        <div className="min-w-0 overflow-hidden border-b border-[#ddd] pb-1">
          <h3 data-selectable className="select-text truncate text-sm font-bold sm:text-base" style={{ color: COLOR.blue }}>
            {title}
          </h3>
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
        CARD_SHADOW_MEDIA,
      )}
    >
      <img
        src={img}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full select-none object-cover transition-transform duration-500 [-webkit-user-drag:none] group-hover:scale-[1.04]"
        onError={handleImageError}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 p-3 text-center sm:p-4">
        <h3
          data-selectable
          className="max-w-full select-text truncate font-[family-name:var(--font-anton)] text-xl leading-tight tracking-wide text-white"
        >
          {title}
        </h3>
        <span data-selectable className="max-w-full select-text truncate text-xs text-white/85 sm:text-sm">
          {meta}
        </span>
      </div>
    </div>
  );
}

function RecommendedCard({ img, name, flag, genre, to }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp
      to={to}
      draggable={false}
      className={cn(
        'group relative block aspect-[4/5] w-52 shrink-0 select-none overflow-hidden rounded-[4px] bg-black sm:w-60',
        to && 'cursor-pointer',
        CARD_SHADOW_MEDIA,
      )}
    >
      <img
        src={img}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full select-none object-cover transition-transform duration-500 [-webkit-user-drag:none] group-hover:scale-[1.04]"
        onError={handleImageError}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          <h3
            data-selectable
            className="select-text truncate font-[family-name:var(--font-anton)] text-xl leading-tight tracking-wide text-white"
          >
            {name}
          </h3>
          {genre && (
            <p data-selectable className="select-text truncate text-xs uppercase tracking-wider text-white/70">
              {genre}
            </p>
          )}
        </div>
        {flag && !flag.endsWith('/') && (
          <img src={flag} alt="" draggable={false} loading="lazy" className="h-4 w-auto shrink-0 select-none rounded-[1px]" onError={handleImageError} />
        )}
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
      <SectionHeading id="artistFaq" icon={MessageCircleQuestionMark}>
        Artist FAQ
      </SectionHeading>
      <div className="space-y-3">
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
      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-black transition-opacity duration-200 hover:opacity-60"
    >
      {expanded ? 'Show less' : 'Read more'}
      <ChevronDown className={cn('size-4 transition-transform duration-300', expanded && 'rotate-180')} />
    </button>
  );
}

/** Follow/unfollow toggle next to the artist's display name. Signed-out
 * visitors are sent to /login instead of silently doing nothing. */
function FollowButton({ slug, name, accent }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFollowing = useFollowStore((s) => s.followedSlugs.includes(slug));
  const toggleFollow = useFollowStore((s) => s.toggleFollow);

  const handleClick = () => {
    if (!user) {
      navigate('/login', { state: { from: `/artist/${slug}` } });
      return;
    }
    toggleFollow(slug);
  };

  const Icon = isFollowing ? CircleCheck : CirclePlus;
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFollowing}
      title={isFollowing ? `Following ${name}` : `Follow ${name}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1 transition-colors duration-200',
        isFollowing ? 'text-black' : 'text-black/40 hover:text-black',
      )}
      style={isFollowing ? { color: accent } : undefined}
    >
      <Icon className="size-6 sm:size-7" strokeWidth={1.75} />
      <span className="sr-only">{isFollowing ? 'Unfollow' : 'Follow'}</span>
    </button>
  );
}

export default function ArtistPage() {
  const { slug } = useParams();
  const artist = ARTISTS_BY_SLUG[slug];
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
  // Similar Artists: only artists that actually share this artist's genre -
  // replacing the old hand-picked per-artist list. "Other Artists" is the
  // fallback shown (with an explanatory note) when nobody matches yet.
  const similarLinks = useMemo(() => {
    if (!artist) return [];
    return ALL_ARTISTS.filter((a) => a.name !== artist.displayName && a.genre === artist.genre);
  }, [artist]);
  const otherArtistLinks = useMemo(() => {
    if (!artist) return [];
    return ALL_ARTISTS.filter((a) => a.name !== artist.displayName && a.genre !== artist.genre);
  }, [artist]);

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

      {/* figure's background is now the artist's own avatar palette fading into
          the page's white (matches Bio/Links below) instead of a fixed cover
          photo - no more separate position:fixed <img> behind the page. */}
      <figure
        id="artist-hero"
        className="relative z-10 h-[14em] w-full sm:h-[50vh]"
        style={{ background: `linear-gradient(${avatarPalette.accent}, ${COLOR.white})` }}
      >
        {/* Same container + 2-column split as the profile row below, so the avatar
            stays centered over the left column at every width. */}
        <div className={cn(CONTAINER, 'flex h-full')}>
          <figcaption className="flex w-full items-start justify-center sm:pt-[10%] md:w-1/2 md:pr-3">
            <img
              src={artist.avatarImg}
              alt={artist.displayName}
              fetchPriority="high"
              className="pointer-events-none size-32 rounded-full object-cover sm:size-72"
              style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' }} onError={handleImageError} />
          </figcaption>
        </div>
      </figure>

      <main className="-mt-4 bg-[#f5f5fc] pb-12">
        {/* Profile row */}
        <section className={cn(CONTAINER, 'flex flex-wrap')}>
          {/* Left: profile / bio / links / fanbase*/}
          <div className="w-full pt-24 sm:pt-20 md:w-1/2 md:pr-3" id="section1">
            <div className="py-3 text-center font-[family-name:var(--font-anton)]">
              <div className="mx-auto flex w-full items-center justify-center gap-2 sm:w-3/4">
                <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">{artist.displayName}</h1>
                <FollowButton slug={artist.slug} name={artist.displayName} accent={avatarPalette.accent} />
              </div>
              <div className="mx-auto mt-1.5 flex w-full items-center justify-center gap-2 sm:w-3/4">
                {artist.countryFlag && <img src={artist.countryFlag} alt="" className="h-4 w-auto" onError={handleImageError} />}
                <span className="text-sm text-black/90 sm:text-base">{artist.countryName}</span>
              </div>
            </div>

            {/* items-stretch (default) instead of items-start so both cards
                match the height of the taller one (Bio Artist) - Links then
                fills that same height and just centers its icon grid in it. */}
            <div className="flex flex-wrap items-stretch gap-3 sm:flex-nowrap">
              {/* Bio */}
              <div
                className={cn('w-full rounded-[4px] border border-[#ddd] sm:w-[68%]', CARD_SHADOW)}
                style={{ background: bioBg }}
              >
                <p className="rounded-t-[4px] border-b border-black px-3 py-1 font-medium">Bio Artist</p>
                <div className="px-1">
                  {artist.bio
                    .filter((row) => row.label !== 'Active Years')
                    .map((row) => (
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

            {/* Fanbase: six compact stats, two rows of three */}
            <div className={cn(SECTION_GAP, 'scroll-mt-24')} id="section3">
              <SectionHeading id="fanbase" icon={UserGroup}>
                Fanbase
              </SectionHeading>
              <div className="grid grid-cols-3 gap-2">
                {FAN_ORDER.map((name) => artist.fanbase.find((f) => f.platform === name))
                  .filter(Boolean)
                  .map((f) => (
                    <FanbaseCard key={f.platform} {...f} />
                  ))}
              </div>
            </div>
          </div>

          {/* Right: Top track */}
          <div className="w-full pt-10 md:w-1/2 md:pl-3 md:pt-10" id="section2">
            <div className={cn("rounded-[4px]")}>
              <SectionHeading id="topTracks" icon={Music4}>Top Tracks</SectionHeading>

              <div
                className="mb-3 flex flex-wrap gap-4 rounded-[4px] p-3 sm:p-4"
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
              <div className="relative mt-4">
                <div className="relative">
                  <div
                    className={cn('text-sm leading-relaxed sm:text-[1.05em]', !songExpanded && 'line-clamp-6 sm:line-clamp-[10]')}
                    dangerouslySetInnerHTML={{ __html: artist.topTrack.aboutHtml }}
                  />
                  {!songExpanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f5f5fc] via-[#f5f5fc]/85 to-transparent" />
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
        <section className={cn(CONTAINER, SECTION_GAP)} id="section4">
          <SectionHeading id="popularSongs" icon={TrendingUp}>
            Popular Songs
          </SectionHeading>
          <Carousel key={artist.slug} className="-mx-3 flex h-[21em] flex-col flex-wrap content-start gap-4 px-3 py-4">
            {popularLinks.map((s, i) => (
              <SongCard key={i} img={s.img} title={s.title} artist={s.artist} date={s.date} to={s.to} />
            ))}
          </Carousel>
        </section>

        {/* Albums */}
        <section className={cn(CONTAINER, SECTION_GAP)} id="section5">
          <SectionHeading id="albums" icon={Disc3}>
            Albums
          </SectionHeading>
          <Carousel key={artist.slug} className="-mx-3 flex gap-4 px-3 py-4">
            {artist.albums.map((a, i) => (
              <AlbumCard key={i} {...a} />
            ))}
          </Carousel>
        </section>

        {/* Similar Artists */}
        <section className={cn(CONTAINER, SECTION_GAP)} id="section6">
          <SectionHeading id="recommended" icon={UserRoundSearch}>
            Similar Artists
          </SectionHeading>
          {similarLinks.length > 0 ? (
            <Carousel key={artist.slug} className="-mx-3 flex gap-4 px-3 py-4">
              {similarLinks.map((r, i) => (
                <RecommendedCard key={i} img={r.img} name={r.name} flag={r.flag} genre={r.genre} to={r.to} />
              ))}
            </Carousel>
          ) : (
            <>
              <p className="pb-3 text-sm text-black/60">
                We don&apos;t have a similar artist for {artist.displayName} yet - please check out these other artists below.
              </p>
              <Carousel key={artist.slug} className="-mx-3 flex gap-4 px-3 py-4">
                {otherArtistLinks.map((r, i) => (
                  <RecommendedCard key={i} img={r.img} name={r.name} flag={r.flag} genre={r.genre} to={r.to} />
                ))}
              </Carousel>
            </>
          )}
        </section>

        {/* Artist FAQ */}
        <section className={cn(CONTAINER, SECTION_GAP)} id="section7">
          <ArtistFaq key={artist.slug} items={artist.faq} />
        </section>
      </main>

      <SiteFooter dark accent={avatarPalette.accent} />
    </div>
  );
}
