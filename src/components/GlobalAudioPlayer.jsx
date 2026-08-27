import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Expand, Shrink, ListMusic, Blend, Users } from 'lucide-react';
import VinylDisc from '@/components/VinylDisc';
import Hint from '@/components/Hint';
import Waveform from '@/components/Waveform';
import QueuePanel from '@/components/QueuePanel';
import useWaveform from '@/hooks/useWaveform';
import useAudioEngine from '@/hooks/useAudioEngine';
import useLoudnessGain from '@/hooks/useLoudness';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { formatTime, usePlayerStore } from '@/stores/usePlayerStore';
import { handleImageError } from '@/lib/imageFallback';

const MINI_SIZE = 112; // px, size of the fused vinyl+cover widget when minimized
const SEEK_STEP = 5; // seconds, for the ArrowLeft/ArrowRight shortcuts
const BAR_COUNT = 5;

// A short, sharp buzz - similar weight to the iPhone 8's Home button click.
// Only actually does anything on browsers that support the Vibration API
// (Android Chrome/Firefox etc.) - iOS Safari has never implemented it, in
// the browser or as an installed PWA, so this is a silent no-op there.
function vibrateTick() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(15);
  }
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/** Live-updating equalizer bars driven by the audio engine's shared AnalyserNode. */
function Visualizer({ getAnalyser, isPlaying }) {
  const barRefs = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      barRefs.current.forEach((el) => el && (el.style.transform = 'scaleY(0.18)'));
      return undefined;
    }

    const analyser = getAnalyser();
    if (!analyser) return undefined;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const bucket = Math.max(1, Math.floor(data.length / BAR_COUNT));

    const loop = () => {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < bucket; j++) sum += data[i * bucket + j];
        const level = sum / bucket / 255;
        const el = barRefs.current[i];
        if (el) el.style.transform = `scaleY(${Math.max(0.12, level)})`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, getAnalyser]);

  return (
    <div className="flex h-3 shrink-0 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => (barRefs.current[i] = el)}
          className="h-full w-[3px] origin-bottom rounded-full bg-black/70 transition-transform duration-75"
          style={{ transform: 'scaleY(0.18)' }}
        />
      ))}
    </div>
  );
}

/** Plain, native <input type="range"> seek bar - deliberately not the base-ui
 * Slider here. Dragging/clicking a native range input is guaranteed to work
 * with zero library-specific event-signature guesswork, which matters for
 * something as core as scrubbing playback. */
function SeekBar({ value, onChange, onCommit, dark = false, waveform }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Waveform
        bars={waveform}
        progress={value}
        mutedColor={dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
        playedColor={dark ? '#feec93' : '#000'}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={(e) => onCommit(parseFloat(e.target.value))}
        onKeyUp={(e) => onCommit(parseFloat(e.target.value))}
        style={{ '--seek-progress': value }}
        className={cn('seek-range absolute inset-0 w-full', dark && 'seek-range--dark')}
        aria-label="Seek"
      />
    </div>
  );
}

export default function GlobalAudioPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  const minimizeBtnRef = useRef(null);
  const barRef = useRef(null);
  const crossfadeBtnRef = useRef(null);
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMini,
    crossfadeEnabled,
    seekRequest,
    togglePlay,
    setPlaying,
    setCurrentTime,
    setDuration,
    seek,
    toggleMini,
    toggleCrossfade,
    consumeSeekRequest,
    next,
    prev,
    playlist,
    playlistIndex,
    playAt,
    reorderQueue,
  } = usePlayerStore();

  const [isFullscreen, setFullscreen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  // Long-press (750ms) anywhere on the docked bar's own background opens
  // fullscreen on touch devices - the explicit fullscreen button is hidden
  // below `sm` since there's no room for it there, so this is how mobile
  // gets to the same view. Deliberately scoped to *touch* events only (not
  // mouse), and skipped entirely if the press started on an actual control
  // (button/input/link), so it never fights normal taps, the seek bar drag,
  // or desktop click-and-hold.
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  };

  const handleBarTouchStart = (event) => {
    if (event.touches.length !== 1 || event.target.closest('button, input, a')) return;
    const { clientX, clientY } = event.touches[0];
    longPressStartRef.current = { x: clientX, y: clientY };
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      vibrateTick();
      setFullscreen(true);
    }, 750);
  };

  const handleBarTouchMove = (event) => {
    if (!longPressStartRef.current || !event.touches[0]) return;
    const { clientX, clientY } = event.touches[0];
    const dx = clientX - longPressStartRef.current.x;
    const dy = clientY - longPressStartRef.current.y;
    if (Math.hypot(dx, dy) > 10) clearLongPress();
  };

  const handleBarTouchEnd = (event) => {
    clearLongPress();
    // The long-press already opened fullscreen - swallow the tap that would
    // otherwise fire right after release (e.g. toggling the mini widget).
    if (longPressFiredRef.current) event.preventDefault();
  };

  // The full-screen overlay is meant to sit on top of whatever page you
  // opened it from, not follow you to a different page - without this, it
  // was possible to open it, then navigate elsewhere (e.g. starting a
  // party) and have the full-screen player stuck on top, hiding the page
  // you just navigated to until manually minimized.
  useEffect(() => {
    setFullscreen(false);
  }, [location.pathname]);
  // While the user is actively dragging the seek thumb, show their drag position
  // instead of fighting it with the audio's real (laggier) currentTime updates.
  const [seekPreview, setSeekPreview] = useState(null);

  // Free-roam position for the mini (vinyl+cover) widget, like an AssistiveTouch bubble.
  const [pos, setPos] = useState(null); // null = default bottom-left slot
  const dragState = useRef(null);

  const nextTrack = playlistIndex >= 0 && playlistIndex < playlist.length - 1 ? playlist[playlistIndex + 1] : null;
  const activeGain = useLoudnessGain(currentSong?.audioSrc);
  // Speculatively measured ahead of time so the crossfade ramps the
  // incoming track to its own correct level from the first sample, instead
  // of blending in at an arbitrary volume and correcting itself afterward.
  const upcomingGain = useLoudnessGain(nextTrack?.audioSrc);

  const engine = useAudioEngine({
    crossfadeEnabled,
    activeGain,
    upcomingGain,
    nextTrack,
    onTimeUpdate: setCurrentTime,
    onDurationChange: setDuration,
    onEnded: () => {
      if (playlistIndex < playlist.length - 1) next();
      else setPlaying(false);
    },
    onAutoAdvance: next,
    onPlaybackError: () => setPlaying(false),
  });

  // Genuine track changes (first load, skip/prev, queue click) hard-load
  // into the active buffer. If this change was actually the *result* of a
  // crossfade that already finished swapping buffers in place, the engine
  // recognizes that itself and no-ops rather than restarting playback.
  useEffect(() => {
    if (!currentSong) return;
    engine.loadTrack(currentSong, { autoplay: isPlaying });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.slug]);

  useEffect(() => {
    if (!currentSong) return;
    if (isPlaying) engine.play();
    else engine.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentSong?.slug]);

  useEffect(() => {
    engine.setVolume(volume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  // One-shot external seek requests (e.g. clicking a lyric line on
  // LyricPage, which has no ref to the actual <audio> elements).
  useEffect(() => {
    if (!seekRequest) return;
    engine.seek(seekRequest.time);
    seek(seekRequest.time);
    consumeSeekRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest]);

  const seekBy = (deltaSeconds) => {
    // Reads live state straight from the Zustand store instead of the
    // `currentTime` captured by this render's closure - the keydown
    // effect below intentionally does NOT list currentTime as a
    // dependency (re-adding a document listener on every timeupdate tick
    // would be wasteful), so that captured value goes stale the moment
    // playback moves on. Clicking a lyric line jumps currentTime forward
    // via a one-shot seek, but without this the very next arrow-key press
    // still saw the pre-click time and "seeked" 5s from THAT - which,
    // near the start of a song, clamps right back to 0.
    const { currentTime: liveTime, duration: liveDuration } = usePlayerStore.getState();
    if (!liveDuration) return;
    const nextTime = Math.min(Math.max(liveTime + deltaSeconds, 0), liveDuration);
    engine.seek(nextTime);
    seek(nextTime);
  };

  // --- Keyboard shortcuts: Space = play/pause, ArrowLeft/Right = seek +-5s ------
  useEffect(() => {
    if (!currentSong) return undefined;
    const onKeyDown = (event) => {
      if (isTypingTarget(document.activeElement)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        seekBy(-SEEK_STEP);
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        seekBy(SEEK_STEP);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong, togglePlay, duration]);

  // --- Dragging the mini widget -------------------------------------------------
  const handlePointerDown = (event) => {
    if (!isMini) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragState.current = {
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isMini || !dragState.current) return;
    dragState.current.moved = true;
    const x = event.clientX - dragState.current.offsetX;
    const y = event.clientY - dragState.current.offsetY;
    const maxX = window.innerWidth - MINI_SIZE;
    const maxY = window.innerHeight - MINI_SIZE;
    setPos({ x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) });
  };

  const handlePointerUp = () => {
    if (!dragState.current) return;
    const wasDrag = dragState.current.moved;
    dragState.current = null;
    if (!wasDrag) toggleMini();
  };

  const progress = useMemo(() => {
    if (seekPreview !== null) return seekPreview;
    return duration ? (currentTime / duration) * 100 : 0;
  }, [seekPreview, currentTime, duration]);
  const remaining = duration ? duration - (seekPreview !== null ? (seekPreview / 100) * duration : currentTime) : 0;

  // Continuous drag preview - just update the visual position, don't touch the audio yet.
  const handleSeekChange = (value) => setSeekPreview(value);
  // Drag released (or a plain click on the track) - commit the real seek.
  const handleSeekCommit = (value) => {
    setSeekPreview(null);
    if (!duration) return;
    const nextTime = (value / 100) * duration;
    engine.seek(nextTime);
    seek(nextTime);
  };

  const canPrev = playlistIndex > 0 || currentTime > 3;
  const waveformBars = useWaveform(currentSong?.audioSrc);
  const canNext = playlistIndex >= 0 && playlistIndex < playlist.length - 1;

  const handleStartParty = async () => {
    if (!currentSong || starting) return;
    setStarting(true);
    try {
      const { createParty } = await import('@/lib/party');
      const partyId = await createParty({
        song: currentSong,
        isPlaying,
        position: currentTime,
        hostName: user?.displayName || user?.email || 'Host',
        hostUid: user?.uid ?? null,
      });
      navigate(`/party/${partyId}`);
      setFullscreen(false);
    } catch {
      // Firestore not enabled/reachable - nothing to recover into, the
      // person just stays on the regular player.
    } finally {
      setStarting(false);
    }
  };

  const PlayButton = ({ size = 'size-9', icon = 'size-5' }) => (
    <button
      type="button"
      onClick={togglePlay}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      className={cn('grid place-items-center text-black', size)}
    >
      {isPlaying ? <Pause className={cn(icon, 'fill-current')} /> : <Play className={cn(icon, 'fill-current')} />}
    </button>
  );

  return (
    <>
      {/* These two <audio> elements must always render, even before any
          song has ever been chosen - useAudioEngine wires up its
          timeupdate/loadedmetadata/ended listeners exactly once, on mount.
          If this component returned null until currentSong existed, that
          one-time setup would run while both refs were still null (nothing
          mounted yet), and listeners would never actually attach - audio
          would still play (loadTrack/play() act on the refs directly at
          click-time) but currentTime/duration would never update anywhere,
          which is exactly what a frozen progress bar looks like. */}
      <audio ref={engine.audioARef} preload="metadata" crossOrigin="anonymous" />
      <audio ref={engine.audioBRef} preload="metadata" crossOrigin="anonymous" />
      {currentSong && (
        <>

      {!isMini && (
        <>
          <Hint targetRef={minimizeBtnRef} offsetY={58} dark>Click the song to shrink it into a record you can drag anywhere</Hint>
          <Hint targetRef={crossfadeBtnRef} offsetY={58} dark>Toggle crossfade</Hint>
          <Hint targetRef={barRef} offsetY={150} dark mobileOnly>Press and hold to view fullscreen</Hint>
        </>
      )}

      <AnimatePresence mode="popLayout">
        {isMini ? (
          <motion.div
            key="mini"
            layoutId="player-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={pos ? { left: pos.x, top: pos.y, width: MINI_SIZE, height: MINI_SIZE } : { left: 12, bottom: '6%', width: MINI_SIZE, height: MINI_SIZE }}
            className="fixed z-50 cursor-grab touch-none select-none overflow-hidden rounded-full active:cursor-grabbing"
          >
            <div className="relative size-full shadow-[0.15em_0.25em_0.9em_rgba(0,0,0,0.35)]">
              <VinylDisc labelId="mini" className="size-full" />
              {/* Centered via flexbox, not a -translate-x/y-1/2 transform.
                  Framer Motion drives this element's `transform` directly
                  (for the layoutId FLIP animation, plus the infinite `rotate`
                  loop below) and fully owns that CSS property once it does -
                  it has no idea about a separate -50%/-50% translate baked
                  into a Tailwind utility class, so it would occasionally
                  overwrite/drop that centering offset mid-animation, making
                  the cover art appear to drift sideways and vanish off the
                  vinyl's label. Doing the centering with a non-transformed
                  wrapper sidesteps the conflict entirely. */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.img
                  layoutId="player-cover-art"
                  src={currentSong.coverSrc}
                  alt=""
                  draggable={false}
                  className="size-11 rounded-full object-cover ring-2 ring-white/70"
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={
                    isPlaying
                      ? { repeat: Infinity, duration: 3, ease: 'linear' }
                      : { duration: 0.3 }
                  }
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            layoutId="player-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-[3%] bottom-[3%] z-50 flex h-[4.25rem] items-center gap-2 rounded-md border border-black/80 bg-white/40 px-2 shadow-[0.1em_0.2em_0.8em_rgba(0,0,0,0.25)] backdrop-blur-md sm:inset-x-[10%] sm:bottom-[6%] sm:gap-3 sm:px-3"
            ref={barRef}
            onTouchStart={handleBarTouchStart}
            onTouchMove={handleBarTouchMove}
            onTouchEnd={handleBarTouchEnd}
            onTouchCancel={clearLongPress}
          >
            <button
              type="button"
              onClick={toggleMini}
              ref={minimizeBtnRef}
              className="-mx-1.5 -my-1 flex w-full max-w-[10rem] shrink-0 items-center gap-2 overflow-hidden rounded-md px-1.5 py-1 transition-colors hover:bg-gray-100 sm:max-w-[22em] sm:gap-2.5"
              aria-label="Minimize player"
            >
              {/* layoutId shared with the mini widget's cover art below -
                  Framer Motion FLIP-animates this square thumbnail
                  morphing into the mini vinyl's circular center label
                  (position, size, and border-radius all interpolate)
                  instead of the two states just cross-fading in place. */}
              <motion.img
                layoutId="player-cover-art"
                src={currentSong.coverSrc}
                alt=""
                className="size-11 shrink-0 rounded-sm object-cover"
                onError={handleImageError}
              />
              <div className="min-w-0 flex-col text-left">
                <p className="truncate text-base font-semibold text-black">{currentSong.songTitle}</p>
                <p className="truncate text-sm text-black/60">{currentSong.artistName}</p>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={prev}
                disabled={!canPrev}
                aria-label="Previous track"
                className="hidden size-8 place-items-center text-black disabled:opacity-30 sm:grid"
              >
                <SkipBack className="size-4 fill-current" />
              </button>
              <PlayButton />
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                aria-label="Next track"
                className="hidden size-8 place-items-center text-black disabled:opacity-30 sm:grid"
              >
                <SkipForward className="size-4 fill-current" />
              </button>
            </div>

            {/* Shared width for time/SeekBar/time - a single row now, no bars underneath. */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="hidden w-10 shrink-0 text-xs tabular-nums text-black/70 sm:inline">
                {formatTime(currentTime)}
              </span>
              <SeekBar value={progress} onChange={handleSeekChange} onCommit={handleSeekCommit} waveform={waveformBars} />
              <span className="hidden w-10 shrink-0 text-right text-xs tabular-nums text-black/70 sm:inline">
                -{formatTime(remaining)}
              </span>
            </div>

            {/* Crossfade toggle - same control as the full-screen view's
                Blend icon (see below), just also reachable without going
                full-screen. Amber when on (the default), plain when off. */}
            <button
              type="button"
              onClick={toggleCrossfade}
              ref={crossfadeBtnRef}
              aria-label={crossfadeEnabled ? 'Turn off crossfade' : 'Turn on crossfade'}
              aria-pressed={crossfadeEnabled}
              title={crossfadeEnabled ? 'Crossfade: on' : 'Crossfade: off'}
              className={cn(
                'hidden shrink-0 rounded-full p-1.5 transition-colors sm:block hover:bg-gray-100 hover:font-bold hover:text-black hover:[&>svg]:stroke-[2.5]',
                crossfadeEnabled ? 'bg-black/70 font-bold text-juow-accent [&>svg]:stroke-[2.5]' : 'text-black/40',
              )}
            >
              <Blend className="size-5" />
            </button>

            {/* Queue toggle - opens the same drag-reorderable "up next" panel
                as full-screen mode, right where the bass-reactive bars used
                to sit. */}
            <div className="relative hidden shrink-0 sm:block">
              <button
                type="button"
                onClick={() => setQueueOpen((v) => !v)}
                aria-label="Toggle queue"
                className={cn(
                  'rounded-full p-1.5 transition-colors hover:bg-gray-100 hover:font-bold hover:text-black hover:[&>svg]:stroke-[2.5]',
                  queueOpen ? 'bg-black/70 font-bold text-juow-accent [&>svg]:stroke-[2.5]' : 'text-black/50',
                )}
              >
                <ListMusic className="size-5" />
              </button>

              <AnimatePresence>
                {queueOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    style={{ transformOrigin: 'bottom right' }}
                    className="absolute bottom-[calc(100%+0.75rem)] right-0 z-10 w-80"
                  >
                    <QueuePanel
                      playlist={playlist}
                      playlistIndex={playlistIndex}
                      isPlaying={isPlaying}
                      playAt={playAt}
                      reorderQueue={reorderQueue}
                      className="max-h-[50vh] shadow-2xl"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setFullscreen(true)}
              aria-label="Full screen"
              className="hidden shrink-0 rounded-full p-1.5 text-black/60 transition-colors hover:bg-gray-100 hover:font-bold hover:text-black hover:[&>svg]:stroke-[2.5] active:bg-black/70 active:font-bold active:text-juow-accent active:[&>svg]:stroke-[2.5] sm:block"
            >
              <Expand className="size-5" />
            </button>

            <img src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png" alt="Juowle" className="hidden h-8 w-auto shrink-0 opacity-80 lg:block" onError={handleImageError} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen focus mode: reimplements the original (disabled/commented)
          full-screen player — big backdrop from the song cover, large controls. */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
          initial={{ opacity: 0, scale: 0.4, y: 80 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.4, y: 80 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            transformOrigin: 'bottom center',
            backgroundImage: `linear-gradient(rgba(255,255,255,0), rgba(0,0,0,0.85) 80%), url(${currentSong.coverSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          className="fixed inset-0 z-[110] flex flex-col items-center justify-end gap-6 bg-black px-4 pb-16 pt-24 text-white sm:px-6"
        >
          <button
            type="button"
            onClick={() => {
              vibrateTick();
              setFullscreen(false);
            }}
            aria-label="Exit full screen"
            className="absolute right-4 top-4 text-white/80 hover:text-white sm:right-6 sm:top-6"
          >
            <Shrink className="size-5 sm:size-6" />
          </button>

          <button
            type="button"
            onClick={handleStartParty}
            disabled={starting}
            aria-label="Start a listening party"
            title="Start a listening party"
            className="absolute right-28 top-4 text-white/80 transition-colors hover:text-white disabled:opacity-50 sm:right-40 sm:top-6"
          >
            <Users className="size-5 sm:size-6" />
          </button>

          <button
            type="button"
            onClick={toggleCrossfade}
            aria-label={crossfadeEnabled ? 'Turn off crossfade' : 'Turn on crossfade'}
            aria-pressed={crossfadeEnabled}
            title={crossfadeEnabled ? 'Crossfade: on' : 'Crossfade: off'}
            className={cn(
              'absolute right-20 top-4 transition-colors sm:right-28 sm:top-6',
              crossfadeEnabled ? 'text-juow-accent' : 'text-white/60 hover:text-white',
            )}
          >
            <Blend className="size-5 sm:size-6" />
          </button>

          <button
            type="button"
            onClick={() => setQueueOpen((v) => !v)}
            aria-label="Toggle queue"
            className={cn('absolute right-12 top-4 transition-colors sm:right-16 sm:top-6', queueOpen ? 'text-juow-accent' : 'text-white/80 hover:text-white')}
          >
            <ListMusic className="size-5 sm:size-6" />
          </button>

          <div className="text-center">
            <p className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl">{currentSong.songTitle}</p>
            <p className="mt-1 text-white/70">{currentSong.artistName}</p>
          </div>

          <div className="flex w-full max-w-md items-center justify-center gap-6">
            <button
              type="button"
              onClick={prev}
              disabled={!canPrev}
              aria-label="Previous track"
              className="grid size-10 place-items-center text-white disabled:opacity-30"
            >
              <SkipBack className="size-6 fill-current" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="grid size-16 place-items-center rounded-full bg-white text-black"
            >
              {isPlaying ? <Pause className="size-7 fill-current" /> : <Play className="size-7 fill-current" />}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canNext}
              aria-label="Next track"
              className="grid size-10 place-items-center text-white disabled:opacity-30"
            >
              <SkipForward className="size-6 fill-current" />
            </button>
          </div>

          <div className="flex w-full max-w-md items-center gap-3">
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/70">{formatTime(currentTime)}</span>
            <SeekBar value={progress} onChange={handleSeekChange} onCommit={handleSeekCommit} dark waveform={waveformBars} />
            <span className="w-10 shrink-0 text-xs tabular-nums text-white/70">-{formatTime(remaining)}</span>
          </div>
          <Visualizer getAnalyser={engine.getAnalyser} isPlaying={isPlaying} />

          <AnimatePresence>
            {queueOpen && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-md"
              >
                <QueuePanel
                  playlist={playlist}
                  playlistIndex={playlistIndex}
                  isPlaying={isPlaying}
                  playAt={playAt}
                  reorderQueue={reorderQueue}
                  className="max-h-[40vh]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </>
  );
}
