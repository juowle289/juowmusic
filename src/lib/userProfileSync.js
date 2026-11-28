import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Mirrors a signed-in account's public profile into Firestore `users/{uid}`
 * (email, name, photo, providers, join/last-sign-in dates). Firebase Auth
 * accounts can't be listed from the browser, and /api/admin-list-users needs
 * a server-side service-account key - so without this mirror the admin Users
 * tab is empty whenever that API isn't deployed/configured (or when running
 * plain `npm run dev`). Best-effort: a failed write never affects sign-in.
 * merge:true keeps follows/likes and other fields stored on the same doc.
 */
export async function syncUserProfile(firebaseUser) {
  if (!firebaseUser) return;
  try {
    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? null,
        displayName: firebaseUser.displayName ?? null,
        photoURL: firebaseUser.photoURL ?? null,
        emailVerified: Boolean(firebaseUser.emailVerified),
        providers: (firebaseUser.providerData ?? []).map((p) => p.providerId),
        createdAt: firebaseUser.metadata?.creationTime ?? null,
        lastSignInAt: firebaseUser.metadata?.lastSignInTime ?? null,
        profileSyncedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // Offline / rules not published yet - nothing to surface to the visitor.
  }
}
