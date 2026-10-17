import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Thin, generic CRUD wrapper around a Firestore collection - used by the
 * admin Songs and Artists screens. Deliberately generic (no per-field
 * validation/shape baked in here) so both screens share the same read/write
 * path; each screen's form owns its own field list.
 *
 * NOTE for whoever picks this up next: this is a *separate* data store from
 * the static files the public site actually reads (src/data/songs.js,
 * src/data/playableTracks.js, src/data/artists/*.json, src/data/lyrics/*.json).
 * Saving a song/artist here does NOT yet change what visitors see - that
 * needs a follow-up pass to point the public pages at Firestore too (or an
 * export/build step that regenerates those static files from here). Treat
 * this as the content-management layer; wiring it into the live site is the
 * next milestone.
 */
export function makeAdminCollection(name) {
  const col = collection(db, name);

  return {
    /** All documents, newest-updated first. */
    async list() {
      const snap = await getDocs(query(col, orderBy('updatedAt', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async get(id) {
      const snap = await getDoc(doc(db, name, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    /** Creates a new doc. If `id` is given (e.g. a slug) it's used as the
     * document id so the record is reachable/predictable by slug; otherwise
     * Firestore auto-generates one. */
    async create(data, id) {
      const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (id) {
        await setDoc(doc(db, name, id), payload);
        return id;
      }
      const ref = await addDoc(col, payload);
      return ref.id;
    },

    async update(id, data) {
      await updateDoc(doc(db, name, id), { ...data, updatedAt: serverTimestamp() });
    },

    async remove(id) {
      await deleteDoc(doc(db, name, id));
    },
  };
}

export const songsAdmin = makeAdminCollection('songs');
export const artistsAdmin = makeAdminCollection('artists');
