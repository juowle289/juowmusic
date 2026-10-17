import { useAuth } from '@/context/AuthContext';

// UI-only gate: hides/redirects the admin area for non-admins so they never
// see it, but grants no real access by itself. The actual enforcement lives
// server-side - Firestore Security Rules (firestore.rules) for data writes,
// and ADMIN_EMAILS in /api/blob-upload for file uploads - so this list must
// be kept in sync with both of those.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default function useIsAdmin() {
  const { user } = useAuth();
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
