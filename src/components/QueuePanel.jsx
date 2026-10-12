import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleImageError } from '@/lib/imageFallback';

/**
 * The drag-reorderable "up next" queue. Dragging a track over the list shows
 * a thin gold line in the exact gap it would land in if dropped right now -
 * above or below the row the cursor is currently over, based on which half
 * of that row the cursor is in - so the drop target is never ambiguous.
 */
export default function QueuePanel({ playlist, playlistIndex, isPlaying, playAt, reorderQueue, className }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dropAt, setDropAt] = useState(null); // "insert before this index" in the current list

  const handleDrop = () => {
    if (dragIndex !== null && dropAt !== null) reorderQueue(dragIndex, dropAt);
    setDragIndex(null);
    setDropAt(null);
  };

  // Split into current and next (max 10 next tracks)
  const currentTrack = playlistIndex >= 0 && playlistIndex < playlist.length ? playlist[playlistIndex] : null;
  const nextTracks = playlistIndex >= 0 
    ? playlist.slice(playlistIndex + 1, Math.min(playlistIndex + 11, playlist.length))
    : [];
  const hasMore = playlistIndex >= 0 && playlist.length > playlistIndex + 11;

  const renderTrackItem = (track, index, isCurrentTrack = false) => (
    <li key={track.slug} className="relative">
      {dropAt === index && <div className="mx-4 h-0.5 rounded-full bg-juow-accent" />}
      <div
        draggable
        onDragStart={() => setDragIndex(index)}
        onDragOver={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const isLowerHalf = e.clientY - rect.top > rect.height / 2;
          setDropAt(isLowerHalf ? index + 1 : index);
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop();
        }}
        onDragEnd={() => {
          setDragIndex(null);
          setDropAt(null);
        }}
      >
        <button
          type="button"
          onClick={() => playAt(index)}
          className={cn(
            'flex w-full cursor-grab items-center gap-3 px-4 py-2.5 text-left transition-colors active:cursor-grabbing',
            isCurrentTrack ? 'bg-juow-accent/15' : 'hover:bg-white/5',
            dragIndex === index && 'opacity-40',
          )}
        >
          <GripVertical className="size-4 shrink-0 text-white/30" />
          <img src={track.coverSrc} alt="" className="size-9 shrink-0 rounded object-cover" onError={handleImageError} />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-sm', isCurrentTrack ? 'text-juow-accent' : 'text-white')}>
              {track.songTitle}
            </p>
            <p className="truncate text-xs text-white/50">{track.artistName}</p>
          </div>
          {isCurrentTrack && isPlaying && (
            <span className="flex shrink-0 items-end gap-[2px]" aria-hidden>
              {[0.4, 0.9, 0.6].map((h, i) => (
                <span key={i} className="w-[2px] animate-pulse rounded-full bg-juow-accent" style={{ height: `${h * 12}px` }} />
              ))}
            </span>
          )}
        </button>
      </div>
    </li>
  );

  return (
    <div className={cn('overflow-y-auto rounded-lg border border-white/15 bg-black/90 backdrop-blur-md', className)}>
      {/* Now Playing */}
      {currentTrack && (
        <>
          <p className="sticky top-0 border-b border-white/10 bg-black/90 px-4 py-2 text-xs uppercase tracking-widest text-juow-accent font-semibold">
            Đang phát
          </p>
          <ul onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropAt(null); }}>
            {renderTrackItem(currentTrack, playlistIndex, true)}
          </ul>
        </>
      )}

      {/* Next Up */}
      {nextTracks.length > 0 && (
        <>
          <p className="border-t border-white/10 border-b bg-black/90 px-4 py-2 text-xs uppercase tracking-widest text-white/50">
            Tiếp theo · kéo để sắp xếp
          </p>
          <ul onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropAt(null); }}>
            {nextTracks.map((track, idx) => renderTrackItem(track, playlistIndex + 1 + idx))}
            {dropAt === playlistIndex + 1 + nextTracks.length && <div className="mx-4 h-0.5 rounded-full bg-juow-accent" />}
          </ul>
          {hasMore && (
            <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-white/40">
              +{playlist.length - (playlistIndex + 11)} more
            </p>
          )}
        </>
      )}
    </div>
  );
}
