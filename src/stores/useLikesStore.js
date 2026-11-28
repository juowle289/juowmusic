import { create } from 'zustand';
import { pullUserField, pushUserField } from '@/lib/userCloud';

const PREFIX = 'juowmusic-likes:';

function load(uid) {
  if (!uid) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFIX + uid) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(uid, slugs) {
  if (!uid) return;
  try {
    localStorage.setItem(PREFIX + uid, JSON.stringify(slugs));
  } catch {
    // localStorage unavailable - the cloud copy still holds it.
  }
}

/**
 * The signed-in account's liked songs (the heart button) - the "Liked songs"
 * playlist on the Profile page. Newest like first. Cached per-uid in
 * localStorage for instant UI and mirrored to Firestore `users/{uid}.likedSongs`
 * so it follows the account across devices.
 */
export const useLikesStore = create((set, get) => ({
  uid: null,
  likedSlugs: [],

  setUser: (uid) => {
    if (get().uid === uid) return;
    const local = load(uid);
    set({ uid, likedSlugs: local });
    if (!uid) return;
    pullUserField(uid, 'likedSongs').then((remote) => {
      if (get().uid !== uid) return;
      if (remote) {
        save(uid, remote);
        set({ likedSlugs: remote });
      } else if (local.length > 0) {
        pushUserField(uid, 'likedSongs', local);
      }
    });
  },

  isLiked: (slug) => get().likedSlugs.includes(slug),

  /** Returns false (and does nothing) when nobody is signed in - the caller
   * should send the person to /login. */
  toggleLike: (slug) => {
    const { uid, likedSlugs } = get();
    if (!uid) return false;
    const next = likedSlugs.includes(slug) ? likedSlugs.filter((s) => s !== slug) : [slug, ...likedSlugs];
    save(uid, next);
    pushUserField(uid, 'likedSongs', next);
    set({ likedSlugs: next });
    return true;
  },
}));
