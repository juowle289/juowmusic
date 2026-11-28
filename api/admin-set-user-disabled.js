import { getAuth } from 'firebase-admin/auth';
import { requireAdmin } from './_lib/requireAdmin.js';
import { getAdminApp } from './_lib/firebaseAdmin.js';
import { writeAuditLog } from './_lib/auditLog.js';

/** Disables or re-enables a sign-in - a disabled account can't log in or
 * refresh its session, but nothing about it (their data, comments, etc.) is
 * deleted. */
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

  const { uid, disabled } = request.body ?? {};
  if (!uid || typeof disabled !== 'boolean') {
    response.status(400).json({ error: 'uid and disabled (boolean) are required' });
    return;
  }

  // An admin disabling their own account would lock themselves out.
  if (uid === actor.sub) {
    response.status(400).json({ error: "You can't disable your own account." });
    return;
  }

  try {
    const auth = getAuth(getAdminApp());
    const user = await auth.updateUser(uid, { disabled });
    await writeAuditLog({
      actor,
      action: 'update',
      docId: uid,
      label: user.email ?? uid,
      changed: [disabled ? 'account disabled' : 'account re-enabled'],
    });
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
