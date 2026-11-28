import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { usePublicSongsStore } from '@/lib/publicSongsCache';
import { usePublicArtistsStore } from '@/lib/publicArtistsCache';

/** Writes one entry to the admin audit log - who did what, to which
 * song/artist, which fields changed, and when. Best-effort: a failed log
 * write never blocks or fails the actual create/update/delete it's recording. */
async function logAuditEvent(action, collectionName, docId, label, changed) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'adminAuditLog'), {
      action, // 'create' | 'update' | 'delete'
      collection: collectionName,
      docId,
      label: label || docId,
      changed: Array.isArray(changed) ? changed.slice(0, 30) : [],
      actorUid: user?.uid ?? null,
      actorEmail: user?.email ?? null,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Logging is a nice-to-have, never worth surfacing to the admin doing
    // the actual save/delete.
  }
}

/** Best-guess human label for a song/artist doc, for the audit log. */
function labelFor(data) {
  return data?.songTitle || data?.displayName || null;
}

/** The public site caches songs/artists once per session (search index,
 * "You may also like", similar artists...). After any admin write, reload
 * those caches in the background so the admin doesn't see stale results
 * when they hop over to the public site. */
function refreshPublicCaches() {
  rebuildPublicIndex()
    .catch(() => {
      // Best-effort: the save itself already succeeded.
    })
    .then(() => {
      usePublicSongsStore.getState().refresh();
      usePublicArtistsStore.getState().refresh();
    });
}

const isPublishedDoc = (data) => (data?.status ?? 'published') !== 'draft';

/**
 * Rebuilds `meta/publicIndex`: ONE small document holding just the fields the
 * public site needs for search, "You may also like", Similar Artists, Popular
 * Songs and the "New arrivals" shelf (published songs/artists only, no
 * lyrics). Visitors read this one doc instead of downloading every song
 * document - lyrics, Q&A and all - on every page load, and Firestore rules
 * can now keep the full collections (and therefore drafts) admin-only.
 * Called automatically after every admin write; also exposed as a manual
 * "Rebuild" button on the dashboard.
 */
export async function rebuildPublicIndex() {
  const [songSnap, artistSnap] = await Promise.all([
    getDocs(collection(db, 'songs')),
    getDocs(collection(db, 'artists')),
  ]);
  const songs = songSnap.docs
    .filter((d) => isPublishedDoc(d.data()))
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        t: x.songTitle || '',
        a: x.artistName || '',
        as: x.artistSlug || '',
        g: x.genre || '',
        c: x.coverSrc || '',
        v: typeof x.views === 'number' ? x.views : 0,
        r: x.releaseDate || '',
        u: toMillis(x.updatedAt) ?? 0,
        p: x.audioSrc ? 1 : 0,
      };
    });
  const artists = artistSnap.docs
    .filter((d) => isPublishedDoc(d.data()))
    .map((d) => {
      const x = d.data();
      return { id: d.id, n: x.displayName || '', g: x.genre || '', av: x.avatarImg || '', fl: x.countryFlag || '' };
    });
  await setDoc(doc(db, 'meta', 'publicIndex'), { songs, artists, updatedAt: serverTimestamp() });
  return { songs: songs.length, artists: artists.length };
}

// ---- Payload hygiene -------------------------------------------------------

// Fields that belong to Firestore/the server, never to the form. The old
// forms spread the whole loaded doc back into updateDoc(), which wrote a
// stray `id` field into every document and re-sent createdAt.
const SERVER_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

function deepClean(value) {
  if (typeof value === 'string') return value.replace(/\r\n?/g, '\n').trim();
  if (Array.isArray(value)) return value.map(deepClean);
  if (value && typeof value === 'object' && typeof value.toDate !== 'function') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = deepClean(v);
    }
    return out;
  }
  return value;
}

/** Trims every string, drops `undefined` (Firestore rejects it) and the
 * server-owned fields. */
export function cleanPayload(data) {
  const out = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (SERVER_FIELDS.has(k) || v === undefined) continue;
    out[k] = deepClean(v);
  }
  return out;
}

/** Drops repeater rows whose listed fields are all blank (an "Add question"
 * click that was never filled in used to be saved as an empty row). */
export function pruneRows(rows, keys) {
  return (rows ?? []).filter((row) => keys.some((k) => String(row?.[k] ?? '').trim() !== ''));
}

const norm = (v) => (v === undefined || v === '' ? null : v);
const sameValue = (a, b) => JSON.stringify(norm(a) ?? null) === JSON.stringify(norm(b) ?? null);

export function toMillis(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  const d = new Date(ts).getTime();
  return Number.isNaN(d) ? null : d;
}

/** Newest-updated first; docs without updatedAt sort last. Done client-side
 * so a legacy doc missing the field still shows up (Firestore's orderBy()
 * silently drops docs that lack the ordered field). */
function byUpdatedDesc(a, b) {
  return (toMillis(b.updatedAt) ?? 0) - (toMillis(a.updatedAt) ?? 0);
}

/**
 * Generic CRUD wrapper around a Firestore collection - used by the admin
 * Songs and Artists screens; each screen's form owns its own field list.
 *
 * NOTE: the original, hand-written songs/artists still live in static files
 * (src/data/...) and are untouched by this. Anything saved here is merged in
 * on top for search and for /lyrics/:slug and /artist/:slug - see
 * src/lib/publicSongsCache.js and publicArtistsCache.js.
 */
export function makeAdminCollection(name) {
  const col = collection(db, name);

  return {
    /** All documents, newest-updated first. */
    async list() {
      const snap = await getDocs(col);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byUpdatedDesc);
    },

    async get(id) {
      const snap = await getDoc(doc(db, name, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    async exists(id) {
      return (await getDoc(doc(db, name, id))).exists();
    },

    /** Creates a new doc. If `id` is given (e.g. a slug) it's used as the
     * document id so the record is reachable by slug. Throws if a doc with
     * that id already exists instead of silently overwriting it. */
    async create(data, id) {
      const payload = {
        ...cleanPayload(data),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      // Songs carry a live view counter; always start it at 0 so the
      // Firestore rule that only allows "+1" has a number to build on.
      if (name === 'songs') payload.views = 0;
      let newId;
      if (id) {
        const ref = doc(db, name, id);
        if ((await getDoc(ref)).exists()) {
          throw new Error(`"${id}" already exists - pick a different slug.`);
        }
        await setDoc(ref, payload);
        newId = id;
      } else {
        newId = (await addDoc(col, payload)).id;
      }
      logAuditEvent('create', name, newId, labelFor(data));
      refreshPublicCaches();
      return newId;
    },

    /**
     * Updates only the fields that actually changed. `views` is never
     * written from the admin (it's a live counter bumped by visitors - the
     * old form re-saved a stale copy and wiped out recent views).
     *
     * `options.baseUpdatedAt` (ms) enables an edit-conflict check: if
     * someone else saved this record after the form was opened, the save is
     * refused rather than silently overwriting their change.
     *
     * Resolves to `{ changed: string[] }` (empty = nothing to save).
     */
    async update(id, data, options = {}) {
      const ref = doc(db, name, id);
      const prevSnap = await getDoc(ref);
      if (!prevSnap.exists()) {
        throw new Error('This record no longer exists - it was probably deleted by someone else.');
      }
      const prev = prevSnap.data();

      if (options.baseUpdatedAt != null) {
        const current = toMillis(prev.updatedAt);
        if (current != null && current !== options.baseUpdatedAt) {
          throw new Error(
            'Someone else saved this record after you opened it. Reload the page to get their changes, then re-apply yours.',
          );
        }
      }

      const payload = cleanPayload(data);
      delete payload.views;
      const changed = Object.keys(payload).filter((k) => !sameValue(prev[k], payload[k]));
      if (changed.length === 0) return { changed: [] };

      const patch = {};
      changed.forEach((k) => {
        patch[k] = payload[k];
      });
      await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
      logAuditEvent('update', name, id, labelFor(payload) || labelFor(prev), changed);
      refreshPublicCaches();
      return { changed };
    },

    async remove(id) {
      const ref = doc(db, name, id);
      const existing = await getDoc(ref);
      await deleteDoc(ref);
      logAuditEvent('delete', name, id, existing.exists() ? labelFor(existing.data()) : null);
      refreshPublicCaches();
    },
  };
}

export const songsAdmin = makeAdminCollection('songs');

const baseArtistsAdmin = makeAdminCollection('artists');

/** Every song that belongs to an artist - matched by `artistSlug` (the
 * reliable link) and, for older songs saved before that field existed, by
 * exact `artistName`. De-duplicated, newest-updated first. */
export async function songsForArtist(slug, displayName) {
  const queries = [getDocs(query(collection(db, 'songs'), where('artistSlug', '==', slug)))];
  if (displayName) {
    queries.push(getDocs(query(collection(db, 'songs'), where('artistName', '==', displayName))));
  }
  const snaps = await Promise.all(queries);
  const byId = new Map();
  snaps.forEach((snap) => snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() })));
  return [...byId.values()].sort(byUpdatedDesc);
}

/** Renames `artistName` (and links `artistSlug`) on every song of an artist
 * after their display name changed, so the "Popular Songs" lookup and the
 * song pages don't go stale. Chunked to stay under Firestore's 500-write
 * batch limit. */
async function cascadeArtistRename(slug, oldName, newName) {
  const songs = await songsForArtist(slug, oldName);
  for (let i = 0; i < songs.length; i += 400) {
    const batch = writeBatch(db);
    songs.slice(i, i + 400).forEach((s) => {
      batch.update(doc(db, 'songs', s.id), { artistName: newName, artistSlug: slug });
    });
    await batch.commit();
  }
  return songs.length;
}

export const artistsAdmin = {
  ...baseArtistsAdmin,
  async update(id, data, options) {
    const prev = await baseArtistsAdmin.get(id);
    const result = await baseArtistsAdmin.update(id, data, options);
    const newName = String(data?.displayName ?? '').trim();
    if (prev?.displayName && newName && prev.displayName !== newName) {
      try {
        const count = await cascadeArtistRename(id, prev.displayName, newName);
        refreshPublicCaches();
        return { ...result, renamedSongs: count };
      } catch {
        return { ...result, renamedSongs: 0, cascadeFailed: true };
      }
    }
    return result;
  },
};
