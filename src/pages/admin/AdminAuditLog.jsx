import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { History, Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '@/firebase';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const ACTION_META = {
  create: { icon: Plus, label: 'created', tone: 'text-emerald-500' },
  update: { icon: Pencil, label: 'updated', tone: 'text-[#8a6d00] dark:text-juow-accent' },
  delete: { icon: Trash2, label: 'deleted', tone: 'text-destructive' },
};

function toDate(ts) {
  if (!ts) return null;
  return typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
}

export default function AdminAuditLog() {
  useDocumentTitle('Admin · Audit log');
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(query(collection(db, 'adminAuditLog'), orderBy('createdAt', 'desc'), limit(200)))
      .then((snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((err) => setError(err.message || 'Could not load the audit log.'));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <History className="size-5 text-[#8a6d00] dark:text-juow-accent" />
        <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Audit log</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Every create, edit, and delete made through the Songs and Artists screens - plus admin-role and account changes - most recent first (last 200). Edits list which fields changed.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && entries === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : entries?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
      ) : entries ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
          {entries.map((e) => {
            const meta = ACTION_META[e.action] ?? ACTION_META.update;
            const Icon = meta.icon;
            const to =
              e.collection === 'songs'
                ? `/admin/songs/${e.docId}`
                : e.collection === 'artists'
                  ? `/admin/artists/${e.docId}`
                  : null;
            const kind = e.collection === 'songs' ? 'song' : e.collection === 'artists' ? 'artist' : 'account';
            const changedText = Array.isArray(e.changed) && e.changed.length > 0 ? e.changed.join(', ') : '';
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <Icon className={`size-4 shrink-0 ${meta.tone}`} />
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                  <span className="font-medium">{e.actorEmail || 'Someone'}</span> {meta.label}{' '}
                  {e.action === 'delete' || !to ? (
                    <span className="text-muted-foreground">{e.label || e.docId}</span>
                  ) : (
                    <Link to={to} className="text-[#8a6d00] hover:underline dark:text-juow-accent">
                      {e.label || e.docId}
                    </Link>
                  )}{' '}
                  <span className="text-muted-foreground">({kind})</span>
                  {changedText && <span className="text-muted-foreground"> · {changedText}</span>}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {toDate(e.createdAt)?.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
