import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebaseFirestore';
import { HISTORY_LIMIT } from '@/utils/listeningHistory';

/**
 * Real-time view of a user's listening history, sourced from Firestore
 * (`users/{uid}/listeningEvents`) instead of localStorage - the same data
 * shows up whether they're on their phone or a brand new laptop, since it's
 * tied to the account rather than one browser's storage.
 *
 * `onSnapshot` (rather than a one-off `getDocs`) also means: if the person
 * has the app open on two tabs/devices at once, a play recorded on one
 * shows up on the other without a refresh, and Firestore's offline cache
 * (see firebaseFirestore.js) serves the last-known history instantly even
 * before the network round-trip completes.
 */
export default function useListeningHistory(uid) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    if (!uid) {
      setHistory([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(
      collection(db, 'users', uid, 'listeningEvents'),
      orderBy('timestamp', 'desc'),
      limit(HISTORY_LIMIT),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        // Reversed back to chronological order (oldest -> newest) so
        // downstream code (streak walking, day-bucketing) can keep the
        // same assumptions it had when this came from localStorage.
        const entries = snap.docs.map((d) => d.data()).reverse();
        setHistory(entries);
        setLoading(false);
      },
      (error) => {
        console.error('[juowmusic] Failed to load listening history:', error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { history, loading };
}
