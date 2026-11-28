import { doc, getDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '@/firebase';
import { platformById, FANBASE_PLATFORMS } from '@/data/socialPlatforms';
import { textToParagraphs } from '@/lib/escapeHtml';
import { isHttpUrl } from '@/lib/slug';
import { fetchPublicIndex, isPublished, usePublicSongsStore } from '@/lib/publicSongsCache';

/**
 * Same idea as publicSongsCache.js but for the admin's Firestore `artists`
 * collection: merges Firestore artists into search and "Similar Artists",
 * and lets /artist/:slug fall back to Firestore when the slug isn't one of
 * the hand-written pages under src/data/artists/.
 */

// ---- Search index + similar-artist cards -----------------------------------

let inflight = null;

export const usePublicArtistsStore = create((set, get) => ({
  artists: [],
  loaded: false,

  async loadAll() {
    if (get().loaded) return;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const index = await fetchPublicIndex();
        const artists = index.artists.map((x) => ({
          // Search-result shape (src/data/songs.js's searchAll merges this in):
          avtArtist: x.av,
          nameArtist: x.n,
          link: `/artist/${x.id}`,
          // Same shape as src/data/recommendedArtists.js's ALL_ARTISTS,
          // so ArtistPage's "Similar Artists" can include these too.
          slug: x.id,
          name: x.n,
          genre: x.g ?? '',
          img: x.av,
          flag: x.fl ?? '',
          to: `/artist/${x.id}`,
        }));
        set({ artists, loaded: true });
      } catch {
        set({ loaded: true });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  /** Forces a reload (used after an admin saves/deletes an artist). */
  async refresh() {
    set({ loaded: false });
    return get().loadAll();
  },
}));

// ---- Single-artist lookup for ArtistPage -----------------------------------

/** Returns { data, popularSongs } (or null if the artist doesn't exist, or is
 * still a draft and `allowDraft` isn't set). `popularSongs` is looked up here
 * rather than picked by hand: every published song linked to this artist by
 * `artistSlug` (or, for older songs, by exact `artistName`), most-viewed
 * first, capped at 10. */
export async function fetchFirestoreArtist(slug, { allowDraft = false } = {}) {
  try {
    const snap = await getDoc(doc(db, 'artists', slug));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!allowDraft && !isPublished(data)) return null;

    // Popular Songs come from the cached public index (no per-artist query -
    // public visitors can't list the songs collection any more): published
    // songs linked by artistSlug (or, for older songs, exact artistName),
    // most-viewed first, capped at 10.
    let popularSongs = [];
    try {
      await usePublicSongsStore.getState().loadAll();
      popularSongs = usePublicSongsStore
        .getState()
        .songs.filter((s) => s.artistSlug === slug || (data.displayName && s.artistName === data.displayName))
        .sort((a, b) => b.rawViews - a.rawViews)
        .slice(0, 10)
        .map((s) => ({
          img: s.coverSrc,
          title: s.songTitle,
          artist: s.artistName,
          date: s.releaseDate,
          // Object form on purpose: ArtistPage's resolveLink() reads
          // link.type/link.slug (a plain string made every card a dead link).
          link: { type: 'lyric', slug: s.slug },
        }));
    } catch {
      // Popular Songs is a nice-to-have - the rest of the page renders without it.
    }

    return { data, popularSongs };
  } catch {
    return null;
  }
}

/** [{platform: 'instagram', url}] -> the {href, icon, color} shape LinkIcon
 * expects - icon/color come from socialPlatforms.js at render time rather
 * than being frozen into the saved data. Non-http(s) URLs (e.g. a typed
 * "javascript:...") are dropped. */
function buildLinks(links) {
  return (links ?? [])
    .filter((l) => isHttpUrl(l.url))
    .map((l) => {
      const preset = platformById(l.platform);
      return { href: l.url, icon: preset.icon, color: preset.color };
    });
}

/** [{platform: 'Spotify', number, label}] -> the {icon, iconColor, platform,
 * number, label} shape FanbaseCard expects (icon/iconColor from the fixed
 * FANBASE_PLATFORMS preset, keyed by the exact platform name). */
function buildFanbase(fanbase) {
  return (fanbase ?? [])
    .filter((f) => f.number)
    .map((f) => {
      const preset = FANBASE_PLATFORMS.find((p) => p.platform === f.platform);
      return {
        platform: f.platform,
        number: f.number,
        label: f.label || preset?.defaultLabel || '',
        icon: preset?.icon ?? 'fa-solid fa-chart-simple',
        iconColor: preset?.iconColor ?? '#777',
      };
    });
}

function buildFaq(faq) {
  return (faq ?? [])
    .filter((q) => q.question)
    .map((q) => ({
      question: q.question,
      answerHtml: textToParagraphs(q.answer),
    }));
}

function buildTopTrack(topTrack) {
  if (!topTrack?.title) return null;
  return {
    title: topTrack.title,
    img: topTrack.img ?? '',
    achievements: (topTrack.achievements ?? []).filter((a) => a.number || a.label),
    aboutHtml: textToParagraphs(topTrack.aboutText),
  };
}

/** Builds the same shape ArtistPage.jsx reads off its static ARTISTS_BY_SLUG
 * entries, from an admin-created Firestore artist doc. Text that ends up in
 * dangerouslySetInnerHTML (FAQ answers, top-track write-up) is escaped. */
export function adaptFirestoreArtist(slug, data, popularSongs = []) {
  return {
    slug,
    docTitle: `${data.displayName ?? ''} - Juowle`,
    displayName: data.displayName ?? '',
    avatarImg: data.avatarImg ?? '',
    genre: data.genre ?? '',
    countryName: data.country ?? '',
    countryFlag: isHttpUrl(data.countryFlag) ? data.countryFlag : '',
    bio: (data.bio ?? []).filter((row) => row.label && row.value).map((row) => ({ icon: 'fa-solid fa-circle-info', ...row })),
    links: buildLinks(data.links),
    fanbase: buildFanbase(data.fanbase),
    topTrack: buildTopTrack(data.topTrack),
    albums: (data.albums ?? []).filter((a) => a.title && a.img),
    popularSongs,
    faq: buildFaq(data.faq),
  };
}
