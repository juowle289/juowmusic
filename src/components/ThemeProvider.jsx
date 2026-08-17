import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'juowmusic-theme';
const ThemeContext = createContext(null);

/**
 * Was a one-shot effect that only ever set the `.dark` class once at
 * startup, with `setTheme`/`toggleTheme` exported as free functions no UI
 * ever actually called - there was no toggle anywhere in the app. Now a
 * real context: Settings > Appearance reads `theme` to highlight the
 * active option and calls `setTheme` to switch it, and the change is
 * still mirrored onto `<html class="dark">` (and persisted) so Tailwind's
 * `dark:` variant keeps working exactly as it did before for anything
 * already using it (mainly the shadcn/ui primitives in components/ui,
 * which are built on the light/dark CSS variables in index.css).
 *
 * Scope note: most of this app's own pages (Home, Lyrics, Profile's
 * Overview/Explore tabs, the player, etc.) were built with a single fixed
 * dark look using hardcoded colors rather than theme tokens, so flipping
 * this toggle visibly re-themes the Settings area (and anything else
 * built on `bg-background`/`text-foreground`) but won't yet change those
 * hardcoded pages - that would need each of them individually converted
 * to theme tokens, which is a bigger follow-up, not something this
 * toggle can retrofit on its own.
 */
export default function ThemeProvider({ children, defaultTheme = 'dark' }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return localStorage.getItem(STORAGE_KEY) ?? defaultTheme;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next) => setThemeState(next === 'dark' ? 'dark' : 'light');
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
