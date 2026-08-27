import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Pause, Play, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractLyricLines } from '@/lib/lyricLines';
import { formatTime } from '@/stores/usePlayerStore';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';

import afterHours from '@/data/lyrics/afterHours.json';
import ballroomExtravaganza from '@/data/lyrics/ballroomExtravaganza.json';
import blue from '@/data/lyrics/blue.json';
import chungTaCuaTuongLai from '@/data/lyrics/chungTaCuaTuongLai.json';
import hayTraoChoAnh from '@/data/lyrics/hayTraoChoAnh.json';
import nerves from '@/data/lyrics/nerves.json';
import oneOfTheGirls from '@/data/lyrics/oneOfTheGirls.json';
import theColorViolet from '@/data/lyrics/theColorViolet.json';

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

/**
 * Internal tool - not linked from the site nav, visited directly at
 * /tools/lyric-sync/:slug. Lets you tap out line timings by ear instead of
 * hand-typing 100+ timestamps per song: press Play, then hit Space (or tap
 * the button) the instant each line starts being sung. The current line
 * advances automatically after every tap. When done, copy the resulting
 * JSON array and paste it into that song's data file as `lineTimestamps`.
 */
export default function LyricSyncTool() {
  const { slug } = useParams();
  const song = SONGS[slug];
  useDocumentTitle(song ? `Juowle | Lyric Sync - ${song.songTitle}` : 'Juowle | Lyric Sync Tool');
  const lines = useMemo(() => extractLyricLines(song?.lyricHtml), [song]);

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // times[i] = recorded timestamp for lines[i], or undefined if not tapped yet.
  const [times, setTimes] = useState(() => Array(lines.length).fill(undefined));
  const [copied, setCopied] = useState(false);

  // Explicit (not purely derived) so clicking any line - tapped or not -
  // can jump the "next tap goes here" cursor there directly, for fixing a
  // mistake in the middle of the list without losing everything after it.
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const activeRowRef = useRef(null);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const tapLine = () => {
    if (activeIndex >= lines.length) return; // nothing left to tap
    const t = audioRef.current?.currentTime ?? 0;
    setTimes((prev) => {
      const next = prev.slice();
      next[activeIndex] = Math.round(t * 100) / 100;
      return next;
    });
    setActiveIndex((i) => Math.min(i + 1, lines.length - 1));
  };

  const undoLast = () => {
    setTimes((prev) => {
      const lastTapped = prev.reduce((acc, v, i) => (v !== undefined ? i : acc), -1);
      if (lastTapped === -1) return prev;
      const next = prev.slice();
      next[lastTapped] = undefined;
      return next;
    });
    setActiveIndex((i) => Math.max(0, i - 1));
  };

  const reset = () => {
    setTimes(Array(lines.length).fill(undefined));
    setActiveIndex(0);
  };

  /** Clicking any line (mistake mid-list, or wanting to skip ahead) jumps
   * the "next tap goes here" cursor to it directly - Space then re-records
   * just that one line, leaving every other tapped line untouched. If that
   * line already has a timestamp, also cues the audio a couple seconds
   * before it so you can listen right up to the line and retap it cleanly,
   * without having to manually scrub to roughly the right spot first. */
  const jumpToLine = (index) => {
    setActiveIndex(index);
    const existing = times[index];
    if (existing !== undefined && audioRef.current) {
      audioRef.current.currentTime = Math.max(0, existing - 2);
    }
  };

  // Space bar taps the current line, wherever focus is (except real inputs).
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        tapLine();
      } else if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undoLast();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const tappedCount = times.filter((t) => t !== undefined).length;
  const allDone = tappedCount === lines.length && lines.length > 0;
  const jsonOutput = JSON.stringify(times.map((t) => t ?? 0));

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (permissions, insecure context) - the
      // JSON is still right there in the textarea to select manually.
    }
  };

  if (!song) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Unknown song slug: {slug}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to={`/lyrics/${slug}`} className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="size-4" /> Back to {song.songTitle}
        </Link>

        <h1 className="font-[family-name:var(--font-anton)] text-3xl">Lyric Sync Tool</h1>
        <p className="mt-1 text-sm text-white/50">
          {song.songTitle} — {tappedCount}/{lines.length} lines tapped
        </p>

        <audio ref={audioRef} src={song.audioSrc} preload="metadata" />

        {/* Transport + big tap target */}
        <div className="mt-6 flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <button
            type="button"
            onClick={togglePlay}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs tabular-nums text-white/50">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-juow-accent"
                style={{ width: duration ? (currentTime / duration) * 100 + '%' : '0%' }}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={tapLine}
            disabled={allDone}
            className="h-12 shrink-0 bg-juow-accent px-6 text-black hover:bg-juow-accent/90 disabled:opacity-40"
          >
            Tap line (Space)
          </Button>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
          <button type="button" onClick={undoLast} className="inline-flex items-center gap-1 hover:text-white">
            <Undo2 className="size-3.5" /> Undo last (Ctrl/Cmd+Z)
          </button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 hover:text-white">
            <RotateCcw className="size-3.5" /> Reset all
          </button>
        </div>

        {/* Line list */}
        <div ref={listRef} className="mt-6 max-h-[45vh] overflow-y-auto rounded-lg border border-white/10">
          {lines.map((line, i) => {
            const tapped = times[i] !== undefined;
            const isActive = i === activeIndex && !allDone;
            return (
              <div
                key={i}
                ref={isActive ? activeRowRef : undefined}
                onClick={() => jumpToLine(i)}
                role="button"
                tabIndex={0}
                className={cn(
                  'flex cursor-pointer items-center gap-3 border-b border-white/5 px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-white/5',
                  isActive && 'bg-juow-accent/15',
                  tapped ? 'text-white/70' : 'text-white/40',
                )}
              >
                <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-white/40">
                  {tapped ? formatTime(times[i]) : '--:--'}
                </span>
                {tapped && <Check className="size-3.5 shrink-0 text-juow-accent" />}
                <span className="min-w-0 flex-1 truncate">{line.text}</span>
              </div>
            );
          })}
        </div>

        {/* Export */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-white/70">
              Export{allDone ? '' : ' (untapped lines default to 0)'}
            </p>
            <Button type="button" onClick={copyJson} variant="outline" className="h-8 gap-1.5 border-white/20 bg-transparent text-xs text-white hover:bg-white/10">
              <Copy className="size-3.5" /> {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
          </div>
          <textarea
            readOnly
            value={jsonOutput}
            rows={4}
            className="w-full rounded-md border border-white/10 bg-white/5 p-3 font-mono text-xs text-white/70"
          />
          <p className="mt-2 text-xs text-white/40">
            Paste this array into <code>src/data/lyrics/{slug}.json</code> as a new field: <code>&quot;lineTimestamps&quot;: [...]</code>.
            Index i is the time (seconds) that line i above starts.
          </p>
        </div>
      </div>
    </div>
  );
}
