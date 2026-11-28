import { ARTISTS_BY_SLUG } from '@/data/artists';

/**
 * ASCII slug for a title/name. Handles Vietnamese "đ/Đ" explicitly because
 * Unicode NFD does NOT decompose it (so "Đen Vâu" used to become "en-vau").
 */
export function slugify(input) {
  return String(input ?? '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

// Hand-written songs live in src/data/lyrics/<slug>.json. They always win
// over a Firestore doc with the same slug (LyricPage checks the static map
// first), so an admin song reusing one of these slugs would never show up.
const lyricFiles = import.meta.glob('../data/lyrics/*.json');
export const STATIC_SONG_SLUGS = new Set(
  Object.keys(lyricFiles).map((p) => p.split('/').pop().replace(/\.json$/, '')),
);
export const STATIC_ARTIST_SLUGS = new Set(Object.keys(ARTISTS_BY_SLUG));

// "new" is the create route (/admin/songs/new) - a doc with that id could
// never be opened for editing.
const RESERVED = new Set(['new', 'admin', 'api']);

/** Returns an error message for a bad slug, or '' when it's fine. */
export function validateSlug(slug, kind) {
  if (!slug) return 'Slug is required.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Slug may only contain lowercase letters, numbers and single hyphens.';
  }
  if (RESERVED.has(slug)) return `"${slug}" is a reserved word - pick a different slug.`;
  const taken = kind === 'song' ? STATIC_SONG_SLUGS : STATIC_ARTIST_SLUGS;
  if (taken.has(slug)) {
    return `"${slug}" is already used by a built-in ${kind} page and would never be shown - pick a different slug.`;
  }
  return '';
}

/** True for absolute http(s) URLs only (blocks javascript:, data:, etc.). */
export function isHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Empty string when OK/blank, otherwise an error message. */
export function validateOptionalUrl(value, label) {
  if (!value) return '';
  return isHttpUrl(value) ? '' : `${label} must be a full http(s) URL.`;
}
