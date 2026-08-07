import { create } from 'zustand';
import { playableTracks, tracksBySlug } from '@/data/playableTracks';

const LAST_PLAYED_KEY = 'juowmusic-last-played';

function saveLastPlayed(slug) {
  try {
    localStorage.setItem(LAST_PLAYED_KEY, slug);
  } catch {
    // localStorage can be unavailable (private mode, etc.) - not worth crashing over.
  }
}

/** Reads back the last-played slug for the HomePage "Continue Listening" card. */
export function getLastPlayedSlug() {
  try {
    return localStorage.getItem(LAST_PLAYED_KEY);
  } catch {
    return null;
  }
}

/**
 * @typedef {Object} Song
 * @property {string} slug
 * @property {string} songTitle
 * @property {string} artistName
 * @property {string} coverSrc
 * @property {string} audioSrc
 * @property {string} [vinylDiskSrc]
 */

export const usePlayerStore = create((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMini: false,
  playlist: playableTracks,
  playlistIndex: -1,

  /** @param {Song} song @param {boolean} [autoplay] */
  playSong: (song, autoplay = true) => {
    const { currentSong, playlist } = get();
    const isSameTrack = currentSong?.slug === song.slug;
    const playlistIndex = playlist.findIndex((track) => track.slug === song.slug);

    saveLastPlayed(song.slug);
    set({
      currentSong: song,
      isPlaying: autoplay,
      currentTime: isSameTrack ? get().currentTime : 0,
      duration: isSameTrack ? get().duration : 0,
      playlistIndex: playlistIndex >= 0 ? playlistIndex : 0,
    });
  },

  setPlaylist: (tracks, startSlug) => {
    const playlistIndex = tracks.findIndex((track) => track.slug === startSlug);
    set({
      playlist: tracks,
      playlistIndex: playlistIndex >= 0 ? playlistIndex : 0,
    });
  },

  /** Jumps straight to a specific position in the current queue (used by the
   * drag-reorderable queue panel - clicking a track plays it immediately). */
  playAt: (index) => {
    const { playlist } = get();
    const song = playlist[index];
    if (!song) return;
    saveLastPlayed(song.slug);
    set({ playlistIndex: index, currentSong: song, currentTime: 0, duration: 0, isPlaying: true });
  },

  /** Moves a track from `fromIndex` to just before `insertBeforeIndex`, both
   * expressed as positions in the CURRENT (pre-move) queue - i.e. dropping
   * on the gap between track 2 and track 3 is `insertBeforeIndex: 3`,
   * regardless of which direction the dragged track is coming from. */
  reorderQueue: (fromIndex, insertBeforeIndex) => {
    const { playlist, currentSong } = get();
    if (fromIndex < 0 || insertBeforeIndex < 0) return;
    if (fromIndex === insertBeforeIndex || fromIndex + 1 === insertBeforeIndex) return; // dropped back in place

    const next = playlist.slice();
    const [moved] = next.splice(fromIndex, 1);
    // Removing `fromIndex` shifts everything after it back by one, so the
    // target position needs the same adjustment before inserting.
    const target = insertBeforeIndex > fromIndex ? insertBeforeIndex - 1 : insertBeforeIndex;
    next.splice(target, 0, moved);

    const playlistIndex = currentSong ? next.findIndex((t) => t.slug === currentSong.slug) : -1;
    set({ playlist: next, playlistIndex });
  },

  next: () => {
    const { playlist, playlistIndex } = get();
    if (playlistIndex < 0 || playlistIndex >= playlist.length - 1) return;

    const nextIndex = playlistIndex + 1;
    const nextSong = playlist[nextIndex];
    saveLastPlayed(nextSong.slug);
    set({
      playlistIndex: nextIndex,
      currentSong: nextSong,
      currentTime: 0,
      duration: 0,
      isPlaying: true,
    });
  },

  prev: () => {
    const { playlist, playlistIndex, currentTime } = get();

    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    if (playlistIndex <= 0) return;

    const prevIndex = playlistIndex - 1;
    const prevSong = playlist[prevIndex];
    saveLastPlayed(prevSong.slug);
    set({
      playlistIndex: prevIndex,
      currentSong: prevSong,
      currentTime: 0,
      duration: 0,
      isPlaying: true,
    });
  },

  playBySlug: (slug, autoplay = true) => {
    const track = tracksBySlug[slug];
    if (track) get().playSong(track, autoplay);
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  pause: () => set({ isPlaying: false }),

  setPlaying: (isPlaying) => set({ isPlaying }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setDuration: (duration) => set({ duration }),

  seek: (currentTime) => set({ currentTime }),

  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),

  toggleMini: () => set((state) => ({ isMini: !state.isMini })),

  clear: () =>
    set({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playlistIndex: -1,
    }),
}));

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
