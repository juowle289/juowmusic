import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import app from '@/firebase';

// Kept out of firebase.js on purpose: firebase.js is imported app-wide (via
// AuthContext, which every page needs), while Firestore is only used by the
// Listening Party feature and (now) real listening-history sync. Importing
// it there would pull the whole Firestore SDK into the main bundle for
// every visitor, even ones who never touch either - keeping it in its own
// module means it only ships as part of the already-lazy-loaded chunks that
// actually need it (PartyPage, ProfilePage, useListeningTracker).
//
// `persistentLocalCache` turns on Firestore's own IndexedDB-backed offline
// cache: reads/writes work instantly offline and sync once back online,
// and data survives a reload - this is what makes moving listening
// history off ad-hoc localStorage onto Firestore an upgrade rather than a
// regression for perceived speed. `persistentMultipleTabManager` lets that
// cache be shared safely across multiple open tabs of the app instead of
// only the first tab getting it.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
