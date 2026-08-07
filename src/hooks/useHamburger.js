import { useState } from 'react';

/**
 * Replicates the hamburger open/close behaviour from js/home.js and js/lyric.js:
 * toggling inline styles on the icon and the sliding `.bars` panel instead of
 * relying on the checkbox's :checked CSS state.
 */
export default function useHamburger() {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);

  const iconStyle = open
    ? { transform: 'rotate(180deg)', color: '#feec93' }
    : { transform: 'rotate(0deg)', color: '#fff' };

  const barsStyle = open
    ? {
        transform: 'translateX(-15em)',
        opacity: 1,
        boxShadow: '-15em 0px 10px rgba(0, 0, 0, 0.6)',
        zIndex: 20,
      }
    : {
        transform: 'translateX(0em)',
        opacity: 0,
        boxShadow: 'none',
        zIndex: 1,
      };

  return { open, toggle, iconStyle, barsStyle };
}
