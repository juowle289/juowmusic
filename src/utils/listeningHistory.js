const KEY_PREFIX = 'juowmusic-history';
const MAX_ENTRIES = 4000; // keeps localStorage bounded for long-lived accounts

function storageKey(uid) {
  return `${KEY_PREFIX}:${uid}`;
}

function load(uid) {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(uid, entries) {
  try {
    const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
    localStorage.setItem(storageKey(uid), JSON.stringify(trimmed));
  } catch {
    // localStorage can be unavailable (private mode, quota full, etc.) -
    // losing history isn't worth crashing the app over.
  }
}

/**
 * One entry per song actually started - logged once real playback of that
 * song has run a few seconds (see useListeningTracker's PLAY_THRESHOLD),
 * not on every press of the play button. This is what "total plays",
 * "top songs", the listening streak, and "time of day" are all built from.
 */
export function recordPlayStart(uid, { slug, artistName }) {
  if (!uid || !slug) return;
  const entries = load(uid);
  entries.push({ type: 'play', slug, artistName: artistName ?? null, timestamp: Date.now() });
  save(uid, entries);
}

/**
 * Periodic chunks of real elapsed playback time - driven by the actual
 * <audio> element's timeupdate progress (via usePlayerStore's currentTime),
 * not a wall clock, so paused/backgrounded time and seeking don't count.
 * Summed for "total minutes listened" and the per-day chart.
 */
export function recordListenChunk(uid, { slug, seconds }) {
  if (!uid || !slug || !(seconds > 0)) return;
  const entries = load(uid);
  entries.push({ type: 'listen', slug, seconds, timestamp: Date.now() });
  save(uid, entries);
}

/** Full raw history for a user - callers filter by `type` as needed. */
export function readHistory(uid) {
  if (!uid) return [];
  return load(uid);
}
