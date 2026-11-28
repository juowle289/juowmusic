import { doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '@/firebase';
import { escapeHtml, textToParagraphs } from '@/lib/escapeHtml';
import { lyricsToHtml } from '@/lib/lyricText';

const viewsFormatter = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
/** 1234567 -> "1.2M", matching the "270M Views" style the static songs use. */
function formatViews(n) {
  return typeof n === 'number' ? viewsFormatter.format(n) : '';
}

/** Songs saved before the Draft/Published switch existed have no `status` -
 * they count as published. */
export function isPublished(data) {
  return (data?.status ?? 'published') !== 'draft';
}

/**
 * Bridges the admin's Firestore `songs` collection into the public site,
 * which otherwise only knows about the hand-written files under src/data/
 * (songs.js for search, src/data/lyrics/*.json for /lyrics/:slug). Those
 * static files still hold the original, richly-styled songs; this layer
 * just adds whatever an admin has created on top, so new songs are
 * searchable and playable without rewriting the original content pipeline.
 */

// ---- Search index (src/data/songs.js merges this in) ----------------------

let inflight = null;

/** Reads the one-document public index (see rebuildPublicIndex in
 * adminData.js) - cheap, and the only thing visitors may read besides
 * individual published songs. Returns { songs: [], artists: [] } if the
 * index hasn't been built yet. */
export async function fetchPublicIndex() {
  const snap = await getDoc(doc(db, 'meta', 'publicIndex'));
  const data = snap.exists() ? snap.data() : {};
  return { songs: data.songs ?? [], artists: data.artists ?? [] };
}

export const usePublicSongsStore = create((set, get) => ({
  songs: [],
  loaded: false,

  async loadAll() {
    if (get().loaded) return;
    // Several callers can ask at once (AppLayout, LyricPage...) - share one request.
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const index = await fetchPublicIndex();
        const songs = index.songs.map((x) => ({
          // Search-result shape (src/data/songs.js's searchAll merges this in):
          imgSrc: x.c,
          title: x.t,
          artist: x.a,
          views: formatViews(x.v),
          link: `/lyrics/${x.id}`,
          // Same fields, named the way src/data/playableTracks.js's
          // tracksBySlug is - so ProfilePage's listening-history stats and
          // the liked-songs list can look a song up here too.
          slug: x.id,
          songTitle: x.t,
          artistName: x.a,
          coverSrc: x.c,
          // Used for "You may also like", Popular Songs and New arrivals.
          artistSlug: x.as ?? '',
          genre: x.g ?? '',
          rawViews: x.v ?? 0,
          releaseDate: x.r ?? '',
          updatedAt: x.u ?? 0,
        }));
        set({ songs, loaded: true });
      } catch {
        // No Firestore / offline / rules not published yet - search just
        // falls back to the static list, nothing crashes.
        set({ loaded: true });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  /** Forces a reload (used after an admin saves/deletes a song). */
  async refresh() {
    set({ loaded: false });
    return get().loadAll();
  },
}));

/** { slug: {slug, songTitle, artistName, coverSrc} } for every Firestore
 * song currently cached - lets anything that already has a `tracksBySlug`
 * fallback (like ProfilePage's listening-history stats) fall back to this
 * too, for songs outside the static catalogue. */
export function getFirestoreTracksBySlug() {
  const map = {};
  for (const s of usePublicSongsStore.getState().songs) map[s.slug] = s;
  return map;
}

/** Up to `max` other published songs by the same artist first, then the
 * same genre, most-viewed first - the "You may also like" column. Waits for
 * the song cache to be loaded. */
export async function getRecommendedSongs(slug, data, max = 5) {
  await usePublicSongsStore.getState().loadAll();
  const pool = usePublicSongsStore.getState().songs.filter((s) => s.slug !== slug);
  const sameArtist = (s) =>
    (data.artistSlug && s.artistSlug === data.artistSlug) ||
    (data.artistName && s.artistName === data.artistName);
  const sameGenre = (s) => data.genre && s.genre === data.genre;
  const byViews = (a, b) => b.rawViews - a.rawViews;

  const picked = [
    ...pool.filter(sameArtist).sort(byViews),
    ...pool.filter((s) => !sameArtist(s) && sameGenre(s)).sort(byViews),
  ].slice(0, max);

  return picked.map((s) => ({ link: s.link, img: s.coverSrc, title: s.songTitle, artist: s.artistName }));
}

// ---- Single-song lookup for LyricPage --------------------------------------

/** Returns the raw song doc, or null if missing - or still a draft. Drafts
 * are now enforced by firestore.rules (only admins can read them), so the
 * admin's "Preview" link (?preview=1) works for admins and nobody else. */
export async function fetchFirestoreSong(slug, { allowDraft = false } = {}) {
  try {
    const snap = await getDoc(doc(db, 'songs', slug));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!allowDraft && !isPublished(data)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Bumps a song's real view count by 1 - fire-and-forget. Counted at most
 * once per browser session per song (a refresh or back/forward no longer
 * inflates it). Firestore rules only let a non-admin bump `views`, and only
 * by exactly +1 - see firestore.rules.
 */
export function incrementSongViews(slug) {
  const key = `juow:viewed:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // sessionStorage unavailable (private mode...) - just count it.
  }
  updateDoc(doc(db, 'songs', slug), { views: increment(1) }).catch(() => {
    // Not worth surfacing to the visitor - the page itself already loaded fine.
  });
}

/** Builds the same shape LyricPage.jsx reads off its static SONGS[slug]
 * entries, from an admin-created Firestore song doc. Every value typed in
 * the admin is HTML-escaped here because LyricPage injects these strings
 * with dangerouslySetInnerHTML. */
export function adaptFirestoreSong(slug, data, recommended = []) {
  const artist = escapeHtml(data.artistName ?? '');
  const artistHtml = data.artistSlug
    ? `<a href="/artist/${encodeURIComponent(data.artistSlug)}">${artist}</a>`
    : `<span>${artist}</span>`;
  const genreHtml = data.genre ? ` • ${escapeHtml(data.genre)}` : '';

  return {
    slug,
    docTitle: `${data.artistName ?? ''} - ${data.songTitle ?? ''} Lyrics`.trim(),
    songTitle: data.songTitle ?? '',
    artistName: data.artistName ?? '',
    coverSrc: data.coverSrc ?? '',
    audioSrc: data.audioSrc ?? '',
    customStyle: '',
    songMetaHtml: `${artistHtml}${genreHtml}`,
    producerHtml: data.producers ? `Producer<br/>\n${escapeHtml(data.producers)}` : '',
    metaHtml: [
      data.releaseDate ? `<p>${escapeHtml(data.releaseDate)}</p>` : '',
      // `views` is a real, auto-incrementing number (see incrementSongViews).
      formatViews(data.views) ? `<p>${formatViews(data.views)} Views</p>` : '',
    ].join('\n'),
    tinyAboutHtml: escapeHtml(data.description ?? ''),
    aboutHtml: textToParagraphs(data.description),
    lyricHtml: lyricsToHtml(data.lyrics),
    qa: (data.qa ?? [])
      .filter((q) => q.question)
      .map((q) => ({
        question: q.question,
        answerHtml: textToParagraphs(q.answer),
      })),
    recommended,
    isDraft: !isPublished(data),
    lineTimestamps: Array.isArray(data.lineTimestamps) ? data.lineTimestamps : null,
  };
}
