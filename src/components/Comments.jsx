import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, MoreVertical, Send, Trash2 } from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/firebaseFirestore';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { logActivity } from '@/utils/activityLog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { handleImageError } from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

// Small deterministic palette for the initial-letter fallback avatar
// (Google sign-ins have a real photoURL; email/password accounts don't).
// Picked from hue/lightness that stay legible with white text.
const AVATAR_COLORS = ['#7c6cf6', '#e0607e', '#2f9e6b', '#c9822f', '#3f8fd6', '#a94ee0'];

function avatarColorFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function CommentAvatar({ name, photoURL }) {
  if (photoURL) {
    return <img src={photoURL} alt="" className="size-9 shrink-0 rounded-full object-cover" onError={handleImageError} />;
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: avatarColorFor(name || 'x') }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function formatRelativeTime(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Confirm-then-act dialog shared by both the "Report" and "Delete" flows -
 * same shape (title, description, cancel, confirm), just different copy
 * and a different action wired up by the caller.
 */
function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, destructive, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={destructive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black text-white hover:bg-black/80'}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommentRow({ comment, isOwn, onRequestReport, onRequestDelete, t }) {
  const createdAt = comment.createdAt?.toDate ? comment.createdAt.toDate() : null;

  return (
    <div className="rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-black shadow-sm">
      <div className="flex items-start gap-3">
        <CommentAvatar name={comment.displayName} photoURL={comment.photoURL} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{comment.displayName || 'Juowle user'}</span>
            {createdAt && <span className="shrink-0 text-xs text-black/40">{formatRelativeTime(createdAt)}</span>}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-black/85">{comment.text}</p>
        </div>

        {isOwn ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 rounded-full p-1.5 text-black/40 outline-none hover:bg-black/5 hover:text-black"
              aria-label="Comment options"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onRequestReport}>
                <Flag className="size-4" /> {t('comments.menu.report')}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onRequestDelete}>
                <Trash2 className="size-4" /> {t('comments.menu.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            onClick={onRequestReport}
            className="shrink-0 rounded-full p-1.5 text-black/40 hover:bg-black/5 hover:text-black"
            aria-label={t('comments.menu.report')}
          >
            <Flag className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Comments({ slug }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // { type: 'report' | 'delete', commentId } | null
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!slug) return undefined;
    const q = query(collection(db, 'comments'), where('songSlug', '==', slug), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error('[juowmusic] Failed to load comments:', error),
    );
    return unsubscribe;
  }, [slug]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        songSlug: slug,
        uid: user.uid,
        displayName: user.displayName || user.email || 'Juowle user',
        photoURL: user.photoURL || null,
        text: trimmed,
        createdAt: serverTimestamp(),
      });
      logActivity(user.uid, { type: 'comment_post', detail: { songSlug: slug, preview: trimmed.slice(0, 80) } });
      setText('');
    } catch (error) {
      console.error('[juowmusic] Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmTarget || !user) return;
    const { type, commentId } = confirmTarget;

    if (type === 'delete') {
      try {
        await deleteDoc(doc(db, 'comments', commentId));
        logActivity(user.uid, { type: 'comment_delete', detail: { commentId, songSlug: slug } });
      } catch (error) {
        console.error('[juowmusic] Failed to delete comment:', error);
      }
    } else if (type === 'report') {
      try {
        await addDoc(collection(db, 'reports'), {
          commentId,
          songSlug: slug,
          reporterUid: user.uid,
          createdAt: serverTimestamp(),
        });
        logActivity(user.uid, { type: 'report', detail: { commentId, songSlug: slug } });
        setToast(t('comments.toast.reported'));
      } catch (error) {
        console.error('[juowmusic] Failed to report comment:', error);
      }
    }

    setConfirmTarget(null);
  };

  const dialogCopy = useMemo(() => {
    if (confirmTarget?.type === 'delete') {
      return {
        title: t('comments.confirm.deleteTitle'),
        description: t('comments.confirm.deleteDesc'),
        confirmLabel: t('comments.confirm.deleteConfirm'),
        destructive: true,
      };
    }
    return {
      title: t('comments.confirm.reportTitle'),
      description: t('comments.confirm.reportDesc'),
      confirmLabel: t('comments.confirm.reportConfirm'),
      destructive: false,
    };
  }, [confirmTarget, t]);

  return (
    <section id="cmt" className="comments scroll-mt-24 border-b-[0.3em] border-[#a00000] px-4 py-12 sm:px-8 md:w-3/5 md:px-0">
      <h2 className="section-heading mb-8 text-black">{t('comments.heading')}</h2>

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          {comments.length === 0 && <p className="text-center text-sm text-black/50">{t('comments.empty')}</p>}
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              isOwn={user?.uid === comment.uid}
              t={t}
              onRequestReport={() => setConfirmTarget({ type: 'report', commentId: comment.id })}
              onRequestDelete={() => setConfirmTarget({ type: 'delete', commentId: comment.id })}
            />
          ))}
        </div>

        {user ? (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('comments.placeholder')}
              rows={3}
              className="min-h-24 flex-1 border-black/15 bg-white text-black placeholder:text-black/40"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={submitting || !text.trim()}
              className="shrink-0 self-end bg-black text-juow-soft hover:bg-black/80 disabled:opacity-50"
              aria-label="Submit comment"
            >
              <Send className="size-5" />
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-black/60">
            <Link to="/login" className="font-medium text-black underline underline-offset-4">
              {t('comments.loginLink')}
            </Link>{' '}
            {t('comments.loginPrompt')}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        cancelLabel={t('comments.confirm.cancel')}
        destructive={dialogCopy.destructive}
        onConfirm={runConfirmedAction}
      />

      <div
        className={cn(
          'pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white shadow-xl transition-all duration-300',
          toast ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        )}
      >
        {toast}
      </div>
    </section>
  );
}
