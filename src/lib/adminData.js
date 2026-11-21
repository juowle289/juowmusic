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
 * NOTE for whoever picks this up next: the original, hand-written songs
 * still live in static files (src/data/songs.js, src/data/playableTracks.js,
 * src/data/artists/*.json, src/data/lyrics/*.json) and are untouched by this.
 * Anything saved here (Firestore) is merged in on top for search and for
 * /lyrics/:slug and /artist/:slug - see src/lib/publicSongsCache.js and
 * publicArtistsCache.js - but it does NOT appear in the static Home/Explore
 * grids, which still only show the hand-written songs.
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
     * Firestore auto-generates one. Throws if a doc with that id already
     * exists, rather than silently overwriting it - `setDoc` alone has no
     * such guard, and a slug collision would otherwise quietly replace
     * someone else's song/artist. */
    async create(data, id) {
      const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (id) {
        const ref = doc(db, name, id);
        const existing = await getDoc(ref);
        if (existing.exists()) {
          throw new Error(`"${id}" already exists - pick a different slug.`);
        }
        await setDoc(ref, payload);
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
