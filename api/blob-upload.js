import { handleUpload } from '@vercel/blob/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Firebase ID tokens are standard JWTs signed by Google - verifiable with
// just the project id and Google's public keys below, no service-account
// secret needed. Set FIREBASE_PROJECT_ID in Vercel if it ever differs from
// the default (matches src/firebase.js's `projectId`).
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'juowmusic';
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/** Verifies the caller is signed in AND their email is on the ADMIN_EMAILS
 * allowlist (comma-separated, set in Vercel - never exposed to the client). */
async function requireAdmin(request) {
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
  if (!email || !allowed.includes(email)) throw new Error('Not an admin account');
  return payload;
}

/**
 * Issues short-lived, scoped upload tokens for @vercel/blob's client-side
 * `upload()` - the admin UI uploads cover art / audio files straight to Blob
 * from the browser, never routing the file bytes through this function (only
 * this small token exchange does). Requires the Blob store to be connected
 * to this Vercel project (BLOB_READ_WRITE_TOKEN) and ADMIN_EMAILS to be set.
 */
export default async function handler(request, response) {
  try {
    await requireAdmin(request);
  } catch (err) {
    response.status(401).json({ error: err.message || 'Unauthorized' });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'audio/mpeg',
          'audio/mp4',
          'audio/wav',
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 50 * 1024 * 1024, // 50MB covers cover art + a full song
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async () => {
        // Nothing to do server-side - the admin form reads the resulting
        // blob URL straight from the client-side upload() result and saves
        // it onto the song/artist doc itself.
      },
    });
    response.status(200).json(jsonResponse);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}
