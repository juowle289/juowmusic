import { useEffect, useState } from 'react';

/**
 * Shows a loading gate until the page has actually finished loading its
 * assets (images, video, fonts...) - not just an arbitrary timer. Uses the
 * `load` event (fires once everything, including images, has downloaded) as
 * the real signal, with:
 *  - a `minDuration` floor so it never just flashes for a few ms, and
 *  - a `maxDuration` ceiling so a single slow/failed asset can't strand the
 *    user behind the loader forever.
 *
 * On client-side route changes (not a hard reload) `document.readyState` is
 * already 'complete' by the time this mounts, so it naturally resolves after
 * just the minimum duration instead - a quick, honest flash rather than a
 * fake multi-second wait for data that's already there.
 */
export default function useLoader({ minDuration = 700, maxDuration = 4000 } = {}) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let settled = false;
    let fadeTimer;
    let removeTimer;

    const finish = () => {
      if (settled) return;
      settled = true;
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, minDuration - elapsed);
      fadeTimer = setTimeout(() => {
        setFading(true);
        removeTimer = setTimeout(() => setVisible(false), 450);
      }, wait);
    };

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish);
    }
    const maxTimer = setTimeout(finish, maxDuration);

    return () => {
      window.removeEventListener('load', finish);
      clearTimeout(maxTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [minDuration, maxDuration]);

  return { visible, fading };
}
