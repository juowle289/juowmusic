import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router doesn't scroll to `#fragment` on client-side navigation, so a
 * link like `/#featured` clicked from another page would land at the top of
 * the home page. This waits for the target element to exist (the destination
 * page may still be mounting) and scrolls to it.
 */
export default function useHashScroll() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep the raw fragment
    }
    let tries = 0;
    let raf;
    const attempt = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 30) raf = requestAnimationFrame(attempt);
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
}
