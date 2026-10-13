import { create } from 'zustand';

/**
 * Lets a page tint the site header. LyricPage publishes the flat (non-gradient)
 * dominant color of the song's cover so the header matches the hero; every
 * other page leaves it `null` and the header keeps its default look.
 *
 * @typedef {{ bg: string, isLight: boolean }} HeaderTheme
 */
export const useHeaderThemeStore = create((set) => ({
  /** @type {HeaderTheme | null} */
  theme: null,
  setTheme: (theme) => set({ theme }),
  clearTheme: () => set({ theme: null }),
}));
