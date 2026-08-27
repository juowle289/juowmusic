import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

export const SITE_TITLE = 'Juowle | Fav Songs & Lyrics';

// A small "now playing" glyph prepended to the tab title while a song is
// actively playing - the same idea as SoundCloud's tab-title play icon, so
// a background/inactive tab still visibly signals audio is running.
const PLAYING_PREFIX = '▶ ';

/**
 * Sets the browser tab title for the current page, layering in a "▶ " prefix
 * whenever a song is actively playing - regardless of which page that
 * playback started from, since the mini/global player persists across
 * routes. Pass `undefined`/`null` (e.g. while data is still loading) to fall
 * back to the site's default title instead of flashing an empty tab.
 */
export default function useDocumentTitle(title) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    const base = title || SITE_TITLE;
    document.title = isPlaying ? `${PLAYING_PREFIX}${base}` : base;
  }, [title, isPlaying]);
}
