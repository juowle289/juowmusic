import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Flag, Loader2, MessageSquareWarning, Trash2, X } from 'lucide-react';
import { db } from '@/firebase';
import useDocumentTitle from '@/hooks/useDocumentTitle';

function toDate(ts) {
  if (!ts) return null;
  return typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
}

export default function AdminComments() {
  useDocumentTitle('Admin · Comments');
  const [items, setItems] = useState(null); // [{commentId, reportCount, lastReportAt, comment}]
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    setError('');
    getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')))
      .then(async (snap) => {
        const reports = snap.docs.map((d) => d.data());
        const byComment = new Map();
        for (const r of reports) {
          const existing = byComment.get(r.commentId);
          if (existing) {
            existing.reportCount += 1;
          } else {
            byComment.set(r.commentId, { commentId: r.commentId, reportCount: 1, lastReportAt: r.createdAt, songSlug: r.songSlug });
          }
        }

        const grouped = await Promise.all(
          [...byComment.values()].map(async (entry) => {
            const snap = await getDoc(doc(db, 'comments', entry.commentId));
            return { ...entry, comment: snap.exists() ? { id: snap.id, ...snap.data() } : null };
          }),
        );
        // Already-deleted comments (no longer exist) are filtered out - their
        // reports are stale and there's nothing left to moderate.
        setItems(grouped.filter((g) => g.comment).sort((a, b) => b.reportCount - a.reportCount));
      })
      .catch((err) => setError(err.message || 'Could not load reported comments.'));
  }
  useEffect(load, []);

  async function deleteComment(entry) {
    if (!window.confirm('Delete this comment? This removes it for everyone and clears its reports.')) return;
    setBusyId(entry.commentId);
    try {
      await deleteDoc(doc(db, 'comments', entry.commentId));
      // Clear the reports that pointed at it so it doesn't keep showing up.
      const reportsSnap = await getDocs(query(collection(db, 'reports'), where('commentId', '==', entry.commentId)));
      await Promise.all(reportsSnap.docs.map((d) => deleteDoc(d.ref)));
      setItems((prev) => prev.filter((x) => x.commentId !== entry.commentId));
    } catch (err) {
      setError(err.message || 'Could not delete this comment.');
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(entry) {
    setBusyId(entry.commentId);
    try {
      const reportsSnap = await getDocs(query(collection(db, 'reports'), where('commentId', '==', entry.commentId)));
      await Promise.all(reportsSnap.docs.map((d) => deleteDoc(d.ref)));
      setItems((prev) => prev.filter((x) => x.commentId !== entry.commentId));
    } catch (err) {
      setError(err.message || 'Could not dismiss these reports.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <MessageSquareWarning className="size-5 text-[#8a6d00] dark:text-juow-accent" />
        <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Reported comments</h1>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!error && items === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reported comments right now.</p>
      ) : items ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
          {items.map((entry) => (
            <li key={entry.commentId} className="flex items-start gap-3 px-4 py-4">
              <Flag className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{entry.comment.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  by {entry.comment.displayName || 'a user'} on{' '}
                  <Link to={`/lyrics/${entry.songSlug}`} className="underline-offset-2 hover:underline">
                    {entry.songSlug}
                  </Link>{' '}
                  · {entry.reportCount} report{entry.reportCount === 1 ? '' : 's'} · last{' '}
                  {toDate(entry.lastReportAt)?.toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(entry)}
                disabled={busyId === entry.commentId}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/40 disabled:opacity-40"
              >
                <X className="size-3.5" /> Dismiss
              </button>
              <button
                type="button"
                onClick={() => deleteComment(entry)}
                disabled={busyId === entry.commentId}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
              >
                {busyId === entry.commentId ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
