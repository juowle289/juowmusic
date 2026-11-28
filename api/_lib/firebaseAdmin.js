import { cert, getApps, initializeApp } from 'firebase-admin/app';

/** Initializes (once) and returns the shared firebase-admin App, from the
 * service account JSON in FIREBASE_SERVICE_ACCOUNT_KEY. Only the admin
 * Users tab (list/disable accounts) and the Firestore-based admin check in
 * requireAdmin.js need this - everything else in /admin talks to Firestore
 * straight from the browser. */
export function getAdminApp() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getApps()[0];
}
