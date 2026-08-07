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

    setPlaylist(playableTracks, song.slug);

    playSong(
      tracksBySlug[song.slug] ?? {
        slug: song.slug,
        songTitle: song.songTitle,
        artistName: song.artistName,
        coverSrc: song.coverSrc,
        audioSrc: song.audioSrc,
        vinylDiskSrc: DEFAULT_VINYL,
      },
      false,
    );
  }, [song, playSong, setPlaylist]);
}
