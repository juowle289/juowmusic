import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Expand, Shrink, ListMusic } from 'lucide-react';
import VinylDisc from '@/components/VinylDisc';
import Waveform from '@/components/Waveform';
import QueuePanel from '@/components/QueuePanel';
import useWaveform from '@/hooks/useWaveform';
import { cn } from '@/lib/utils';
import { formatTime, usePlayerStore } from '@/stores/usePlayerStore';
import { handleImageError } from '@/lib/imageFallback';

const MINI_SIZE = 112; // px, size of the fused vinyl+cover widget when minimized
const SEEK_STEP = 5; // seconds, for the ArrowLeft/ArrowRight shortcuts
const BAR_COUNT = 5;

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/** Live-updating equalizer bars driven by a Web Audio AnalyserNode on the <audio> element. */
function Visualizer({ audioRef, isPlaying }) {
  const barRefs = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      barRefs.current.forEach((el) => el && (el.style.transform = 'scaleY(0.18)'));
      return undefined;
    }

    const audio = audioRef.current;
    if (!audio) return undefined;

    // createMediaElementSource() may only ever be called ONCE for a given
    // <audio> element - calling it a second time throws and leaves the
    // element's audio pipeline broken (silent / unseekable), which is exactly
    // what happens if this ran again after a hot-reload while the same
    // element survives. So the graph is cached directly on the DOM node
    // itself (audio._vizGraph) rather than in a React ref, since the node
    // persists across re-mounts even when the component instance doesn't.
    if (audio._vizGraph === undefined) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audio._vizGraph = { ctx, analyser };
      } catch {
        // Analysis isn't available (e.g. already attached elsewhere) - the
        // bars just stay idle, playback itself is unaffected either way.
        audio._vizGraph = null;
      }
    }

    const graph = audio._vizGraph;
    if (!graph) return undefined;
    if (graph.ctx.state === 'suspended') graph.ctx.resume();

    const data = new Uint8Array(graph.analyser.frequencyBinCount);
    const bucket = Math.max(1, Math.floor(data.length / BAR_COUNT));

    const loop = () => {
      graph.analyser.getByteFrequencyData(data);
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
  }, [isPlaying, audioRef]);

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
  const audioRef = useRef(null);
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMini,
    togglePlay,
    setPlaying,
    setCurrentTime,
    setDuration,
    seek,
    toggleMini,
    next,
    prev,
    playlist,
    playlistIndex,
    playAt,
    reorderQueue,
  } = usePlayerStore();

  const [isFullscreen, setFullscreen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  // While the user is actively dragging the seek thumb, show their drag position
  // instead of fighting it with the audio's real (laggier) currentTime updates.
  const [seekPreview, setSeekPreview] = useState(null);

  // Free-roam position for the mini (vinyl+cover) widget, like an AssistiveTouch bubble.
  const [pos, setPos] = useState(null); // null = default bottom-left slot
  const dragState = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return undefined;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      if (playlistIndex < playlist.length - 1) next();
      else setPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentSong, setCurrentTime, setDuration, setPlaying, next, playlist.length, playlistIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src = currentSong.audioSrc;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
  }, [currentSong?.slug, currentSong, setCurrentTime, setDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (isPlaying) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [isPlaying, currentSong, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const seekBy = (deltaSeconds) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const nextTime = Math.min(Math.max(audio.currentTime + deltaSeconds, 0), duration);
    audio.currentTime = nextTime;
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
    const audio = audioRef.current;
    setSeekPreview(null);
    if (!audio || !duration) return;
    const nextTime = (value / 100) * duration;
    audio.currentTime = nextTime;
    seek(nextTime);
  };

  const canPrev = playlistIndex > 0 || currentTime > 3;
  const waveformBars = useWaveform(currentSong?.audioSrc);
  const canNext = playlistIndex >= 0 && playlistIndex < playlist.length - 1;

  if (!currentSong) return null;

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
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />

      <AnimatePresence mode="popLayout">
        {isMini ? (
          <motion.div
            key="mini"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            style={pos ? { left: pos.x, top: pos.y } : { left: 12, bottom: '6%' }}
            className="fixed z-50 cursor-grab touch-none select-none active:cursor-grabbing"
          >
            <div
              className="relative rounded-full shadow-[0.15em_0.25em_0.9em_rgba(0,0,0,0.35)]"
              style={{ width: MINI_SIZE, height: MINI_SIZE }}
            >
              <VinylDisc labelId="mini" className="size-full" />
              <motion.img
                src={currentSong.coverSrc}
                alt=""
                draggable={false}
                className="absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover ring-2 ring-white/70"
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={
                  isPlaying
                    ? { repeat: Infinity, duration: 3, ease: 'linear' }
                    : { duration: 0.3 }
                }
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-[3%] bottom-[3%] z-50 flex h-[4.25rem] items-center gap-3 rounded-md border border-black/80 bg-white/40 px-3 shadow-[0.1em_0.2em_0.8em_rgba(0,0,0,0.25)] backdrop-blur-md sm:inset-x-[10%] sm:bottom-[6%]"
          >
            <button
              type="button"
              onClick={toggleMini}
              className="flex w-full max-w-[22em] shrink-0 items-center gap-2.5 overflow-hidden rounded-sm"
              aria-label="Minimize player"
            >
              <img src={currentSong.coverSrc} alt="" className="size-11 shrink-0 rounded-sm object-cover" onError={handleImageError} />
              <div className="min-w-0 flex-col text-left">
                <p className="truncate text-sm font-semibold text-black">{currentSong.songTitle}</p>
                <p className="truncate text-xs text-black/60">{currentSong.artistName}</p>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={prev}
                disabled={!canPrev}
                aria-label="Previous track"
                className="grid size-8 place-items-center text-black disabled:opacity-30"
              >
                <SkipBack className="size-4 fill-current" />
              </button>
              <PlayButton />
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                aria-label="Next track"
                className="grid size-8 place-items-center text-black disabled:opacity-30"
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

            {/* Queue toggle - opens the same drag-reorderable "up next" panel
                as full-screen mode, right where the bass-reactive bars used
                to sit. */}
            <div className="relative hidden shrink-0 sm:block">
              <button
                type="button"
                onClick={() => setQueueOpen((v) => !v)}
                aria-label="Toggle queue"
                className={cn('transition-colors', queueOpen ? 'text-black' : 'text-black/50 hover:text-black')}
              >
                <ListMusic className="size-4" />
              </button>

              <AnimatePresence>
                {queueOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    style={{ transformOrigin: 'bottom right' }}
                    className="absolute bottom-[calc(100%+0.75rem)] right-0 w-80"
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
              className="hidden shrink-0 text-black/60 transition-colors hover:text-black sm:block"
            >
              <Expand className="size-4" />
            </button>

            <img src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-J.png" alt="Juowle" className="hidden h-8 w-auto shrink-0 opacity-80 lg:block" onError={handleImageError} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen focus mode: reimplements the original (disabled/commented)
          full-screen player — big backdrop from the song cover, large controls. */}
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-end gap-6 bg-black px-6 pb-16 pt-24 text-white"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0), rgba(0,0,0,0.85) 80%), url(${currentSong.coverSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Exit full screen"
            className="absolute right-6 top-6 text-white/80 hover:text-white"
          >
            <Shrink className="size-6" />
          </button>

          <button
            type="button"
            onClick={() => setQueueOpen((v) => !v)}
            aria-label="Toggle queue"
            className={cn('absolute right-16 top-6 transition-colors', queueOpen ? 'text-juow-accent' : 'text-white/80 hover:text-white')}
          >
            <ListMusic className="size-6" />
          </button>

          <div className="text-center">
            <p className="font-[family-name:var(--font-anton)] text-3xl">{currentSong.songTitle}</p>
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
          <Visualizer audioRef={audioRef} isPlaying={isPlaying} />

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
    </>
  );
}
