import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Pencil, Users } from 'lucide-react';
import { artistsAdmin } from '@/lib/adminData';
import { Input } from '@/components/ui/input';
import useDocumentTitle from '@/hooks/useDocumentTitle';

export default function AdminArtistsList() {
  useDocumentTitle('Admin · Artists');
  const [artists, setArtists] = useState(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  function refresh() {
    artistsAdmin.list().then(setArtists).catch(() => setArtists([]));
  }
  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (!artists) return [];
    const query = q.trim().toLowerCase();
    if (!query) return artists;
    return artists.filter((a) => a.displayName?.toLowerCase().includes(query));
  }, [artists, q]);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setError('');
    setBusyId(id);
    try {
      await artistsAdmin.remove(id);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not delete this artist.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Artists</h1>
        <Link
          to="/admin/artists/new"
          className="inline-flex items-center gap-1.5 rounded-[2px] border border-juow-accent px-4 py-2 text-sm font-medium text-amber-600 transition-colors hover:bg-juow-accent hover:text-black dark:text-juow-accent"
        >
          <Plus className="size-4" /> New artist
        </Link>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name"
          className="pl-8"
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {artists === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {artists.length === 0 ? 'No artists yet - add your first one above.' : 'No artists match that search.'}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
          {filtered.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              {a.avatarImg ? (
                <img src={a.avatarImg} alt="" className="size-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                  <Users className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.displayName || a.id}</p>
                <p className="truncate text-xs text-muted-foreground">{a.genre}</p>
              </div>
              <Link
                to={`/admin/artists/${a.id}`}
                className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-amber-600 dark:hover:text-juow-accent"
                aria-label="Edit"
              >
                <Pencil className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(a.id, a.displayName || a.id)}
                disabled={busyId === a.id}
                className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
