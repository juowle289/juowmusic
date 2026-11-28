import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './firebaseAdmin.js';

/** Appends an entry to the same `adminAuditLog` collection the admin UI
 * writes song/artist changes to, so role and account changes (which happen
 * server-side) show up in the Audit log page too. Best-effort. */
export async function writeAuditLog({ actor, action, docId, label, changed }) {
  try {
    await getFirestore(getAdminApp())
      .collection('adminAuditLog')
      .add({
        action,
        collection: 'users',
        docId,
        label: label || docId,
        changed: changed ?? [],
        actorUid: actor?.sub ?? null,
        actorEmail: actor?.email ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch {
    // Never fail the real action because the log write failed.
  }
}
