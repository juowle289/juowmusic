import { useEffect, useState } from 'react';

/**
 * Adds the `effHeader` class once the page has scrolled past 50px,
 * replicating the `$(window).on('scroll', ...)` handler from js/home.js
 * and js/lyric.js.
 */
export function useEffHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return scrolled;
}

/**
 * Home page only: highlights the Featured / News / Songs nav links
 * depending on scroll position, matching the hard-coded ranges in js/home.js.
 */
export function useHomeNavBorder() {
  const [active, setActive] = useState(null);

  useEffect(() => {
    const onScroll = () => {
      const scrollPos = window.scrollY;
      if (scrollPos > 600 && scrollPos < 1449) setActive('featured');
      else if (scrollPos > 1450 && scrollPos < 2099) setActive('news');
      else if (scrollPos > 2100) setActive('songs');
      else setActive(null);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return active;
}

/**
 * Artist / lyric pages: highlights whichever #sectionN link matches the
 * section currently in the middle of the viewport (scrollspy), matching
 * js/lyric.js's `.header-menu li a` loop.
 */
export function useScrollSpy(sectionIds) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const onScroll = () => {
      const scrollPos = window.scrollY;
      const middleOfWindow = scrollPos + window.innerHeight / 2;
      let current = null;
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (top <= middleOfWindow && top + height > scrollPos) {
          current = id;
        }
      });
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionIds]);

  return activeId;
}
