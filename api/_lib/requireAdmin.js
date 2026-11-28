import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './firebaseAdmin.js';

// Firebase ID tokens are standard JWTs signed by Google - verifiable with
// just the project id and Google's public keys below, no service-account
// secret needed. Set FIREBASE_PROJECT_ID in Vercel if it ever differs from
// the default (matches src/firebase.js's `projectId`).
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'juowmusic';
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/** Verifies the caller is signed in AND is an admin - either their email is
 * on the ADMIN_EMAILS allowlist (the "bootstrap" admin, same accounts as
 * VITE_ADMIN_EMAILS and firestore.rules' isHardcodedAdmin()), or an existing
 * admin granted them access from the Users tab (a Firestore admins/{uid}
 * doc - same source of truth firestore.rules' isAdmin() checks). Shared by
 * every /api function that needs to gate access to admins only.
 *
 * The Firestore check only runs (and so only needs
 * FIREBASE_SERVICE_ACCOUNT_KEY set) when the email check alone doesn't
 * already settle it, so /api/blob-upload keeps working with just
 * ADMIN_EMAILS set, same as before this existed. */
export async function requireAdmin(request) {
  const authHeader = request.headers.authorization || request.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw new Error('Missing Authorization header');

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });

  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = String(payload.email || '').toLowerCase();
  if (email && allowed.includes(email)) return payload;

  // Not on the hardcoded list - check whether an admin granted them access
  // via the Users tab instead.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const db = getFirestore(getAdminApp());
      const snap = await db.collection('admins').doc(payload.sub).get();
      if (snap.exists) return payload;
    } catch {
      // Falls through to the error below.
    }
  }

  throw new Error('Not an admin account');
}
