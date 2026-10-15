import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Play, X } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import Loader from '@/components/Loader';
import SweepButton from '@/components/SweepButton';
import PlaylistCarousel from '@/components/PlaylistCarousel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONTACT_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID } from '@/config/emailjs';
import { cn } from '@/lib/utils';
import { getLastPlayedSlug, usePlayerStore } from '@/stores/usePlayerStore';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { tracksBySlug } from '@/data/playableTracks';
import { handleImageError } from '@/lib/imageFallback';
import { RECOMMENDED_ARTISTS } from '@/data/recommendedArtists';

const BLOB = 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com';

// Hero banners: a background video + the song/artist shown over it. The dots under
// the banner switch between them. `artistTo` is the artist page (null = no page yet).
const HERO_BANNERS = [
  {
    id: 'nerves',
    video: `${BLOB}/videos/DPRIAN-Nerves-video.mp4`,
    startAt: 10, // seconds - the clip is cued to its good part
    title: 'Nerves',
    artist: 'DPR IAN',
    artistTo: null,
    listenTo: '/lyrics/nerves',
    blurb: "“Made a lot of bad decisions in my life You know for whatever it's worth I sure it built me to become who I am now. But... honestly, there are times where I regret a lot of my decisions “Nerves” was one of the songs that I had to make to express that”",
  },
  {
    id: 'after-hours',
    video: `${BLOB}/videos/TheWeeknd-AfterHours-video.mp4`,
    startAt: 0,
    title: 'After Hours',
    artist: 'The Weeknd',
    artistTo: '/artist/the-weeknd',
    listenTo: '/lyrics/afterHours',
    // From the song's own "About" text on its lyrics page.
    blurb: "“After Hours” is the title track and the third promotional single for The Weeknd’s fourth studio album After Hours. The song addresses a failed relationship that ended in heartbreak and serves as an apology letter for his past transgressions, as he desires reconciliation.",
  },
];

const FAV_SONGS = [
  {
    title: 'Violet Crazy',
    reverse: false,
    embed: 'https://www.youtube.com/embed/W7IMDIcnAOA?si=ZSOzPH6jLRgaBVD1&start=22',
    description:
      'The song delves into the intricate dynamics of a tumultuous and intense relationship...',
  },
  {
    title: 'Privilege',
    reverse: true,
    embed: 'https://www.youtube.com/embed/JcVDXHeD59c?si=u3UzFGK9cgAGCvN6&start=21',
    description:
      'Appears to be about a toxic relationship that has come to an end, and the singer\'s attempt to move on from it.',
  },
  {
    title: 'Ballroom Extravaganza',
    reverse: false,
    embed: 'https://www.youtube.com/embed/0cRPTCZv32s?si=_VWIIyBu0HnXY4zg&start=28',
    description: 'An emotive song about a relationship that has come to an end.',
  },
  {
    title: 'Chúng ta của tương lai',
    reverse: true,
    embed: 'https://www.youtube.com/embed/zoEtcR5EW08?si=V-qXU5pdy-toUU-f&start=47',
    description: 'Reflects on the nuances of human relationships and the bittersweet nature of love.',
  },
  {
    title: 'Loser',
    reverse: false,
    embed: 'https://www.youtube.com/embed/Sp6BS-rSr98?si=uidAEElsv0qptlr9&start=89',
    description: 'Delves into the aftermath of a failed relationship.',
  },
  {
    title: 'BLUE',
    reverse: true,
    embed: 'https://www.youtube.com/embed/_IjWFq1c5M4?si=ePUmR11K_Ucyn2Qo&start=9',
    description: 'Explores the aftermath of a breakup, with the narrator struggling to move on.',
  },
];

/**
 * Scroll-reveal variants, reimplementing the original site's CSS
 * `animation-timeline: view()` keyframes (textAppear / scale / translateX /
 * textY / textX in css/home.css) with Framer Motion's whileInView instead.
 * `animation-timeline: view()` is a very new CSS feature with limited
 * cross-browser support - whileInView (backed by IntersectionObserver) gives
 * the same "fades/slides in as you scroll to it, fades back out as you
 * scroll away" feel everywhere.
 */
const VARIANTS = {
  textAppear: {
    hidden: { opacity: 0, letterSpacing: '0.5em' },
    visible: { opacity: 1, letterSpacing: '0em', transition: { duration: 0.7, ease: 'easeOut' } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -80 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  },
  slideRight: {
    hidden: { opacity: 0, x: 80 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  },
  textY: {
    hidden: { opacity: 0, y: -14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  },
  textX: {
    hidden: { opacity: 0, x: -14 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  },
};

/** Wraps children with a whileInView reveal animation. Re-plays every time the
 * element scrolls back into view, matching the original's scroll-linked feel. */
function Reveal({ variant = 'scale', className, delay = 0, as: Component = motion.div, ...props }) {
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.3 }}
      variants={VARIANTS[variant]}
      transition={{ delay }}
      className={className}
      {...props}
    />
  );
}

/** Extracts the video id out of a `/embed/<id>?...` YouTube URL. */
function getYouTubeId(embedUrl) {
  try {
    return new URL(embedUrl).pathname.split('/').filter(Boolean).pop() || '';
  } catch {
    return '';
  }
}

/** Adds/overrides query params on a YouTube embed URL, keeping the rest
 * (like `start=`) untouched. */
function withParams(embedUrl, params) {
  try {
    const url = new URL(embedUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    return url.toString();
  } catch {
    return embedUrl;
  }
}

/**
 * A "click to play" facade over a YouTube embed, so the RECOMMENDED TRACKS section
 * shows nothing but our own poster + play button until someone actually
 * wants to watch - not YouTube's own pre-play thumbnail card (channel
 * avatar, video title bar, the big red play button, "Watch on YouTube").
 * That whole info card only exists in the *unstarted* iframe state, so
 * swapping it for a plain <img> + custom button removes it entirely; once
 * clicked we mount the real iframe with autoplay so it goes straight into
 * playback instead of showing that card at all. YouTube's small logo in the
 * player controls during actual playback can't be removed (their embed
 * terms require it) - modestbranding/rel/iv_load_policy just keep what's
 * left as minimal as YouTube allows.
 *
 * `isActive`/`onPlay`/`onStop` are lifted up to the parent list rather than
 * kept as local state, so only one of these can be "activated" (i.e. have
 * a live iframe) at a time across the whole RECOMMENDED TRACKS section - starting
 * another one flips this one back to the poster, which fully unmounts its
 * iframe and actually stops the audio instead of leaving it playing
 * unheard in the background.
 */
function YouTubeFacade({ embed, title, isActive, onPlay, onStop }) {
  const videoId = useMemo(() => getYouTubeId(embed), [embed]);
  const [posterSrc, setPosterSrc] = useState(() => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);

  const playSrc = useMemo(
    () => withParams(embed, { autoplay: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1 }),
    [embed],
  );

  if (isActive) {
    return (
      <div className="group relative aspect-video w-full max-w-full md:w-[640px]">
        <iframe
          title={title}
          src={playSrc}
          className="size-full border border-juow-accent"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
        {/* YouTube's own pause control is buried in its small control bar -
            this floating button gives an obvious, always-visible way to
            stop this video (fully unmounting the iframe, not just pausing
            visually) without hunting for it. */}
        <button
          type="button"
          onClick={onStop}
          aria-label={`Stop ${title}`}
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white/90 opacity-0 transition-opacity duration-200 hover:bg-black/90 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${title}`}
      className="group relative aspect-video w-full max-w-full overflow-hidden border border-juow-accent bg-black md:w-[640px]"
    >
      <img
        src={posterSrc}
        alt=""
        loading="lazy"
        className="size-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        onError={() => {
          // Not every video has a maxresdefault thumbnail (needs a
          // high-res source) - hqdefault always exists, so fall back to it
          // rather than showing a broken image.
          if (posterSrc.includes('maxresdefault')) setPosterSrc(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/0">
        <span className="flex size-14 items-center justify-center rounded-full bg-black/70 ring-2 ring-juow-accent transition-transform duration-300 group-hover:scale-110 md:size-16">
          <Play className="ml-1 size-6 fill-juow-accent text-juow-accent md:size-7" />
        </span>
      </span>
    </button>
  );
}

/** Photo card for the RECOMMENDED ARTISTS carousel - same design as the Albums cards
 * on the artist page: full-bleed photo, black gradient at the foot, name centered over it.
 * Links to the artist's page when there is one. The image can't be dragged or selected
 * (dragging belongs to the carousel); hover + click only. */
function ArtistCard({ artist }) {
  const Comp = artist.to ? Link : 'div';
  return (
    <Comp
      {...(artist.to ? { to: artist.to } : {})}
      draggable={false}
      className={cn(
        'group/card relative block aspect-square w-48 select-none overflow-hidden rounded-[4px] bg-black md:w-64',
        artist.to ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <img
        src={artist.img}
        alt={artist.name}
        draggable={false}
        className="size-full select-none object-cover transition-transform duration-500 [-webkit-user-drag:none] group-hover/card:scale-[1.04]"
        onError={handleImageError}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-center md:p-4">
        <h3 className="truncate font-[family-name:var(--font-anton)] text-xl leading-tight tracking-wide text-white md:text-2xl">
          {artist.name}
        </h3>
      </div>
    </Comp>
  );
}

export default function HomePage() {
  useDocumentTitle();
  const [submitted, setSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState('');
  const [continueTrack, setContinueTrack] = useState(null);
  const [singerIndex, setSingerIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [activeFavSong, setActiveFavSong] = useState(null);
  const playSong = usePlayerStore((s) => s.playSong);
  const activeSlug = usePlayerStore((s) => s.currentSong?.slug);

  const banner = HERO_BANNERS[bannerIndex];
  const singer = RECOMMENDED_ARTISTS[singerIndex];

  // "Who is this artist?" slideshow - cycles the portrait + gold name
  // together on a timer through the recommended artists.
  useEffect(() => {
    const id = setInterval(() => {
      setSingerIndex((i) => (i + 1) % RECOMMENDED_ARTISTS.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // "Continue Listening": pick up whatever was last played (persisted in
  // localStorage by the player store), skipping it once it's already the
  // song actively loaded in the global player.
  useEffect(() => {
    const slug = getLastPlayedSlug();
    if (slug && slug !== activeSlug && tracksBySlug[slug]) {
      setContinueTrack(tracksBySlug[slug]);
    } else if (!slug || slug === activeSlug) {
      setContinueTrack(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactError('');

    const form = e.target;
    const payload = {
      user_name: form.name.value.trim(),
      user_email: form.email.value.trim(),
      subject: form.subject.value,
      message: form.message.value.trim(),
    };

    setContactSubmitting(true);
    try {
      // Goes to EMAILJS_CONTACT_TEMPLATE_ID, a separate template from the
      // welcome email (see config/emailjs.js) - that template's own "To
      // Email" setting (configured in the EmailJS dashboard, not here)
      // decides who actually receives this, not anything sent from the
      // client. `subject`/`message`/`user_name`/`user_email` need to
      // match the variable names used inside that template's content.
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CONTACT_TEMPLATE_ID, payload, { publicKey: EMAILJS_PUBLIC_KEY });
      setSubmitted(true);
      form.reset();
    } catch (error) {
      console.error('[juowmusic] Contact form failed to send:', error);
      setContactError('Something went wrong sending this - please try again in a moment.');
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="pb-28">
      <Loader minDuration={1600} />

      <section className="relative w-full overflow-hidden">
        <div className="relative h-[50vh] w-full md:h-screen">
          <AnimatePresence initial={false}>
            <motion.div
              key={banner.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            >
              <video
                src={banner.video}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover md:-mt-[4.3rem]"
                onLoadedMetadata={(e) => {
                  if (banner.startAt) e.currentTarget.currentTime = banner.startAt;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* figcaption font-size cascades in the original (4em container, h1 at
                  2.2em of that = ~8.8em/141px on desktop) - reproduced directly with
                  explicit sizes here since Tailwind classes don't cascade em-on-em. */}
              <figcaption className="absolute inset-x-0 top-[30%] px-6 text-center text-white sm:inset-x-auto sm:left-[10%] sm:max-w-2xl sm:px-0 sm:text-left">
                <h1 className="font-[family-name:var(--font-display)] text-6xl font-bold leading-none sm:text-8xl md:text-[8.8em]">
                  {banner.title}
                </h1>
                <h6 className="mt-2 text-xl font-thin sm:text-2xl md:text-[2.8em]">
                  <span className="text-juow-accent">|</span>{' '}
                  {banner.artistTo ? (
                    <Link
                      to={banner.artistTo}
                      className="font-[family-name:var(--font-anton)] font-bold hover:text-juow-accent hover:underline"
                    >
                      {banner.artist}
                    </Link>
                  ) : (
                    <span className="font-[family-name:var(--font-anton)] font-bold">{banner.artist}</span>
                  )}
                </h6>
                <SweepButton
                  as={Link}
                  to={banner.listenTo}
                  className="mt-6 border-2 border-juow-accent bg-black/60 px-4 py-2 font-[family-name:var(--font-anton)] text-xs font-bold uppercase tracking-widest text-white transition-shadow duration-300 hover:shadow-[0_0_18px_4px_rgba(254,236,147,0.55)] md:mt-8"
                >
                  Listen Now
                </SweepButton>
              </figcaption>
            </motion.div>
          </AnimatePresence>

          {/* One dot per banner, centered under the banner text. */}
          <div
            role="tablist"
            aria-label="Featured banners"
            className="absolute inset-x-0 bottom-24 z-10 flex justify-center gap-1 md:bottom-32"
          >
            {HERO_BANNERS.map((b, i) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={i === bannerIndex}
                aria-label={`Banner ${i + 1}: ${b.title} - ${b.artist}`}
                onClick={() => setBannerIndex(i)}
                className="group p-2"
              >
                <span
                  className={cn(
                    'block size-3 rounded-full border transition-all duration-300',
                    i === bannerIndex
                      ? 'scale-110 border-juow-accent bg-juow-accent'
                      : 'border-white/70 bg-white/30 group-hover:bg-white/70',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <article className="relative -mt-16 bg-gradient-to-t from-black to-black/30 px-6 py-8 text-center text-base leading-relaxed text-juow-soft md:-mt-24 md:px-24 md:text-xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={banner.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {banner.blurb}
            </motion.p>
          </AnimatePresence>
        </article>
      </section>

      <main className="mx-auto max-w-7xl px-4 sm:px-8">
        {continueTrack && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            onClick={() => playSong(continueTrack)}
            className="group mt-10 flex w-full items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-juow-accent md:mt-14"
          >
            <div className="relative shrink-0">
              <img src={continueTrack.coverSrc} alt="" className="size-16 rounded object-cover" onError={handleImageError} />
              <span className="absolute inset-0 flex items-center justify-center rounded bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="size-6 fill-juow-accent text-juow-accent" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-juow-accent">Continue Listening</p>
              <p className="truncate text-lg">{continueTrack.songTitle}</p>
              <p className="truncate text-sm text-juow-soft/60">{continueTrack.artistName}</p>
            </div>
          </motion.button>
        )}

        {/* #featured wraps the whole "Recommended Artists" part (heading, carousel and
            the "Who is this artist?" slideshow) so the header's scroll-spy treats it
            as one section. */}
        <div id="featured" className="scroll-mt-24">
        <Reveal
          as={motion.h2}
          variant="textAppear"
          className="section-heading mt-24 text-4xl md:mt-32 md:text-[3.6em]"
        >
          RECOMMENDED ARTISTS
        </Reveal>

        {/* Full-bleed wrapper: breaks the carousel out of <main>'s max-w-7xl
            + horizontal padding so the curved ring spans the entire
            viewport edge-to-edge (the ring's own radius auto-fits to
            whatever width it's given - see PlaylistCarousel), while the
            heading above it stays inside the normal content column.
            `overflow-hidden` clips exactly at that same viewport edge - the
            3D ring's rotateY/translateZ cards curving toward the ends
            geometrically extend past this box even though they're not
            visually meant to be seen there, and with nothing clipping them
            the browser was treating that as real scrollable content,
            making the *whole page* swipeable sideways. */}
        <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
          {/* A genuine 3D curved carousel - see PlaylistCarousel. Cards sit at fixed
              angles around a ring (rotateY + translateZ) that's only ever partially
              turned toward the viewer, so it reads as a row curving away into the
              distance at both ends. Auto-rotates right-to-left; the only way to move it
              by hand is to press and drag/swipe (momentum on release) - the mouse wheel
              and hovering do NOT scroll it (scrollWheel is off, so the page scrolls
              normally while the cursor is over it). */}
          <PlaylistCarousel
            items={RECOMMENDED_ARTISTS}
            itemKey={(artist) => artist.name}
            renderItem={(artist) => <ArtistCard artist={artist} />}
            direction="right"
            speed={9}
            autoRotate
            hoverSlow
            draggable
            dragSensitivity={0.35}
            momentum
            mobileDrag
            scrollWheel={false}
            perspective={1700}
            // 7 artists alone are too coarse an angle step (~51 deg) for a gentle curve -
            // repeatCount lays the same set end-to-end 4x around the ring (28 slots,
            // ~13 deg apart) purely so the curve reads as smooth and dense.
            repeatCount={4}
            edgeFade={{ width: '14%', opacity: 0.95 }}
          />
        </div>

        <Reveal
          variant="slideLeft"
          className="py-12 md:py-20"
          viewport={{ once: false, amount: 0.15 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-32">
            <div className="max-w-md text-center md:text-left">
              <Reveal as={motion.h2} variant="textY" className="section-heading text-left text-3xl md:text-[3.6em]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={singer.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="inline-block"
                  >
                    &apos; <span className="text-juow-accent">{singer.name}</span> &apos;
                  </motion.span>
                </AnimatePresence>
              </Reveal>
              <Reveal
                as={motion.h5}
                variant="textX"
                delay={0.15}
                className="mt-2 font-[family-name:var(--font-anton)] text-xl font-light md:text-[3.6em]"
              >
                Who is this artist?
              </Reveal>
              <hr className="my-6 border-juow-accent" />
              <Reveal variant="scale" delay={0.3}>
                {singer.to ? (
                  <SweepButton
                    as={Link}
                    to={singer.to}
                    className="flex h-auto w-full max-w-md items-center justify-center gap-3 border-2 border-juow-accent px-6 py-3 text-2xl font-bold text-juow-soft transition-shadow duration-300 hover:shadow-[0_0_18px_4px_rgba(254,236,147,0.55)] md:text-[2.5em]"
                  >
                    VIEW PROFILE
                    <ArrowRight className="size-6 shrink-0 md:size-10" />
                  </SweepButton>
                ) : (
                  // This artist has no page yet (see data/recommendedArtists.js).
                  <div
                    aria-disabled="true"
                    className="flex h-auto w-full max-w-md cursor-not-allowed items-center justify-center gap-3 border-2 border-white/15 px-6 py-3 text-2xl font-bold text-juow-soft/40 md:text-[2.5em]"
                  >
                    PROFILE COMING SOON
                  </div>
                )}
              </Reveal>
            </div>

            <div className="relative h-[25rem] w-[18rem] md:h-[40rem] md:w-[30rem]">
              <AnimatePresence>
                <motion.img
                  key={singer.img}
                  src={singer.img}
                  alt={singer.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                  className="absolute inset-0 size-full object-cover"
                  onError={handleImageError}
                />
              </AnimatePresence>
              {/* A single gap chases clockwise around the frame, forever - like a
                  snake crawling around the edge, head and tail never touching.
                  Built as a conic-gradient ring (masked down to just its outer
                  2px, via mask-composite "punching out" the inner content-box)
                  rather than a dashed SVG path: the frame isn't square, and an
                  SVG path's dash lengths are computed in the pre-stretch
                  coordinate space, so a non-square box distorted how long each
                  side's visible segment/gap looked and could fracture the line
                  in ways that didn't match this rectangle's real proportions.
                  This is plain CSS on the actual rendered box, so it always
                  traces the real edges exactly regardless of aspect ratio. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 animate-[snake-spin_6s_linear_infinite]"
                style={{
                  padding: '2px',
                  background:
                    'conic-gradient(from var(--snake-angle, 0deg), var(--color-juow-accent) 0 92%, transparent 92% 100%)',
                  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  maskComposite: 'exclude',
                }}
              />
            </div>
          </div>
        </Reveal>
        </div>

        {/* #songs wraps the heading and the track list (header scroll-spy section). */}
        <div id="songs" className="scroll-mt-24">
        <Reveal as={motion.h2} variant="textAppear" className="section-heading mt-24 text-4xl md:mt-32 md:text-[3.6em]">
          RECOMMENDED TRACKS
        </Reveal>

        <section className="mt-10 space-y-10">
          {FAV_SONGS.map((song) => (
            <article
              key={song.title}
              className={cn('flex flex-wrap items-start gap-6 pb-10', song.reverse ? 'md:flex-row-reverse' : 'md:flex-row')}
            >
              <Reveal variant={song.reverse ? 'slideRight' : 'slideLeft'} className="min-w-0 flex-1">
                <h3 className="font-[family-name:var(--font-anton)] text-3xl underline decoration-juow-accent md:text-[2em]">
                  {song.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-white/80 md:text-lg">{song.description}</p>
              </Reveal>
              <Reveal variant="scale" className="w-full shrink-0 md:w-auto">
                <YouTubeFacade
                  embed={song.embed}
                  title={song.title}
                  isActive={activeFavSong === song.title}
                  onPlay={() => setActiveFavSong(song.title)}
                  onStop={() => setActiveFavSong(null)}
                />
              </Reveal>
            </article>
          ))}
        </section>
        </div>

        <Reveal as={motion.h2} variant="textAppear" id="contact" className="section-heading mt-24 scroll-mt-24 text-4xl md:mt-32 md:text-[3.6em]">
          CONTACT
        </Reveal>

        <form onSubmit={handleContactSubmit} className="mx-auto mt-8 max-w-3xl space-y-4 pb-12">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="name"
              placeholder="Full name"
              required
              className="h-12 rounded-none border-white/20 bg-white/5 text-juow-soft placeholder:text-white/40"
            />
            <Input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="h-12 rounded-none border-white/20 bg-white/5 text-juow-soft placeholder:text-white/40"
            />
          </div>

          <select
            name="subject"
            required
            defaultValue=""
            className="h-12 w-full rounded-none border border-white/20 bg-white/5 px-3 text-sm text-juow-soft focus:border-juow-accent focus:outline-none"
          >
            <option value="" disabled className="bg-black text-white/40">
              What&apos;s this about?
            </option>
            <option value="Feedback" className="bg-black text-white">Feedback on the site</option>
            <option value="Bug report" className="bg-black text-white">Something&apos;s broken</option>
            <option value="Feature request" className="bg-black text-white">Feature request</option>
            <option value="Business inquiry" className="bg-black text-white">Business / collab inquiry</option>
            <option value="Other" className="bg-black text-white">Other</option>
          </select>

          <Textarea
            name="message"
            placeholder="Tell us more..."
            required
            rows={8}
            className="rounded-none border-white/20 bg-white/5 text-juow-soft placeholder:text-white/40"
          />

          {!submitted ? (
            <SweepButton
              as="button"
              type="submit"
              disabled={contactSubmitting}
              className="border-2 border-juow-accent bg-black/60 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-shadow duration-300 hover:shadow-[0_0_18px_4px_rgba(254,236,147,0.55)] disabled:opacity-50"
            >
              {contactSubmitting ? 'Sending…' : 'Submit'}
            </SweepButton>
          ) : (
            <p className="text-juow-accent">Thanks — I got it!</p>
          )}
          {contactError && <p className="text-sm text-red-400">{contactError}</p>}
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
