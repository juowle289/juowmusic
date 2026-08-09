import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import Loader from '@/components/Loader';
import SweepButton from '@/components/SweepButton';
import PlaylistCarousel from '@/components/PlaylistCarousel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getLastPlayedSlug, usePlayerStore } from '@/stores/usePlayerStore';
import { tracksBySlug } from '@/data/playableTracks';
import { handleImageError } from '@/lib/imageFallback';

const SPOTIFY_LINKS = {
  Vietnam: 'https://open.spotify.com/playlist/4YJnIVHbU50DhkGKGWKsiv?si=e24da81abcd84fdc',
  idiosyncrasy: 'https://open.spotify.com/playlist/5FUYKwQRiVasnuxYSd32Ti?si=66071eacc48b4804',
  female: 'https://open.spotify.com/playlist/031gqm3DJuYIITCgJFV0oC?si=576f4b88dfec48d2',
  male: 'https://open.spotify.com/playlist/0x9GQNsycTnRauVDsVej4l?si=445aeb8d04044393',
};

const BASE_PLAYLISTS = [
  { id: 'Vietnam', img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/SonTungMTP.jpg', title: 'VN', link: SPOTIFY_LINKS.Vietnam },
  { id: 'idiosyncrasy', img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/DPRIAN.jpg', title: 'Idiosyncrasy.', link: SPOTIFY_LINKS.idiosyncrasy },
  { id: 'female', img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/TataeMcRaeStats.jpg', title: 'My Soul-Female Voice', link: SPOTIFY_LINKS.female },
  { id: 'male', img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/JustinBieber.jpg', title: 'My Soul-Male Voice', link: SPOTIFY_LINKS.male },
];

// The 3D curved carousel wants ~10 cards in the ring to read as a full,
// dense curve edge-to-edge - there are only 4 real playlists, so the rest
// are duplicated round-robin from those same 4 (unique ids so React keys
// stay stable, everything else - image/title/link - identical to the
// original card).
const PLAYLISTS = Array.from({ length: 10 }, (_, i) => {
  const base = BASE_PLAYLISTS[i % BASE_PLAYLISTS.length];
  if (i < BASE_PLAYLISTS.length) return base;
  return { ...base, id: `${base.id}-dup${Math.floor(i / BASE_PLAYLISTS.length)}` };
});

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

export default function HomePage() {
  const videoRef = useRef(null);
  const [submitted, setSubmitted] = useState(false);
  const [continueTrack, setContinueTrack] = useState(null);
  const playSong = usePlayerStore((s) => s.playSong);
  const activeSlug = usePlayerStore((s) => s.currentSong?.slug);

  useEffect(() => {
    if (videoRef.current) videoRef.current.currentTime = 10;
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

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="pb-28">
      <Loader minDuration={1600} />

      <section className="relative w-full overflow-hidden">
        <div className="relative h-[50vh] w-full md:h-screen">
          <video
            ref={videoRef}
            src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/videos/DPRIAN-Nerves-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover md:-mt-[4.3rem]"
            onLoadedMetadata={() => {
              if (videoRef.current) videoRef.current.currentTime = 10;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* figcaption font-size cascades in the original (4em container, h1 at
              2.2em of that = ~8.8em/141px on desktop) - reproduced directly with
              explicit sizes here since Tailwind classes don't cascade em-on-em. */}
          <figcaption className="absolute left-[10%] top-[20%] max-w-2xl text-left text-white">
            <h1 className="font-[family-name:var(--font-display)] text-6xl font-bold leading-none sm:text-8xl md:text-[8.8em]">
              Nerves
            </h1>
            <h6 className="mt-2 text-xl font-thin sm:text-2xl md:text-[2.8em]">
              <span className="text-juow-accent">|</span>{' '}
              <a href="#" className="hover:text-juow-accent hover:underline">
                DPR IAN
              </a>
            </h6>
            <SweepButton
              as={Link}
              to="/lyrics/nerves"
              className="mt-6 border-2 border-juow-accent bg-black/60 px-4 py-2 text-xs uppercase tracking-widest text-white md:mt-8"
            >
              Listen Now
            </SweepButton>
          </figcaption>
        </div>

        <article className="relative -mt-16 bg-gradient-to-t from-black to-black/30 px-6 py-8 text-center text-base leading-relaxed text-juow-soft md:-mt-24 md:px-24 md:text-xl">
          <p>
            &ldquo;Made a lot of bad decisions in my life You know for whatever it&apos;s worth I sure it built me to
            become who I am now. But... honestly, there are times where I regret a lot of my decisions &ldquo;Nerves&rdquo;
            was one of the songs that I had to make to express that&rdquo;
          </p>
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

        <Reveal
          as={motion.h2}
          variant="textAppear"
          id="featured"
          className="section-heading mt-16 scroll-mt-24 text-4xl md:mt-20 md:text-[3.6em]"
        >
          MY PLAYLIST
        </Reveal>

        {/* Full-bleed wrapper: breaks the carousel out of <main>'s max-w-7xl
            + horizontal padding so the curved ring spans the entire
            viewport edge-to-edge (the ring's own radius auto-fits to
            whatever width it's given - see PlaylistCarousel), while the
            heading above it stays inside the normal content column. */}
        <div className="relative left-1/2 w-screen -translate-x-1/2">
          {/* A genuine 3D curved carousel - see PlaylistCarousel. Cards sit
              at fixed angles around a ring (rotateY + translateZ) that's
              only ever partially turned toward the viewer, so it reads as a
              row curving away into the distance at both ends rather than a
              flat strip. Auto-rotates right-to-left, and is fully
              drag/momentum/wheel controllable on top of that. */}
          <PlaylistCarousel
            items={PLAYLISTS}
            itemKey={(item) => item.id}
            renderItem={(item) => (
              <button
                type="button"
                onClick={() => window.open(item.link, '_blank')}
                className="group/card w-48 cursor-pointer border border-transparent transition-colors hover:border-juow-accent md:w-64"
              >
                <img src={item.img} alt={item.title} className="size-48 object-cover md:size-64" onError={handleImageError} />
                <h3 className="mt-3 text-center text-lg font-light md:text-[1.5em]">{item.title}</h3>
              </button>
            )}
            direction="right"
            speed={9}
            autoRotate
            hoverSlow
            draggable
            dragSensitivity={0.35}
            momentum
            mobileDrag
            scrollWheel
            perspective={1700}
            // The ring itself only has the 10 (partly duplicated) playlists
            // above, which alone is too coarse an angle-step for a gentle
            // curve (36° apart) - repeatCount lays that same set end-to-end
            // 3x around the ring (30 slots, 12° apart) purely so the curve
            // reads as smooth and dense, matching the reference screenshot,
            // without changing what's conceptually in the carousel.
            repeatCount={3}
            edgeFade={{ width: '14%', opacity: 0.95 }}
          />
        </div>

        <Reveal
          variant="slideLeft"
          id="news"
          className="scroll-mt-24 py-12 md:py-20"
          viewport={{ once: false, amount: 0.15 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-32">
            <div className="max-w-md text-center md:text-left">
              <Reveal as={motion.h2} variant="textY" className="section-heading text-left text-3xl md:text-[3.6em]">
                &apos; <span className="text-juow-accent">DPR IAN</span> &apos;
              </Reveal>
              <Reveal
                as={motion.h5}
                variant="textX"
                delay={0.15}
                className="mt-2 font-[family-name:var(--font-anton)] text-xl font-light md:text-[3.6em]"
              >
                MY FAVORITE SINGER
              </Reveal>
              <hr className="my-6 border-juow-accent" />
              <Reveal variant="scale" delay={0.3}>
                <SweepButton
                  href="#"
                  target="_blank"
                  rel="noreferrer"
                  className="h-auto w-full max-w-md border-2 border-juow-accent px-6 py-3 text-2xl text-juow-soft md:text-[2.5em]"
                >
                  WHO IS HE?
                </SweepButton>
              </Reveal>
            </div>

            <div className="relative">
              <img
                src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/referenceDPRIAN.png"
                alt="DPR IAN"
                className="h-[25rem] w-[18rem] object-cover md:h-[40rem] md:w-[30rem]" onError={handleImageError} />
              {/* A single dash chases clockwise around the frame, forever - like a
                  snake crawling around the edge with a gap between its head and
                  tail, instead of a full unbroken loop. */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 size-full overflow-visible"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="99"
                  height="99"
                  fill="none"
                  stroke="var(--color-juow-accent)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  pathLength="100"
                  strokeDasharray="22 78"
                  className="animate-[snake-crawl_4s_linear_infinite]"
                />
              </svg>
            </div>
          </div>
        </Reveal>

        <Reveal as={motion.h2} variant="textAppear" id="songs" className="section-heading scroll-mt-24 text-4xl md:text-[3.6em]">
          FAV SONGS
        </Reveal>

        <section className="mt-10 space-y-10">
          {FAV_SONGS.map((song) => (
            <article
              key={song.title}
              className={cn(
                'flex flex-wrap items-start gap-6 border-b-[0.3em] border-juow-accent pb-10',
                song.reverse ? 'md:flex-row-reverse' : 'md:flex-row',
              )}
            >
              <Reveal variant={song.reverse ? 'slideRight' : 'slideLeft'} className="min-w-0 flex-1">
                <h3 className="font-[family-name:var(--font-anton)] text-3xl underline decoration-juow-accent md:text-[2em]">
                  {song.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-white/80 md:text-lg">{song.description}</p>
              </Reveal>
              <Reveal variant="scale" className="w-full shrink-0 md:w-auto">
                <iframe
                  title={song.title}
                  src={song.embed}
                  className="aspect-video w-full max-w-full border border-juow-accent md:w-[640px]"
                  allowFullScreen
                />
              </Reveal>
            </article>
          ))}
        </section>

        <Reveal as={motion.h2} variant="textAppear" id="contact" className="section-heading mt-16 scroll-mt-24 text-4xl md:text-[3.6em]">
          CONTACT
        </Reveal>

        <form onSubmit={handleContactSubmit} className="mx-auto mt-8 max-w-3xl space-y-4 pb-12">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="name"
              placeholder="Full name"
              required
              className="h-12 border-white/20 bg-white/5 text-juow-soft placeholder:text-white/40"
            />
            <Input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="h-12 border-white/20 bg-white/5 text-juow-soft placeholder:text-white/40"
            />
          </div>
          <Textarea
            name="message"
            placeholder="Custom field"
            required
            rows={8}
            className="border-white/20 bg-white/5 text-juow-soft placeholder:text-white/40"
          />
          {!submitted ? (
            <Button type="submit" className="bg-juow-accent text-black hover:bg-juow-accent/90">
              Submit
            </Button>
          ) : (
            <p className="text-juow-accent">Submitted!</p>
          )}
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
