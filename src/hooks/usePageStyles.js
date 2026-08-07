import { useEffect } from 'react';

/**
 * Dynamically injects <link rel="stylesheet"> tags for the given css file names
 * (served from /public/styles/) and removes them when the page unmounts.
 * This mirrors the original project's behaviour, where each plain HTML page
 * only linked the CSS files it actually needed.
 */
export default function usePageStyles(hrefs = []) {
  useEffect(() => {
    const links = hrefs.map((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `/styles/${href}`;
      link.dataset.pageStyle = 'true';
      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach((link) => link.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hrefs.join(',')]);
}
