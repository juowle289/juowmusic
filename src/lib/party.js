import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseFirestore';

const HOST_FLAG_PREFIX = 'juowmusic-party-host-';

/** Marks the current browser as the host of a given party, so PartyPage can
 * tell "am I the host" apart from "I just have the link" across reloads,
 * without requiring the person to be logged in. */
function markAsHost(partyId) {
  try {
    localStorage.setItem(HOST_FLAG_PREFIX + partyId, '1');
  } catch {
    // Private browsing / storage disabled - the room still works, this
    // browser just won't be recognized as host after a refresh.
  }
}

export function isHostOfParty(partyId) {
  try {
    return localStorage.getItem(HOST_FLAG_PREFIX + partyId) === '1';
  } catch {
    return false;
  }
}

/**
 * Creates a new Listening Party room seeded with whatever's currently
 * playing, and returns its ID (used to build the `/party/:id` share link).
 */
export async function createParty({ song, isPlaying, position, hostName, hostUid }) {
  const docRef = await addDoc(collection(db, 'parties'), {
    hostUid: hostUid ?? null,
    hostName: hostName || 'Host',
    song: song
      ? {
          slug: song.slug,
          songTitle: song.songTitle,
          artistName: song.artistName,
          coverSrc: song.coverSrc,
          audioSrc: song.audioSrc,
        }
      : null,
    isPlaying: !!isPlaying,
    position: position || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  markAsHost(docRef.id);
  return docRef.id;
}
