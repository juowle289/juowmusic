import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebaseFirestore';

// A party whose host hasn't pushed an update (see usePartySync's
// heartbeat, every 4s) in this long is treated as stale/abandoned - the
// host likely closed the tab without anyone ever calling it "over".
const ACTIVE_WINDOW_MS = 30_000;
// How many of the most-recently-updated rooms to even look at. Filtering
// happens client-side (see below) so this stays a plain single-field
// `orderBy`, which needs no composite Firestore index to deploy.
const CANDIDATE_LIMIT = 24;
// How often "is this room still fresh?" is re-evaluated. Firestore only
// delivers a snapshot when data *changes* - and once a host has left,
// nothing changes any more - so staleness has to be re-checked on a clock,
// otherwise the last-seen bubble would sit there forever.
const RECHECK_MS = 5_000;

/**
 * Real-time list of Listening Party rooms that are actually live right now
 * (playing + recently heard from + not explicitly ended by the host), newest
 * activity first. Backs the "join a party" rail on the lyrics page.
 */
export default function useActiveParties() {
  const [docs, setDocs] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const q = query(collection(db, 'parties'), orderBy('updatedAt', 'desc'), limit(CANDIDATE_LIMIT));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setNow(Date.now());
      },
      (error) => {
        // Silently empty is indistinguishable from "nobody's listening" -
        // logging here at least makes a permission-denied (e.g. Firestore
        // rules not allowing signed-out visitors to read `parties`) show
        // up as something debuggable instead of just "no bubbles".
        console.error('[juowmusic] Failed to load active parties:', error);
        setDocs([]);
      },
    );

    const clock = setInterval(() => setNow(Date.now()), RECHECK_MS);

    return () => {
      unsubscribe();
      clearInterval(clock);
    };
  }, []);

  return useMemo(
    () =>
      docs.filter(
        (p) =>
          !p.ended &&
          p.isPlaying &&
          p.song &&
          p.updatedAt &&
          now - p.updatedAt.toMillis() < ACTIVE_WINDOW_MS,
      ),
    [docs, now],
  );
}
