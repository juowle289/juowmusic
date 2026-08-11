// Dev-only helper - NOT imported anywhere in the app, NOT part of the
// production bundle. Run it manually to check whether the "Listening
// Party" bubble rail on the lyrics page (see PartyBubbles.jsx) renders
// correctly, without needing a second real person to actually open a
// party at the same time.
//
// Usage (from the project root, with `firebase` already installed):
//   node scripts/seed-mock-parties.js
//
// It creates 3 fake `parties` docs with isPlaying: true, then keeps
// re-touching their `updatedAt` every 4s (mimicking usePartySync's real
// heartbeat) so they stay inside useActiveParties' 30s "still live"
// window for as long as this script keeps running. Press Ctrl+C to stop -
// once nothing refreshes `updatedAt` for 30s, the bubbles disappear on
// their own, same as a real party whose host closed the tab.
//
// Needs Firestore rules that allow open writes to `parties` (already the
// case per the rules you shared - `allow create, update: if true`).
// These are throwaway docs (no real audioSrc) - fine to delete anytime
// from the Firebase console, or just let them fall out of the "live"
// window once you stop the script.

import { initializeApp } from 'firebase/app';
import { addDoc, collection, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

// Same config as src/firebase.js - duplicated here because this script
// runs standalone under plain Node, outside Vite's `@/` alias resolution.
const firebaseConfig = {
  apiKey: 'AIzaSyCvdpH41WmqRCeAri0CU6XXRecDIhbDlBk',
  authDomain: 'juowmusic.firebaseapp.com',
  projectId: 'juowmusic',
  storageBucket: 'juowmusic.firebasestorage.app',
  messagingSenderId: '466598925021',
  appId: '1:466598925021:web:ee0ede41f74255ee5f0134',
  measurementId: 'G-7Y82G30JPL',
};

const HEARTBEAT_MS = 4000;

// Placeholder art (picsum.photos) - fine for checking bubble rendering;
// these aren't real playable tracks, so actually opening one of these
// party rooms won't have real audio.
const MOCK_PARTIES = [
  {
    hostName: 'Thảo',
    song: { slug: 'mock-1', songTitle: 'Sunset Drive', artistName: 'Mock Artist', coverSrc: 'https://picsum.photos/seed/juow1/300', audioSrc: '' },
  },
  {
    hostName: 'Minh Khang',
    song: { slug: 'mock-2', songTitle: 'Neon Rain', artistName: 'Mock Artist', coverSrc: 'https://picsum.photos/seed/juow2/300', audioSrc: '' },
  },
  {
    hostName: 'Julia',
    song: { slug: 'mock-3', songTitle: 'Paper Moon', artistName: 'Mock Artist', coverSrc: 'https://picsum.photos/seed/juow3/300', audioSrc: '' },
  },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const refs = [];
  for (const party of MOCK_PARTIES) {
    const docRef = await addDoc(collection(db, 'parties'), {
      hostUid: null,
      hostName: party.hostName,
      song: party.song,
      isPlaying: true,
      position: 12,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    refs.push(docRef);
    console.log(`Created mock party "${party.song.songTitle}" (host: ${party.hostName}) -> ${docRef.id}`);
  }

  console.log(`\n${refs.length} mock parties are live. Open the app and check the lyrics page aside.`);
  console.log('Keeping them "live" with a heartbeat - press Ctrl+C to stop (they\'ll disappear ~30s after that).\n');

  const heartbeat = setInterval(() => {
    for (const ref of refs) {
      setDoc(doc(db, 'parties', ref.id), { updatedAt: serverTimestamp() }, { merge: true }).catch((error) => {
        console.error('Heartbeat failed for', ref.id, error.message);
      });
    }
  }, HEARTBEAT_MS);

  process.on('SIGINT', () => {
    clearInterval(heartbeat);
    console.log('\nStopped. Mock parties will fall out of the "live" window shortly.');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to seed mock parties:', error);
  process.exit(1);
});
