import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, Share2, X } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import Loader from '@/components/Loader';
import Comments from '@/components/Comments';
import QASection from '@/components/QASection';
import VinylDisc from '@/components/VinylDisc';
import PartyBubbles from '@/components/PartyBubbles';
import LyricShareModal, { extractAccentColor } from '@/components/LyricShareModal';
import useInlineStyle from '@/hooks/useInlineStyle';
import useCoverPalette from '@/hooks/useCoverPalette';
import useLyricPlayer from '@/hooks/useLyricPlayer';
import { findClickedLineIndex } from '@/lib/lyricLines';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { cn } from '@/lib/utils';

import afterHours from '@/data/lyrics/afterHours.json';
import ballroomExtravaganza from '@/data/lyrics/ballroomExtravaganza.json';
import blue from '@/data/lyrics/blue.json';
import chungTaCuaTuongLai from '@/data/lyrics/chungTaCuaTuongLai.json';
import hayTraoChoAnh from '@/data/lyrics/hayTraoChoAnh.json';
import nerves from '@/data/lyrics/nerves.json';
import oneOfTheGirls from '@/data/lyrics/oneOfTheGirls.json';
import theColorViolet from '@/data/lyrics/theColorViolet.json';
import { handleImageError } from '@/lib/imageFallback';

const SONGS = {
  afterHours,
  ballroomExtravaganza,
  blue,
  chungTaCuaTuongLai,
  hayTraoChoAnh,
  nerves,
  oneOfTheGirls,
  theColorViolet,
};

export default function LyricPage() {
  const { slug } = useParams();
  const song = SONGS[slug];
  useInlineStyle(song?.customStyle);
  const palette = useCoverPalette(song?.coverSrc);
  useLyricPlayer(song);
  const [adsClosed, setAdsClosed] = useState(false);

  // The vinyl behind the cover art should stay fully tucked out of sight
  // until this exact song is actually playing - only then does it slide
  // out from behind the cover and spin, instead of always being visible
  // (previously oversized + offset, so it permanently peeked out around
  // the cover's edges even at rest).
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const activeSlug = usePlayerStore((s) => s.currentSong?.slug);
  const requestSeek = usePlayerStore((s) => s.requestSeek);
  const isThisSongPlaying = isPlaying && activeSlug === song?.slug;

  const hasLineTimestamps = Array.isArray(song?.lineTimestamps) && song.lineTimestamps.length > 0;

  /** Click-to-seek: only wired up when this song actually has tapped
   * timestamps (see /tools/lyric-sync) - songs without them keep the lyric
   * block as plain, non-interactive text rather than a misleading
   * click-that-does-nothing. */
  const handleLyricClick = (event) => {
    if (!hasLineTimestamps || !lyricRef.current) return;
    const lineIndex = findClickedLineIndex(lyricRef.current, event.target);
    if (lineIndex === null) return;
    const time = song.lineTimestamps[lineIndex];
    if (typeof time !== 'number') return;
    requestSeek(time, {
      slug: song.slug,
      songTitle: song.songTitle,
      artistName: song.artistName,
      coverSrc: song.coverSrc,
      audioSrc: song.audioSrc,
    });
  };

  const lyricRef = useRef(null);
  const shareButtonRef = useRef(null);
  const [selectionBubble, setSelectionBubble] = useState(null); // { text, top, left }
  const [shareText, setShareText] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  // Lets people highlight a line or two of the lyrics and turn it into a
  // shareable image card (see LyricShareModal) - a small floating "Share"
  // button appears right above whatever they've just selected, but only
  // when the selection is inside the lyric block itself (not the About/Q&A
  // text further down the page).
  //
  // This deliberately reads the selection on mouseup/touchend, not on the
  // `selectionchange` event. `selectionchange` fires continuously - on every
  // single pixel the mouse moves while dragging - and calling setState that
  // often mid-drag caused constant re-renders that fought with the browser's
  // own native text-selection handling, making it nearly impossible to
  // select a precise partial line (the selection kept snapping/flickering
  // back). Only checking once the mouse button is released avoids touching
  // React state at all during the actual drag gesture.
  useEffect(() => {
    const readSelection = (event) => {
      // Clicking the floating "Share" button itself also fires this same
      // document-level mouseup (it bubbles up before the browser's `click`
      // event is dispatched). Without this check, that click would re-run
      // the selection check, find nothing new, and call setSelectionBubble
      // (null) - unmounting the button a beat before `click` actually
      // reaches it, so the click was silently swallowed and the modal never
      // opened. Selection handling should only ever react to mouseups that
      // happen out in the lyric text, not on the button it produces.
      if (shareButtonRef.current?.contains(event.target)) return;

      const sel = window.getSelection();
      const text = sel?.toString().trim();
      const container = lyricRef.current;

      if (!sel || sel.isCollapsed || !text || !container || !container.contains(sel.anchorNode)) {
        setSelectionBubble(null);
        return;
      }
      if (text.length > 280) {
        setSelectionBubble(null);
        return;
      }

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelectionBubble({
        text,
        top: rect.top - 46,
        left: rect.left + rect.width / 2,
      });
    };

    const dismiss = () => setSelectionBubble(null);
    document.addEventListener('mouseup', readSelection);
    document.addEventListener('touchend', readSelection);
    window.addEventListener('scroll', dismiss, { passive: true });
    return () => {
      document.removeEventListener('mouseup', readSelection);
      document.removeEventListener('touchend', readSelection);
      window.removeEventListener('scroll', dismiss);
    };
  }, []);

  const openShareCard = () => {
    if (!selectionBubble) return;
    setShareText(selectionBubble.text);
    setShareOpen(true);
    setSelectionBubble(null);
    window.getSelection()?.removeAllRanges();
  };

  if (!song) {
    return (
      <main className="flex min-h-screen items-center justify-center px-8 pt-24 text-juow-soft">
        <h1 className="font-[family-name:var(--font-anton)] text-3xl">Song not found</h1>
      </main>
    );
  }

  return (
    <div className="bg-white">
      <Loader />

      {/* Hero: colored per-song gradient set via useInlineStyle(customStyle), white text.
          .song-hero is the scoped target for each song's customStyle "nav {...}" rule
          (see useInlineStyle) so it can't bleed into the site header's own <nav> menu.
          Two real flex columns with a gap (instead of viewport-wide absolute offsets)
          so the artwork and the text block never collide, at any zoom level. */}
      <nav
        className="song-hero relative min-h-[25em] overflow-visible px-[5%] pb-6 pt-20 sm:h-[25em] sm:px-[10%]"
        style={{ backgroundImage: palette.gradient }}
      >
        <div className="flex h-full flex-wrap items-start gap-8 md:flex-nowrap md:gap-12">
          {/* Left: vinyl + cover, own small relative box so their absolute
              positioning is local to it (not calculated against the full nav width).
              This box widens while playing (22em -> 28em) so the flex layout
              itself pushes the text column over by the same distance the vinyl
              slides out - otherwise the vinyl's peeking edge sits on top of the
              title/meta text instead of beside it. */}
          <div
            className={cn(
              'relative hidden h-[22em] shrink-0 transition-[width] duration-500 ease-out sm:block',
              isThisSongPlaying ? 'w-[28em]' : 'w-[22em]',
            )}
          >
            <VinylDisc
              labelId="hero"
              spinning={isThisSongPlaying}
              className={cn(
                'absolute left-0 top-0 size-[22em] transition-transform duration-500 ease-out [animation-duration:3s]',
                // Purely horizontal - it should peek out to the right from
                // behind the cover, not drift diagonally down-right.
                isThisSongPlaying ? 'translate-x-[6em]' : 'translate-x-0',
              )}
            />
            <img
              src={song.coverSrc}
              alt={song.songTitle}
              className="absolute left-0 top-0 size-[22em] object-cover shadow-2xl" onError={handleImageError} />
          </div>
          {/* Mobile cover: simple, non-overflowing, sits above the text block. */}
          <img
            src={song.coverSrc}
            alt={song.songTitle}
            className="relative z-[2] size-40 object-cover shadow-2xl sm:hidden" onError={handleImageError} />

          {/* Right: text column. flex-col + mt-auto on the meta row (instead of
              absolutely pinning it to the column's bottom) keeps title/about
              and meta from ever overlapping - meta simply flows after
              whatever height the about text actually ends up taking,
              however long that turns out to be, rather than both being
              positioned independently and assumed to never collide.
              Text color flips black/white based on the sampled cover
              brightness so it stays readable against any auto-generated
              background, light or dark. */}
          <div
            className={cn(
              'relative flex min-w-0 flex-1 flex-col self-stretch pt-2 sm:pt-4',
              palette.isLight ? 'text-black' : 'text-[#f5f5fc]',
            )}
          >
            <div className="min-w-0">
              <h1 className="font-[family-name:var(--font-anton)] text-4xl font-medium leading-tight md:text-5xl">{song.songTitle}</h1>
              <h2
                className={cn(
                  'mt-3 text-base [&_a:hover]:underline',
                  palette.isLight ? 'text-black/70 [&_a]:text-black' : 'text-white/80 [&_a]:text-[#f5f5fc]',
                )}
                dangerouslySetInnerHTML={{ __html: song.songMetaHtml }}
              />
              <p
                className={cn(
                  'mt-1 text-sm',
                  palette.isLight ? 'text-black/60 [&_a]:text-black' : 'text-white/70 [&_a]:text-[#f5f5fc]',
                )}
                dangerouslySetInnerHTML={{ __html: song.producerHtml }}
              />

              <div className="mt-4 hidden max-w-xl md:block">
                {/* Clamped to exactly 3 lines - the browser appends its own
                    "…" on whichever line the text gets cut off at. Width is
                    free (bounded only by the max-w-xl wrapper above), only
                    the line count is capped. */}
                <p
                  className={cn('line-clamp-3 text-sm leading-relaxed', palette.isLight ? 'text-black/70' : 'text-white/80')}
                  dangerouslySetInnerHTML={{ __html: song.tinyAboutHtml }}
                />
                <a
                  href="#about"
                  className={cn(
                    'mt-2 inline-flex items-center gap-2 rounded border px-2 py-0.5 text-sm hover:border-[#337ab7] hover:text-[#337ab7]',
                    palette.isLight ? 'border-black/50 text-black' : 'border-white text-[#f5f5fc]',
                  )}
                >
                  More <ArrowDown className="size-4" />
                </a>
              </div>
            </div>

            {/* Meta (date / viewers / views) - pushed to the bottom of the
                column by mt-auto, never overlapping the content above it. */}
            <div
              className={cn(
                'mt-auto flex flex-wrap gap-4 pt-4 text-xs [&_p]:flex [&_p]:items-center [&_p]:gap-1',
                palette.isLight ? 'text-black/60' : 'text-[#ddd]',
              )}
              dangerouslySetInnerHTML={{ __html: song.metaHtml }}
            />
          </div>
        </div>
      </nav>

      {/* Lyrics + About + Q&A + Comments: white background, black text (matches original main{background:#fff}) */}
      <main className="bg-white px-[5%] pb-32 sm:px-[10%]">
        <section id="lyrics" className="scroll-mt-24 flex flex-wrap justify-between gap-10 bg-white py-8">
          <div
            ref={lyricRef}
            onClick={handleLyricClick}
            className={cn(
              'lyric min-w-0 flex-1 text-black',
              hasLineTimestamps && '[&_p:not(:has(q))]:cursor-pointer [&_p:not(:has(q))]:rounded [&_p:not(:has(q))]:transition-colors [&_p:not(:has(q))]:hover:bg-black/5',
            )}
          >
            <div dangerouslySetInnerHTML={{ __html: song.lyricHtml }} />
          </div>

          <aside className="sticky top-0 h-fit w-full shrink-0 pt-[4%] md:w-80">
            <div className="mb-0 rounded-t bg-black py-2 text-center text-lg text-[#f5f5fc]">You may also like</div>
            {song.recommended.map((rec) => (
              <Link
                to={rec.link}
                key={rec.title}
                className="flex items-center gap-4 border-x border-b border-dashed border-black p-4 transition-colors hover:bg-[#feec93]"
              >
                <img src={rec.img} alt={rec.title} className="size-16 shrink-0 object-cover" onError={handleImageError} />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-medium text-black">{rec.title}</h3>
                  <p className="truncate text-black/50">{rec.artist}</p>
                </div>
              </Link>
            ))}

            <PartyBubbles />
          </aside>
        </section>

        {/* Full width of main's content box (up to where the aside above ends),
            not the narrower 60% column the original design used. */}
        <section id="about" className="about scroll-mt-24 mb-12 w-full border-b-[0.3em] border-[#a00000] py-12">
          <h1 className="section-heading mb-8 text-black">About</h1>
          <div
            className="mx-auto max-w-3xl text-[1.2em] text-black [&_p]:mb-2 [&_p]:indent-4 [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: song.aboutHtml }}
          />
        </section>

        <QASection items={song.qa} />
        <Comments slug={song.slug} />
      </main>

      {!adsClosed && song.spotifyLink && (
        <div className="fixed bottom-28 right-4 z-40 md:bottom-32">
          <button
            type="button"
            onClick={() => setAdsClosed(true)}
            className="absolute -right-2 -top-2 rounded-full bg-black/80 p-1 text-white"
            aria-label="Close Spotify link"
          >
            <X className="size-4" />
          </button>
          <a
            href={song.spotifyLink}
            target="_blank"
            rel="noreferrer"
            className="flex size-14 items-center justify-center rounded-full bg-[#1ed760] text-black shadow-lg"
            aria-label="Open on Spotify"
          >
            <i className="bi bi-spotify text-2xl" aria-hidden />
          </a>
        </div>
      )}

      <SiteFooter dark />

      {selectionBubble && (
        <button
          ref={shareButtonRef}
          type="button"
          onMouseDown={(e) => e.preventDefault()} // keep the text selection alive through the click
          onClick={openShareCard}
          style={{ top: selectionBubble.top, left: selectionBubble.left }}
          className="fixed z-[150] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs text-white shadow-xl transition-opacity"
        >
          <Share2 className="size-3.5" /> Share
        </button>
      )}

      <LyricShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        quote={shareText}
        songTitle={song.songTitle}
        artistName={song.artistName}
        coverSrc={song.coverSrc}
        accentColor={extractAccentColor(song.customStyle)}
      />
    </div>
  );
}
