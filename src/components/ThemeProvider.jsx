import { useEffect } from 'react';

const STORAGE_KEY = 'juowmusic-theme';

export default function ThemeProvider({ children, defaultTheme = 'dark' }) {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const theme = stored ?? defaultTheme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [defaultTheme]);

  return children;
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  setTheme(isDark ? 'light' : 'dark');
}
