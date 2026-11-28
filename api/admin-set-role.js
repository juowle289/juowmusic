import { getFirestore } from 'firebase-admin/firestore';
import { requireAdmin } from './_lib/requireAdmin.js';
import { getAdminApp } from './_lib/firebaseAdmin.js';
import { writeAuditLog } from './_lib/auditLog.js';

/**
 * Grants or revokes admin access for a uid - writes (or deletes) the
 * Firestore admins/{uid} doc that both firestore.rules' isAdmin() and the
 * client's useIsAdmin() hook check. Done here (server-side, via the Admin
 * SDK) rather than letting the browser write admins/{uid} directly: it's
 * the same end result either way given firestore.rules already gates that
 * write to admins-only, but keeping every admin-role change going through
 * one function makes it trivial to see exactly where that happens.
 */
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let actor;
  try {
    actor = await requireAdmin(request);
  } catch (err) {
    response.status(401).json({ error: err.message || 'Unauthorized' });
    return;
  }

  const { uid, isAdmin, email } = request.body ?? {};
  if (!uid || typeof isAdmin !== 'boolean') {
    response.status(400).json({ error: 'uid and isAdmin (boolean) are required' });
    return;
  }

  // Nobody changes their own role: revoking yourself can leave the site with
  // no admin to fix it, and self-granting is meaningless.
  if (uid === actor.sub) {
    response.status(400).json({ error: "You can't change your own admin access." });
    return;
  }

  try {
    const db = getFirestore(getAdminApp());
    const ref = db.collection('admins').doc(uid);
    if (isAdmin) {
      await ref.set({ email: email ?? null, grantedBy: actor.email ?? actor.sub, grantedAt: new Date().toISOString() });
    } else {
      await ref.delete();
    }
    await writeAuditLog({
      actor,
      action: 'update',
      docId: uid,
      label: email ?? uid,
      changed: [isAdmin ? 'admin access granted' : 'admin access revoked'],
    });
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
