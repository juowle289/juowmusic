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

/**
 * Lyric page: true once the hero block (the element with `heroId`) has scrolled
 * up past the bottom of the fixed header, false again as soon as any part of it
 * is back under the header. `routeKey` re-runs the check when navigating
 * between songs, since the hero element is a new node each time.
 */
export function useHeroPassed(heroId, enabled, routeKey, headerOffset = 72) {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPassed(false);
      return undefined;
    }
    const check = () => {
      const hero = document.getElementById(heroId);
      setPassed(hero ? hero.getBoundingClientRect().bottom <= headerOffset : false);
    };
    check();
    // The page (and its hero) may mount a moment after this runs - e.g. lazily
    // loaded routes - so look again a few times instead of waiting for a scroll.
    const retries = [100, 400, 1000, 2500].map((ms) => setTimeout(check, ms));
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      retries.forEach(clearTimeout);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [heroId, enabled, routeKey, headerOffset]);

  return passed;
}
