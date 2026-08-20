import { useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, MessageSquare, Flag, Trash2, UserCog, Pencil, RotateCcw } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseFirestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import useToast from '@/hooks/useToast';
import { useLanguage } from '@/context/LanguageContext';
import useActivityLog, { logActivity } from '@/utils/activityLog';
import MusicLoader from '@/components/MusicLoader';

const TYPE_ICON = {
  comment_post: MessageSquare,
  comment_edit: Pencil,
  comment_delete: Trash2,
  comment_restore: RotateCcw,
  report: Flag,
  profile_update: UserCog,
};

const PAGE_SIZE = 6;

function formatWhen(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
}

/**
 * Settings > Activity Log. Reads from `users/{uid}/activityLog` (written
 * by logActivity() calls in Comments.jsx and ProfilePage's account-update
 * flow) in real time, newest first, paginated client-side over the most
 * recent 200 entries (see LOG_LIMIT in utils/activityLog.js) - simpler
 * and just as effective as real Firestore cursor pagination at this
 * scale, without juggling cursors alongside a live onSnapshot listener.
 *
 * Entries flagged `sensitive` (currently just account info changes - see
 * SENSITIVE_ACTIVITY_TYPES in utils/activityLog.js) render masked until
 * the person re-enters their password once per visit to this tab, reusing
 * AuthContext's existing reauthenticate().
 *
 * "Restore" on a comment_delete entry re-posts that comment as a new doc
 * using the content snapshotted into the log at delete time (see
 * Comments.jsx's delete handler) - it's a new comment with the same text,
 * not literally undeleting the old one (which the client no longer has
 * once Firestore's confirmed the delete).
 *
 * Google-only accounts (no email/password on file) can't be challenged
 * with a password here; for them the gate just requires confirming
 * they're still the signed-in user, since there's no separate credential
 * to re-verify without leaving the page for another Google popup.
 */
export default function ActivityLogPanel({ user, reauthenticate }) {
  const { t } = useLanguage();
  const { entries, loading } = useActivityLog(user?.uid);
  const [unlocked, setUnlocked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [gateError, setGateError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null); // activity entry | null
  const [page, setPage] = useState(0);
  const [toast, setToast] = useToast();

  const hasPasswordProvider = user?.providerData?.some((p) => p.providerId === 'password');
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleUnlock = async () => {
    setGateError('');
    setVerifying(true);
    try {
      if (hasPasswordProvider) {
        await reauthenticate(password);
      }
      setUnlocked(true);
      setGateOpen(false);
      setPassword('');
    } catch (err) {
      setGateError(err.message || t('activity.unlockError'));
    } finally {
      setVerifying(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget || !user) return;

    // Guard against restoring the same delete twice (e.g. a double-click,
    // or the confirm dialog re-opened on a stale row) - without this,
    // each confirm silently posted another duplicate copy of the comment.
    if (restoreTarget.restoredAt) {
      setToast(t('activity.toast.alreadyRestored'));
      setRestoreTarget(null);
      return;
    }

    const { songSlug, text, displayName, photoURL, uid } = restoreTarget.detail || {};
    try {
      await addDoc(collection(db, 'comments'), {
        songSlug: songSlug ?? null,
        uid: uid || user.uid,
        displayName: displayName || user.displayName || user.email || 'Juowle user',
        photoURL: photoURL ?? null,
        text: text ?? '',
        createdAt: serverTimestamp(),
      });
      // Marks this specific log entry as spent so its restore icon
      // disappears (see the `!entry.restoredAt` check below) instead of
      // staying available to click again.
      await updateDoc(doc(db, 'users', user.uid, 'activityLog', restoreTarget.id), { restoredAt: serverTimestamp() });
      logActivity(user.uid, { type: 'comment_restore', detail: { songSlug, preview: (text || '').slice(0, 80) } });
      setToast(t('activity.toast.restored'));
    } catch (error) {
      console.error('[juowmusic] Failed to restore comment:', error);
      setToast(t('activity.toast.restoreError'));
    } finally {
      setRestoreTarget(null);
    }
  };

  return (
    <div className="mt-6 max-w-lg">
      <h2 className="section-heading text-left text-3xl md:text-[2.4em]">{t('activity.heading')}</h2>
      <p className="mt-2 text-sm text-juow-soft/60">{t('activity.subheading')}</p>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <MusicLoader />
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-8 text-sm text-juow-soft/40">{t('activity.empty')}</p>
      ) : (
        <>
          <ul className="mt-6 space-y-2">
            {pageEntries.map((entry) => {
              const Icon = TYPE_ICON[entry.type] ?? MessageSquare;
              const masked = entry.sensitive && !unlocked;
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <Icon className="size-4 shrink-0 text-juow-accent" />
                  <div className="min-w-0 flex-1">
                    {masked ? (
                      <button
                        type="button"
                        onClick={() => setGateOpen(true)}
                        className="flex items-center gap-1.5 text-juow-soft/50 hover:text-juow-soft"
                      >
                        <Lock className="size-3.5" /> {t('activity.locked')}
                      </button>
                    ) : (
                      <>
                        <p className="text-juow-soft">{t(`activity.type.${entry.type}`)}</p>
                        {entry.detail?.preview && <p className="truncate text-xs text-juow-soft/40">&quot;{entry.detail.preview}&quot;</p>}
                      </>
                    )}
                  </div>
                  {entry.type === 'comment_delete' && !masked && !entry.restoredAt && (
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(entry)}
                      className="shrink-0 rounded-full p-1.5 text-juow-soft/40 hover:bg-white/10 hover:text-juow-accent"
                      aria-label={t('activity.restore')}
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                  {entry.type === 'comment_delete' && !masked && entry.restoredAt && (
                    <span className="shrink-0 text-xs text-juow-soft/30">{t('activity.restored')}</span>
                  )}
                  <span className="shrink-0 text-xs text-juow-soft/35">{formatWhen(entry.timestamp)}</span>
                </li>
              );
            })}
          </ul>

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-juow-soft/60">
              <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="gap-1 border-white/15 bg-transparent text-juow-soft hover:bg-white/10">
                <ChevronLeft className="size-3.5" /> {t('activity.page.prev')}
              </Button>
              <span>{t('activity.page.of').replace('{current}', page + 1).replace('{total}', pageCount)}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1 border-white/15 bg-transparent text-juow-soft hover:bg-white/10"
              >
                {t('activity.page.next')} <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={gateOpen}
        onOpenChange={(open) => {
          setGateOpen(open);
          if (!open) {
            setPassword('');
            setGateError('');
          }
        }}
        title={t('activity.unlock')}
        description={t('activity.unlockPrompt')}
        confirmLabel={t('activity.unlockConfirm')}
        cancelLabel={t('activity.unlockCancel')}
        onConfirm={handleUnlock}
      >
        {hasPasswordProvider && (
          <div className="space-y-2">
            <label htmlFor="activity-gate-password" className="text-sm font-medium text-juow-soft/80">
              {t('activity.unlockPassword')}
            </label>
            <Input
              id="activity-gate-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !verifying && handleUnlock()}
              autoFocus
              className="border-white/20 bg-white/5 text-juow-soft"
            />
          </div>
        )}
        {gateError && <p className="text-sm text-red-400">{gateError}</p>}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={t('activity.confirm.restoreTitle')}
        description={t('activity.confirm.restoreDesc')}
        confirmLabel={t('activity.confirm.restoreConfirm')}
        cancelLabel={t('activity.unlockCancel')}
        onConfirm={handleRestore}
      />

      <Toast message={toast} />
    </div>
  );
}
