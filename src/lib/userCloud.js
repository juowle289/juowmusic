import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

/** Reads one array field (e.g. `followedArtists`) off the account's
 * `users/{uid}` doc. null = nothing stored there yet (or offline/denied). */
export async function pullUserField(uid, field) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const value = snap.exists() ? snap.data()[field] : undefined;
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Fire-and-forget write of one field onto `users/{uid}` (merge). Follows and
 * likes stay instant from localStorage; this just makes them follow the
 * account across browsers and devices. */
export function pushUserField(uid, field, value) {
  setDoc(doc(db, 'users', uid), { [field]: value }, { merge: true }).catch(() => {
    // Offline / rules not published - the local copy still works.
  });
}
