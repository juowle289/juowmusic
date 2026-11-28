import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

async function authedFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in.');
  const idToken = await user.getIdToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${idToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function listUsers(pageToken) {
  const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '';
  return authedFetch(`/api/admin-list-users${qs}`);
}

export async function setUserDisabled(uid, disabled) {
  return authedFetch('/api/admin-set-user-disabled', {
    method: 'POST',
    body: JSON.stringify({ uid, disabled }),
  });
}

export async function setUserRole(uid, isAdmin, email) {
  return authedFetch('/api/admin-set-role', {
    method: 'POST',
    body: JSON.stringify({ uid, isAdmin, email }),
  });
}

// ---- Fallback: the Firestore profile mirror (see userProfileSync.js) -------

/** Accounts from `users/{uid}` + the `admins` collection. Used when the
 * server API is unavailable. Only accounts that have signed in since the
 * mirror shipped appear, and "disabled" state isn't known here. */
export async function listUsersFromFirestore() {
  const [usersSnap, adminsSnap] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'admins'))]);
  const adminUids = new Set(adminsSnap.docs.map((d) => d.id));
  const users = usersSnap.docs
    .map((d) => {
      const x = d.data();
      return {
        uid: d.id,
        email: x.email ?? null,
        displayName: x.displayName ?? null,
        photoURL: x.photoURL ?? null,
        emailVerified: Boolean(x.emailVerified),
        disabled: false,
        isAdmin: adminUids.has(d.id),
        createdAt: x.createdAt ?? null,
        lastSignInAt: x.lastSignInAt ?? null,
        providers: x.providers ?? [],
      };
    })
    .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));
  return { users, nextPageToken: null };
}

/** Grants/revokes admin straight in Firestore (rules allow admins to write
 * `admins/{uid}`) - the same doc the server API writes. */
export async function setUserRoleViaFirestore(uid, isAdmin, email) {
  const ref = doc(db, 'admins', uid);
  if (isAdmin) {
    await setDoc(ref, { email: email ?? null, grantedBy: auth.currentUser?.email ?? null, grantedAt: new Date().toISOString() });
  } else {
    await deleteDoc(ref);
  }
}
