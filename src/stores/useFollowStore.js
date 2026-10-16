import { create } from 'zustand';

const FOLLOWS_PREFIX = 'juowmusic-follows:';
const SEEN_PREFIX = 'juowmusic-follows-seen:';

function safeParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadFollows(uid) {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(FOLLOWS_PREFIX + uid);
    return raw ? safeParse(raw, []) : [];
  } catch {
    return [];
  }
}

function saveFollows(uid, slugs) {
  if (!uid) return;
  try {
    localStorage.setItem(FOLLOWS_PREFIX + uid, JSON.stringify(slugs));
  } catch {
    // localStorage can be unavailable (private mode, etc.) - not worth crashing over.
  }
}

function loadSeen(uid) {
  if (!uid) return {};
  try {
    const raw = localStorage.getItem(SEEN_PREFIX + uid);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSeen(uid, seen) {
  if (!uid) return;
  try {
    localStorage.setItem(SEEN_PREFIX + uid, JSON.stringify(seen));
  } catch {
    // ignore
  }
}

/**
 * Tracks which artists the signed-in account follows, scoped per-uid in
 * localStorage (there's no backend here to store this server-side). Also
 * doubles as a tiny notification feed: each followed artist's current "top
 * track" title is fingerprinted, and whenever that fingerprint changes from
 * the last one this account has *seen* (i.e. the data was updated with a
 * new single/album), it shows up as an unread notification on the Profile
 * page until the person opens the Notifications tab.
 */
export const useFollowStore = create((set, get) => ({
  uid: null,
  followedSlugs: [],
  seen: {},

  /** Call whenever the signed-in user changes (see AppLayout) so the right
   * account's follows/seen-state load in. */
  setUser: (uid) => {
    if (get().uid === uid) return;
    set({ uid, followedSlugs: loadFollows(uid), seen: loadSeen(uid) });
  },

  isFollowing: (slug) => get().followedSlugs.includes(slug),

  /** Returns false (and does nothing) if nobody is signed in - the caller
   * should send the person to /login instead. */
  toggleFollow: (slug) => {
    const { uid, followedSlugs } = get();
    if (!uid) return false;
    const next = followedSlugs.includes(slug)
      ? followedSlugs.filter((s) => s !== slug)
      : [...followedSlugs, slug];
    saveFollows(uid, next);
    set({ followedSlugs: next });
    return true;
  },

  /** Marks every currently-visible notification as read. */
  markAllSeen: (notifications) => {
    const { uid, seen } = get();
    if (!uid || !notifications.length) return;
    const nextSeen = { ...seen };
    notifications.forEach((n) => {
      nextSeen[n.slug] = n.fingerprint;
    });
    saveSeen(uid, nextSeen);
    set({ seen: nextSeen });
  },
}));

/**
 * Builds the notification list for the current account: one entry per
 * followed artist whose latest top track doesn't match what this account
 * last saw, derived straight from the same artist data already on the page
 * (no separate "new release" feed exists yet).
 */
export function buildFollowNotifications(followedSlugs, seen, artistsBySlug) {
  return followedSlugs
    .map((slug) => artistsBySlug[slug])
    .filter(Boolean)
    .map((artist) => {
      const fingerprint = artist.topTrack?.title ?? '';
      return {
        slug: artist.slug,
        name: artist.displayName,
        avatarImg: artist.avatarImg,
        trackTitle: artist.topTrack?.title,
        trackImg: artist.topTrack?.img,
        fingerprint,
        unread: seen[artist.slug] !== fingerprint,
      };
    });
}
