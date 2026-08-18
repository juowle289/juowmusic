import { useEffect, useState } from 'react';

/** Tiny shared toast state: set a message, it clears itself after
 * `duration` ms. Used by Comments.jsx (edit/delete/report) and
 * ActivityLogPanel.jsx (restore) so every comment-related action gives
 * the same 3s floating confirmation instead of each screen rolling its
 * own timer. */
export default function useToast(duration = 3000) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  return [message, setMessage];
}
