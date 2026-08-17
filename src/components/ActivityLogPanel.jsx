import { useState } from 'react';
import { Lock, MessageSquare, Flag, Trash2, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import useActivityLog from '@/utils/activityLog';
import MusicLoader from '@/components/MusicLoader';

const TYPE_ICON = {
  comment_post: MessageSquare,
  comment_delete: Trash2,
  report: Flag,
  profile_update: UserCog,
};

function formatWhen(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
}

/**
 * Settings > Activity Log. Reads from `users/{uid}/activityLog` (written
 * by logActivity() calls in Comments.jsx and ProfilePage's account-update
 * flow) in real time. Entries flagged `sensitive` (currently just account
 * info changes - see SENSITIVE_ACTIVITY_TYPES in utils/activityLog.js)
 * render masked until the person re-enters their password once per visit
 * to this tab, reusing AuthContext's existing reauthenticate() - the same
 * check already required to save account changes in the first place.
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

  const hasPasswordProvider = user?.providerData?.some((p) => p.providerId === 'password');

  const handleUnlock = async (e) => {
    e.preventDefault();
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
        <ul className="mt-6 space-y-2">
          {entries.map((entry) => {
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
                      {entry.detail?.preview && <p className="truncate text-xs text-juow-soft/40">"{entry.detail.preview}"</p>}
                    </>
                  )}
                </div>
                <span className="shrink-0 text-xs text-juow-soft/35">{formatWhen(entry.timestamp)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <form onSubmit={handleUnlock}>
            <DialogHeader>
              <DialogTitle>{t('activity.unlock')}</DialogTitle>
              <DialogDescription>{t('activity.unlockPrompt')}</DialogDescription>
            </DialogHeader>

            {hasPasswordProvider && (
              <div className="mt-4 space-y-2">
                <label htmlFor="activity-gate-password" className="text-sm font-medium">
                  {t('activity.unlockPassword')}
                </label>
                <Input
                  id="activity-gate-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {gateError && <p className="mt-2 text-sm text-red-500">{gateError}</p>}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setGateOpen(false)}>
                {t('activity.unlockCancel')}
              </Button>
              <Button type="submit" disabled={verifying} className="bg-black text-white hover:bg-black/80">
                {t('activity.unlockConfirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
