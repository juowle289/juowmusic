import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'juowmusic-ui-hints';
const UiHintsContext = createContext(null);

/**
 * A handful of faint, dismiss-free hint labels point out features that
 * aren't otherwise discoverable (selecting lyrics to share them, clicking
 * the song info to shrink the player into a draggable vinyl). They're not
 * a full product-tour system - just small `(•)⎯⎯⎯` labels sitting near
 * the relevant control, faint enough not to compete with real content.
 * This context is only the on/off switch for all of them at once
 * (Settings > Appearance > "Tips & hints"), default on.
 */
export function UiHintsProvider({ children }) {
  const [hintsEnabled, setHintsEnabledState] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(hintsEnabled));
  }, [hintsEnabled]);

  const setHintsEnabled = (next) => setHintsEnabledState(!!next);

  return <UiHintsContext.Provider value={{ hintsEnabled, setHintsEnabled }}>{children}</UiHintsContext.Provider>;
}

export function useUiHints() {
  const ctx = useContext(UiHintsContext);
  if (!ctx) throw new Error('useUiHints must be used within UiHintsProvider');
  return ctx;
}
