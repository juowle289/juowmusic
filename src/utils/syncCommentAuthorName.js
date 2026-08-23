import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/firebaseFirestore';

/**
 * Comments store `displayName` as a snapshot taken at post time (so
 * rendering the list never needs an extra per-comment profile lookup) -
 * but that means changing your username in Settings previously left every
 * comment you'd already posted showing the old one forever. Called right
 * after a successful username change, this re-writes `displayName` on
 * every comment (and reply - replies are just comments with a parentId,
 * same collection) this account has ever posted, so old ones catch up to
 * the new name immediately.
 *
 * A plain `where('uid', '==', uid)` needs no composite index (single-field
 * filters are auto-indexed by Firestore), and the existing comments rule
 * (`allow update: if resource.data.uid == request.auth.uid`) already
 * covers exactly this - no rules change needed for this one.
 */
export async function syncCommentAuthorName(uid, displayName) {
  if (!uid || !displayName) return;

  const snap = await getDocs(query(collection(db, 'comments'), where('uid', '==', uid)));
  if (snap.empty) return;

  // writeBatch caps out at 500 ops - comfortably more than one person's
  // comment history in practice, but chunk defensively just in case.
  const chunks = [];
  for (let i = 0; i < snap.docs.length; i += 450) chunks.push(snap.docs.slice(i, i + 450));

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.update(d.ref, { displayName }));
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
}
