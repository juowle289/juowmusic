import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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
// and data survives a reload. `persistentMultipleTabManager` lets that
// cache be shared safely across multiple open tabs instead of only the
// first tab getting it.
//
// IndexedDB persistence isn't available everywhere (private browsing in
// some browsers, very old browsers, some in-app webviews) - in those
// cases `initializeFirestore` throws *synchronously*, which would have
// taken down every page that imports this module (PartyPage, the party
// bubbles, listening history) for exactly the visitors on those browsers,
// with no visible error. Falling back to a plain in-memory Firestore
// client keeps the app working there too, just without the offline cache.
function createFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    console.warn('[juowmusic] Firestore offline persistence unavailable, falling back to in-memory cache:', error);
    return getFirestore(app);
  }
}

export const db = createFirestore();
