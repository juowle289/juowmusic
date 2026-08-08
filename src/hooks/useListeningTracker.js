import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/context/AuthContext';
import { recordListenChunk, recordPlayStart } from '@/utils/listeningHistory';

// Ignore deltas bigger than this - a seek, a loop back to 0, or the
// currentTime reset that happens when the song changes, none of which is
// "real" forward listening.
const MAX_JUMP_SECONDS = 3;
// Don't count a play until real playback has actually run this long -
// filters out accidental taps and instant skips.
const PLAY_THRESHOLD_SECONDS = 4;
// How much accumulated real playback time to batch before writing a
// "listen" chunk to storage, instead of writing on every tick.
const CHUNK_FLUSH_SECONDS = 10;

function flushChunk(uid, session) {
  if (uid && session?.slug && session.accumulated > 0) {
    recordListenChunk(uid, { slug: session.slug, seconds: session.accumulated });
    session.accumulated = 0;
  }
}

/**
 * Mounted once at the app root (AppLayout) - turns the audio element's real
 * playback progress (usePlayerStore's currentTime, driven by the <audio>
 * tag's own timeupdate events) into the listening history that
 * ProfilePage's stats and ListeningWeather are built from. No fake/seeded
 * data: if nothing has actually been played, there's no history.
 */
export default function useListeningTracker() {
  const { user } = useAuth();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const uid = user?.uid ?? null;

  const sessionRef = useRef({ slug: null, artistName: null, lastTime: 0, accumulated: 0, playLogged: false });

  useEffect(() => {
    const session = sessionRef.current;
    if (!currentSong) return;

    if (session.slug !== currentSong.slug) {
      flushChunk(uid, session);
      sessionRef.current = {
        slug: currentSong.slug,
        artistName: currentSong.artistName,
        lastTime: currentTime,
        accumulated: 0,
        playLogged: false,
      };
      return;
    }

    const delta = currentTime - session.lastTime;
    session.lastTime = currentTime;
    if (delta <= 0 || delta >= MAX_JUMP_SECONDS) return; // paused, seeked, or just switched songs

    session.accumulated += delta;

    if (!session.playLogged && session.accumulated >= PLAY_THRESHOLD_SECONDS) {
      recordPlayStart(uid, { slug: session.slug, artistName: session.artistName });
      session.playLogged = true;
    }
    if (session.accumulated >= CHUNK_FLUSH_SECONDS) {
      flushChunk(uid, session);
    }
  }, [currentTime, currentSong, uid]);

  // Don't lose an in-progress chunk if the tab closes or the person logs out.
  useEffect(() => {
    const onUnload = () => flushChunk(uid, sessionRef.current);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      flushChunk(uid, sessionRef.current);
    };
  }, [uid]);
}
