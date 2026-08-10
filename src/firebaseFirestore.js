import { getFirestore } from 'firebase/firestore';
import app from '@/firebase';

// Kept out of firebase.js on purpose: firebase.js is imported app-wide (via
// AuthContext, which every page needs), while Firestore is only used by the
// Listening Party feature. Importing it there would pull the whole
// Firestore SDK into the main bundle for every visitor, even ones who never
// touch a party - keeping it in its own module means it only ships as part
// of PartyPage's already-lazy-loaded chunk.
export const db = getFirestore(app);
