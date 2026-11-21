import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '@/firebase';

/**
 * Same idea as publicSongsCache.js but for the admin's Firestore `artists`
 * collection: merges Firestore artists into search, and lets /artist/:slug
 * fall back to Firestore when the slug isn't one of the hand-written pages
 * under src/data/artists/.
 */

// ---- Search index (src/data/songs.js merges this in) ----------------------

export const usePublicArtistsStore = create((set, get) => ({
  artists: [],
  loaded: false,

  async loadAll() {
    if (get().loaded) return;
    try {
      const snap = await getDocs(collection(db, 'artists'));
      const artists = snap.docs.map((d) => {
        const data = d.data();
        return {
          avtArtist: data.avatarImg,
          nameArtist: data.displayName,
          link: `/artist/${d.id}`,
        };
      });
      set({ artists, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));

// ---- Single-artist lookup for ArtistPage -----------------------------------

export async function fetchFirestoreArtist(slug) {
  try {
    const snap = await getDoc(doc(db, 'artists', slug));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/** "Instagram, https://instagram.com/x\nYouTube, https://youtube.com/x" ->
 * the {href, icon, color} shape LinkIcon expects. No per-platform icon yet
 * from this simple textarea, so everything gets a generic link glyph. */
function parseSocialLinks(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [, url] = line.split(',').map((s) => s.trim());
      return { href: url || line, icon: 'fa-solid fa-link', color: null };
    })
    .filter((l) => l.href);
}

/** Builds the same shape ArtistPage.jsx reads off its static ARTISTS_BY_SLUG
 * entries, from an admin-created Firestore artist doc. Sections the simple
 * admin form doesn't collect yet (Fanbase stats, Top Track, Albums) are left
 * empty - ArtistPage renders those sections gracefully with nothing in them
 * rather than breaking. */
export function adaptFirestoreArtist(slug, data) {
  return {
    slug,
    docTitle: `${data.displayName ?? ''} - Juowle`,
    displayName: data.displayName ?? '',
    avatarImg: data.avatarImg ?? '',
    genre: data.genre ?? '',
    countryName: data.country ?? '',
    countryFlag: '',
    bio: data.bioText ? [{ icon: 'fa-solid fa-circle-info', label: 'Bio', value: data.bioText }] : [],
    links: parseSocialLinks(data.socialLinks),
    fanbase: [],
    topTrack: null,
    albums: [],
    popularSongs: [],
    faq: (data.faq ?? []).map((q) => ({
      question: q.question,
      answerHtml: (q.answer ?? '')
        .split('\n')
        .filter(Boolean)
        .map((line) => `<p>${line}</p>`)
        .join('\n'),
    })),
  };
}
