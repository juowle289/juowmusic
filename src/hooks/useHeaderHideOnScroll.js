import { useEffect } from 'react';

export default function useHeaderHideOnScroll(threshold = 1) {
  useEffect(() => {
    const header = document.getElementById('header');
    if (!header) return undefined;
    const onScroll = () => {
      const scrPos = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle('hidden', scrPos > threshold);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
}
