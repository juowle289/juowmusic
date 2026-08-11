import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseFirestore';

// How many events buildRealStats (ProfilePage) ever needs to look at - caps
// the read/subscription instead of pulling someone's entire multi-year
// history on every load. Matches the old localStorage MAX_ENTRIES ceiling.
export const HISTORY_LIMIT = 4000;

function eventsCollection(uid) {
  return collection(db, 'users', uid, 'listeningEvents');
}

/**
 * One doc per song actually started - logged once real playback of that
 * song has run a few seconds (see useListeningTracker's PLAY_THRESHOLD),
 * not on every press of the play button. This is what "total plays",
 * "top songs", the listening streak, and "time of day" are all built from.
 *
 * Lives in Firestore under `users/{uid}/listeningEvents`, not
 * localStorage - so history is tied to the account, not the browser: it
 * survives a new device or a cleared cache instead of quietly evaporating.
 * Firestore's own offline cache (see firebaseFirestore.js) means this still
 * works instantly while offline and syncs once back online.
 */
export function recordPlayStart(uid, { slug, artistName }) {
  if (!uid || !slug) return;
  addDoc(eventsCollection(uid), {
    type: 'play',
    slug,
    artistName: artistName ?? null,
    timestamp: Date.now(),
    createdAt: serverTimestamp(),
  }).catch((error) => {
    console.error('[juowmusic] Failed to record play start:', error);
  });
}

/**
 * Periodic chunks of real elapsed playback time - driven by the actual
 * <audio> element's timeupdate progress (via usePlayerStore's currentTime),
 * not a wall clock, so paused/backgrounded time and seeking don't count.
 * Summed for "total minutes listened" and the per-day chart.
 */
export function recordListenChunk(uid, { slug, seconds }) {
  if (!uid || !slug || !(seconds > 0)) return;
  addDoc(eventsCollection(uid), {
    type: 'listen',
    slug,
    seconds,
    timestamp: Date.now(),
    createdAt: serverTimestamp(),
  }).catch((error) => {
    console.error('[juowmusic] Failed to record listen chunk:', error);
  });
}
