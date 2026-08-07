import { useEffect } from 'react';

/**
 * Injects a raw CSS string as a <style> tag while the component is mounted.
 *
 * The original per-song stylesheets target a bare `nav { ... }` selector,
 * assuming there is only one <nav> element on the page (the song hero).
 * Our shared <AppHeader> also renders an internal <nav> for its menu links,
 * so a bare `nav` selector here would incorrectly bleed a colored
 * background onto the site header too. We scope it down to `.song-hero`
 * (the class applied to the hero element) before injecting.
 */
export default function useInlineStyle(css) {
  useEffect(() => {
    if (!css) return undefined;
    const scoped = css.replace(/(^|\})\s*nav(\s*\{)/g, '$1 .song-hero$2');
    const style = document.createElement('style');
    style.textContent = scoped;
    document.head.appendChild(style);
    return () => style.remove();
  }, [css]);
}
