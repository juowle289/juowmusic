import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdmin } from './_lib/requireAdmin.js';
import { getAdminApp } from './_lib/firebaseAdmin.js';

/**
 * Lists every signed-up account for the admin Users tab. This is the one
 * admin feature that genuinely needs the Admin SDK (a service account) -
 * everything else in /admin reads/writes Firestore straight from the
 * browser, but Firestore itself has no "list every Firebase Auth user" API
 * (by design, for privacy); only the Admin SDK's auth().listUsers() does.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in Vercel: the full JSON content
 * from Firebase Console -> Project Settings -> Service Accounts -> Generate
 * new private key, pasted in as one env var value. This key can do
 * anything in the project, so it only ever lives in this server-side
 * function - never sent to the browser.
 */
export default async function handler(request, response) {
  try {
    await requireAdmin(request);
  } catch (err) {
    response.status(401).json({ error: err.message || 'Unauthorized' });
    return;
  }

  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    const pageToken = request.query?.pageToken || undefined;
    const { users, pageToken: nextPageToken } = await auth.listUsers(200, pageToken);

    const adminUids = new Set();
    if (users.length > 0) {
      const adminDocs = await db.getAll(...users.map((u) => db.collection('admins').doc(u.uid)));
      adminDocs.filter((d) => d.exists).forEach((d) => adminUids.add(d.id));
    }

    response.status(200).json({
      users: users.map((u) => ({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        photoURL: u.photoURL ?? null,
        emailVerified: u.emailVerified,
        disabled: u.disabled,
        isAdmin: adminUids.has(u.uid),
        createdAt: u.metadata.creationTime,
        lastSignInAt: u.metadata.lastSignInTime,
        providers: u.providerData.map((p) => p.providerId),
      })),
      nextPageToken: nextPageToken ?? null,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
