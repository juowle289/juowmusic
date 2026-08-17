import { useEffect, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebaseFirestore';

// Which activity types show up masked behind the reauth gate on the
// Activity Log tab (see ActivityLogPanel in ProfilePage.jsx). Comment
// posts/deletes/reports are fine to show plainly - only actual account
// info changes (email/password/username) are treated as sensitive here.
export const SENSITIVE_ACTIVITY_TYPES = new Set(['profile_update']);

/**
 * One doc per notable account action - comment posted/deleted, a report
 * filed, or account info changed (see calls in Comments.jsx and
 * ProfilePage.jsx). Lives under `users/{uid}/activityLog`, readable only
 * by that same uid (see Firestore rules) - this is what backs the
 * "Activity Log" settings tab.
 */
export function logActivity(uid, { type, detail = null }) {
  if (!uid || !type) return;
  addDoc(collection(db, 'users', uid, 'activityLog'), {
    type,
    detail,
    sensitive: SENSITIVE_ACTIVITY_TYPES.has(type),
    timestamp: Date.now(),
    createdAt: new Date(),
  }).catch((error) => {
    console.error('[juowmusic] Failed to log activity:', error);
  });
}

const LOG_LIMIT = 200;

/** Real-time view of a user's own activity log, newest first. */
export default function useActivityLog(uid) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(collection(db, 'users', uid, 'activityLog'), orderBy('timestamp', 'desc'), limit(LOG_LIMIT));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('[juowmusic] Failed to load activity log:', error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { entries, loading };
}
