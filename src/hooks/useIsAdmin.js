import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';

// UI-only gate: hides/redirects the admin area for non-admins so they never
// see it, but grants no real access by itself. The actual enforcement lives
// server-side - Firestore Security Rules (firestore.rules) for data writes,
// and ADMIN_EMAILS in /api/blob-upload + the other /api/admin-* functions
// for anything that needs the Admin SDK - so this allowlist must be kept in
// sync with those (it's the "bootstrap" admin; see useIsAdmin below for the
// other, UI-managed way to become an admin).
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * True if the signed-in account is an admin - either because its email is
 * in the hardcoded VITE_ADMIN_EMAILS allowlist (the "bootstrap" admin, kept
 * in sync with Vercel's ADMIN_EMAILS), or because an existing admin granted
 * it to them from the Users tab (a doc under Firestore's admins/{uid}).
 * The email check is instant; the Firestore check briefly reports `false`
 * while it loads, so callers that only care about *not* flashing the
 * "denied" UI for a real admin should also check `loading`.
 */
export default function useIsAdmin() {
  const { user } = useAuth();
  const isHardcodedAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  const [firestoreAdmin, setFirestoreAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setFirestoreAdmin(false);
      setLoading(false);
      return;
    }
    if (isHardcodedAdmin) {
      // Already known to be an admin - no need to wait on a Firestore read.
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'admins', user.uid))
      .then((snap) => {
        if (cancelled) return;
        setFirestoreAdmin(snap.exists());
      })
      .catch(() => {
        if (!cancelled) setFirestoreAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, isHardcodedAdmin]);

  return {
    isAdmin: isHardcodedAdmin || firestoreAdmin,
    // Only meaningfully "loading" when we don't already know the answer via
    // the instant email check.
    loading: loading && !isHardcodedAdmin,
  };
}
