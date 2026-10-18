import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '@/firebase';

/**
 * Bridges the admin's Firestore `songs` collection into the public site,
 * which otherwise only knows about the hand-written files under src/data/
 * (songs.js for search, src/data/lyrics/*.json for /lyrics/:slug). Those
 * static files still hold the original, richly-styled songs; this layer
 * just adds whatever an admin has created on top, so new songs are
 * searchable and playable without rewriting the original content pipeline.
 */

// ---- Search index (src/data/songs.js merges this in) ----------------------

export const usePublicSongsStore = create((set, get) => ({
  songs: [],
  loaded: false,

  async loadAll() {
    if (get().loaded) return;
    try {
      const snap = await getDocs(collection(db, 'songs'));
      const songs = snap.docs.map((d) => {
        const data = d.data();
        return {
          imgSrc: data.coverSrc,
          title: data.songTitle,
          artist: data.artistName,
          views: data.views,
          link: `/lyrics/${d.id}`,
        };
      });
      set({ songs, loaded: true });
    } catch {
      // No Firestore / offline / rules not published yet - search just
      // falls back to the static list, nothing crashes.
      set({ loaded: true });
    }
  },
}));

// ---- Single-song lookup for LyricPage --------------------------------------

export async function fetchFirestoreSong(slug) {
  try {
    const snap = await getDoc(doc(db, 'songs', slug));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/** Converts the plain-text lyrics admins type into the <p>/<b><q> markup the
 * lyric page's styling and line-click-to-share feature expect. A line in
 * brackets (e.g. "[Verse 1]") becomes a section heading; blank lines start a
 * new section. */
function lyricsToHtml(text) {
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const html = lines
        .map((line) => {
          const heading = /^\[(.+)\]$/.exec(line);
          return heading ? `<b></b><p><q>${heading[1]}</q></p>` : `<p>${line}</p>`;
        })
        .join('\n');
      return `${html}\n<br/>`;
    })
    .join('\n');
}

/** Builds the same shape LyricPage.jsx reads off its static SONGS[slug]
 * entries, from an admin-created Firestore song doc. Sections the simple
 * admin form doesn't have yet (Q&A, "You may also like") are just empty. */
export function adaptFirestoreSong(slug, data) {
  return {
    slug,
    docTitle: `${data.artistName ?? ''} - ${data.songTitle ?? ''} Lyrics`.trim(),
    songTitle: data.songTitle ?? '',
    artistName: data.artistName ?? '',
    coverSrc: data.coverSrc ?? '',
    audioSrc: data.audioSrc ?? '',
    customStyle: '',
    songMetaHtml: `<span>${data.artistName ?? ''}</span>`,
    producerHtml: data.producers ? `Producer<br/>\n${data.producers}` : '',
    metaHtml: [
      data.releaseDate ? `<p>${data.releaseDate}</p>` : '',
      data.views ? `<p>${data.views} Views</p>` : '',
    ].join('\n'),
    tinyAboutHtml: data.description ?? '',
    aboutHtml: data.description ? `<p>${data.description}</p>` : '',
    lyricHtml: lyricsToHtml(data.lyrics),
    qa: [],
    recommended: [],
    lineTimestamps: data.lineTimestamps ?? null,
  };
}
