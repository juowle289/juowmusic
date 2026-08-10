import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/firebaseFirestore';
import { usePlayerStore } from '@/stores/usePlayerStore';

const HEARTBEAT_MS = 4000;
// How far local playback is allowed to drift from the host's reported
// position before it gets forcibly corrected. Small drift is normal (network
// jitter, timer granularity) and constantly re-seeking for a few hundred ms
// of difference would itself be more distracting than the drift is.
const DRIFT_TOLERANCE_SECONDS = 1.5;

/**
 * Keeps a Listening Party room's Firestore doc and chat messages in sync
 * with the local player.
 *
 * - Host: pushes local play/pause/track-change/position to Firestore
 *   (immediately on meaningful changes, plus a periodic heartbeat so
 *   latecomers and drift correction both work).
 * - Guest: the reverse - watches the Firestore doc and drives the local
 *   `usePlayerStore` (via `requestSeek`, which also switches tracks) to
 *   match, correcting for the network/processing delay between when the
 *   host's update was written and when it's read by computing elapsed time
 *   against the write's server timestamp.
 */
export function usePartySync(partyId, role, displayName) {
  const [party, setParty] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!partyId) return undefined;
    const partyRef = doc(db, 'parties', partyId);
    const unsubParty = onSnapshot(
      partyRef,
      (snap) => setParty(snap.exists() ? snap.data() : null),
      () => setParty(null),
    );

    const messagesQuery = query(collection(db, 'parties', partyId, 'messages'), orderBy('createdAt', 'asc'), limit(200));
    const unsubMessages = onSnapshot(messagesQuery, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubParty();
      unsubMessages();
    };
  }, [partyId]);

  // --- Guest: follow the host ---------------------------------------------
  useEffect(() => {
    if (role !== 'guest' || !party?.song) return;
    const store = usePlayerStore.getState();

    const elapsed = party.isPlaying && party.updatedAt ? (Date.now() - party.updatedAt.toMillis()) / 1000 : 0;
    const targetPosition = Math.max(0, (party.position ?? 0) + elapsed);

    if (store.currentSong?.slug !== party.song.slug) {
      store.requestSeek(targetPosition, party.song);
      store.setPlaying(party.isPlaying);
      return;
    }

    if (party.isPlaying !== store.isPlaying) {
      store.setPlaying(party.isPlaying);
    }

    if (Math.abs(store.currentTime - targetPosition) > DRIFT_TOLERANCE_SECONDS) {
      store.requestSeek(targetPosition);
    }
  }, [party, role]);

  // --- Host: broadcast local state ----------------------------------------
  useEffect(() => {
    if (role !== 'host' || !partyId) return undefined;
    const partyRef = doc(db, 'parties', partyId);

    const push = () => {
      const s = usePlayerStore.getState();
      if (!s.currentSong) return;
      setDoc(
        partyRef,
        {
          song: {
            slug: s.currentSong.slug,
            songTitle: s.currentSong.songTitle,
            artistName: s.currentSong.artistName,
            coverSrc: s.currentSong.coverSrc,
            audioSrc: s.currentSong.audioSrc,
          },
          isPlaying: s.isPlaying,
          position: s.currentTime,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    };

    push();
    const unsubscribeStore = usePlayerStore.subscribe((state, prevState) => {
      if (state.currentSong?.slug !== prevState.currentSong?.slug || state.isPlaying !== prevState.isPlaying) {
        push();
      }
    });
    const heartbeat = setInterval(push, HEARTBEAT_MS);
    return () => {
      unsubscribeStore();
      clearInterval(heartbeat);
    };
  }, [role, partyId]);

  const lastSendRef = useRef(0);
  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!partyId || !trimmed) return;
    // A light rate-limit so an accidental key-repeat or paste-spam doesn't
    // flood the room - real abuse handling belongs in Firestore rules, this
    // is just a basic UX guard.
    const now = Date.now();
    if (now - lastSendRef.current < 400) return;
    lastSendRef.current = now;
    await addDoc(collection(db, 'parties', partyId, 'messages'), {
      name: displayName || 'Guest',
      text: trimmed.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  };

  return { party, messages, sendMessage };
}
