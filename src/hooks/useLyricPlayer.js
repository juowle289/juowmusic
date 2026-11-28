import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { playableTracks, tracksBySlug } from '@/data/playableTracks';

const DEFAULT_VINYL = 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/vinylMusicDisk.jpg';

/** Loads the current lyric page song into the global player store. */
export default function useLyricPlayer(song) {
  const playSong = usePlayerStore((state) => state.playSong);
  const setPlaylist = usePlayerStore((state) => state.setPlaylist);

  useEffect(() => {
    if (!song?.audioSrc) return;

    const track = tracksBySlug[song.slug] ?? {
      slug: song.slug,
      songTitle: song.songTitle,
      artistName: song.artistName,
      coverSrc: song.coverSrc,
      audioSrc: song.audioSrc,
      vinylDiskSrc: DEFAULT_VINYL,
    };

    // A song from the static catalogue gets the full browsable queue. One
    // that isn't in it (e.g. created in the admin) becomes its own one-track
    // queue instead: `setPlaylist` falls back to index 0 when the slug isn't
    // found in the given list, which used to silently land on whatever
    // track happened to be first in `playableTracks` - so the queue panel's
    // "Now playing" row showed a different song than what was actually
    // playing.
    const isStaticTrack = Boolean(tracksBySlug[song.slug]);
    setPlaylist(isStaticTrack ? playableTracks : [track], song.slug);
    playSong(track, false);
  }, [song, playSong, setPlaylist]);
}
