import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flag, MoreVertical, Pencil, Send, Trash2, User, X } from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/firebaseFirestore';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { logActivity } from '@/utils/activityLog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import useToast from '@/hooks/useToast';

const PAGE_SIZE = 6;

/** Same small circular icon-avatar the header uses next to the account
 * name - not the account's Google photo, not an initial letter. Uploading
 * a real personal avatar is a later feature; this is the placeholder for
 * everyone until then, same as it already is in AppHeader. */
function CommentAvatar({ small }) {
  return (
    <span className={cnAvatar(small)} aria-hidden>
      <User className={small ? 'size-3.5' : 'size-4'} />
    </span>
  );
}
function cnAvatar(small) {
  return `grid ${small ? 'size-7' : 'size-9'} shrink-0 place-items-center rounded-full bg-juow-soft text-black`;
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

function CommentRow({
  comment,
  isOwn,
  isReply,
  isEditing,
  isReplying,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestReport,
  onRequestDelete,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  t,
}) {
  const createdAt = comment.createdAt?.toDate ? comment.createdAt.toDate() : null;
  const [draft, setDraft] = useState(comment.text);
  const [replyDraft, setReplyDraft] = useState('');

  useEffect(() => {
    if (isEditing) setDraft(comment.text);
  }, [isEditing, comment.text]);

  useEffect(() => {
    if (isReplying) setReplyDraft('');
  }, [isReplying]);

  return (
    <div className={isReply ? 'py-3' : 'px-4 py-3'}>
      <div className="flex items-start gap-3">
        <CommentAvatar small={isReply} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-black">{comment.displayName || 'Juowle user'}</span>
            {createdAt && <span className="shrink-0 text-xs text-black/40">{formatRelativeTime(createdAt)}</span>}
            {comment.editedAt && <span className="shrink-0 text-xs text-black/30">(edited)</span>}
          </div>

          {isEditing ? (
            <div className="mt-1.5 space-y-2">
              <Textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="min-h-16 border-black/15 bg-white text-black"
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => onSaveEdit(draft)} disabled={!draft.trim()} className="gap-1 bg-black text-white hover:bg-juow-accent hover:text-black">
                  <Check className="size-3.5" /> {t('comments.menu.save')}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onCancelEdit} className="gap-1 border-black/15">
                  <X className="size-3.5" /> {t('comments.menu.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap break-words text-black/85">{comment.text}</p>
              {!isReply && (
                <button type="button" onClick={onStartReply} className="mt-1.5 text-xs font-medium text-black/45 hover:text-black">
                  {t('comments.reply')}
                </button>
              )}
            </>
          )}
        </div>

        {!isEditing &&
          (isOwn ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 rounded-full p-1.5 text-black/40 outline-none hover:bg-black/5 hover:text-black"
                aria-label="Comment options"
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onStartEdit}>
                  <Pencil className="size-4" /> {t('comments.menu.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onRequestDelete}>
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
          ))}
      </div>

      {isReplying && (
        <div className="mt-3 ml-11 flex gap-2">
          <Textarea
            autoFocus
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder={t('comments.replyPlaceholder')}
            rows={2}
            className="min-h-14 flex-1 border-black/15 bg-white text-sm text-black placeholder:text-black/40"
          />
          <div className="flex flex-col gap-1.5 self-end">
            <Button
              type="button"
              size="sm"
              onClick={() => onSubmitReply(replyDraft)}
              disabled={!replyDraft.trim()}
              className="bg-black text-white hover:bg-black/80"
            >
              {t('comments.replySubmit')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancelReply} className="border-black/15">
              {t('comments.replyCancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Comments({ slug }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [replyingId, setReplyingId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // { type: 'report' | 'delete', comment } | null - full comment kept (not
  // just its id) so a delete confirmation can snapshot the content into
  // the activity log for the Activity Log tab's "Restore" action.
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [toast, setToast] = useToast();

  const scrollRef = useRef(null);
  const didMountRef = useRef(false);

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

  // Auto-scroll a bit further into the fixed-height list once more
  // comments are revealed, so "Load more" actually surfaces new content
  // instead of leaving the scroll position sitting right where it was.
  // Skips the very first render (default visibleCount) so the list
  // doesn't jump on initial load.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: el.clientHeight * 0.85, behavior: 'smooth' });
  }, [visibleCount]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const top = [];
    const replies = {};
    comments.forEach((c) => {
      if (c.parentId) {
        (replies[c.parentId] ??= []).push(c);
      } else {
        top.push(c);
      }
    });
    return { topLevel: top, repliesByParent: replies };
  }, [comments]);

  const visibleTopLevel = topLevel.slice(0, visibleCount);
  const hasMore = topLevel.length > visibleCount;

  const postComment = async ({ parentId = null, body }) => {
    await addDoc(collection(db, 'comments'), {
      songSlug: slug,
      parentId,
      uid: user.uid,
      displayName: user.displayName || user.email || 'Juowle user',
      photoURL: user.photoURL || null,
      text: body,
      createdAt: serverTimestamp(),
    });
    logActivity(user.uid, { type: 'comment_post', detail: { songSlug: slug, preview: body.slice(0, 80) } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user || submitting) return;

    setSubmitting(true);
    try {
      await postComment({ body: trimmed });
      setText('');
    } catch (error) {
      console.error('[juowmusic] Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId, body) => {
    const trimmed = body.trim();
    if (!trimmed || !user) return;
    try {
      await postComment({ parentId, body: trimmed });
      setReplyingId(null);
    } catch (error) {
      console.error('[juowmusic] Failed to post reply:', error);
    }
  };

  const handleSaveEdit = async (commentId, newText) => {
    const trimmed = newText.trim();
    if (!trimmed || !user) return;
    try {
      await updateDoc(doc(db, 'comments', commentId), { text: trimmed, editedAt: serverTimestamp() });
      logActivity(user.uid, { type: 'comment_edit', detail: { commentId, songSlug: slug, preview: trimmed.slice(0, 80) } });
      setToast(t('comments.toast.edited'));
    } catch (error) {
      console.error('[juowmusic] Failed to edit comment:', error);
    } finally {
      setEditingId(null);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmTarget || !user) return;
    const { type, comment } = confirmTarget;

    if (type === 'delete') {
      try {
        await deleteDoc(doc(db, 'comments', comment.id));
        logActivity(user.uid, {
          type: 'comment_delete',
          detail: {
            commentId: comment.id,
            songSlug: slug,
            text: comment.text,
            preview: comment.text.slice(0, 80),
            displayName: comment.displayName,
            photoURL: comment.photoURL ?? null,
            uid: comment.uid,
          },
        });
        setToast(t('comments.toast.deleted'));
      } catch (error) {
        console.error('[juowmusic] Failed to delete comment:', error);
      }
    } else if (type === 'report') {
      try {
        await addDoc(collection(db, 'reports'), {
          commentId: comment.id,
          songSlug: slug,
          reporterUid: user.uid,
          createdAt: serverTimestamp(),
        });
        logActivity(user.uid, { type: 'report', detail: { commentId: comment.id, songSlug: slug } });
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
        {comments.length === 0 ? (
          <p className="text-center text-sm text-black/50">{t('comments.empty')}</p>
        ) : (
          <div className="relative">
            <div ref={scrollRef} className="max-h-[480px] overflow-y-auto rounded-lg border border-black/10">
              <div className="divide-y divide-black/10">
                {visibleTopLevel.map((comment) => (
                  <div key={comment.id}>
                    <CommentRow
                      comment={comment}
                      isOwn={user?.uid === comment.uid}
                      isEditing={editingId === comment.id}
                      isReplying={replyingId === comment.id}
                      t={t}
                      onStartEdit={() => setEditingId(comment.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={(newText) => handleSaveEdit(comment.id, newText)}
                      onRequestReport={() => setConfirmTarget({ type: 'report', comment })}
                      onRequestDelete={() => setConfirmTarget({ type: 'delete', comment })}
                      onStartReply={() => setReplyingId(comment.id)}
                      onCancelReply={() => setReplyingId(null)}
                      onSubmitReply={(body) => handleSubmitReply(comment.id, body)}
                    />

                    {(repliesByParent[comment.id]?.length ?? 0) > 0 && (
                      <div className="ml-11 divide-y divide-black/10 border-l border-black/10 pl-3">
                        {repliesByParent[comment.id].map((reply) => (
                          <CommentRow
                            key={reply.id}
                            comment={reply}
                            isOwn={user?.uid === reply.uid}
                            isReply
                            isEditing={editingId === reply.id}
                            t={t}
                            onStartEdit={() => setEditingId(reply.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onSaveEdit={(newText) => handleSaveEdit(reply.id, newText)}
                            onRequestReport={() => setConfirmTarget({ type: 'report', comment: reply })}
                            onRequestDelete={() => setConfirmTarget({ type: 'delete', comment: reply })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {hasMore && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center rounded-b-lg bg-gradient-to-t from-white via-white/90 to-transparent pt-12 pb-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  className="pointer-events-auto rounded-full border border-black/15 bg-white px-4 py-1.5 text-sm font-medium text-black shadow-sm hover:border-black/30"
                >
                  {t('comments.loadMore')}
                </button>
              </div>
            )}
          </div>
        )}

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

      <Toast message={toast} />
    </section>
  );
}
