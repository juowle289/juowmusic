import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { songsAdmin } from '@/lib/adminData';
import { Input } from '@/components/ui/input';
import useDocumentTitle from '@/hooks/useDocumentTitle';

export default function AdminSongsList() {
  useDocumentTitle('Admin · Songs');
  const [songs, setSongs] = useState(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);

  function refresh() {
    songsAdmin.list().then(setSongs).catch(() => setSongs([]));
  }
  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (!songs) return [];
    const query = q.trim().toLowerCase();
    if (!query) return songs;
    return songs.filter(
      (s) => s.songTitle?.toLowerCase().includes(query) || s.artistName?.toLowerCase().includes(query),
    );
  }, [songs, q]);

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setBusyId(id);
    try {
      await songsAdmin.remove(id);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-white">Songs</h1>
        <Link
          to="/admin/songs/new"
          className="inline-flex items-center gap-1.5 rounded-[2px] border border-juow-accent px-4 py-2 text-sm font-medium text-juow-accent transition-colors hover:bg-juow-accent hover:text-black"
        >
          <Plus className="size-4" /> New song
        </Link>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-juow-soft/40" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or artist"
          className="bg-white/5 pl-8 text-juow-soft"
        />
      </div>

      {songs === null ? (
        <p className="text-sm text-juow-soft/50">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-juow-soft/50">No songs found.</p>
      ) : (
        <ul className="divide-y divide-white/10 border border-white/10">
          {filtered.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <img src={s.coverSrc} alt="" className="size-10 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{s.songTitle || s.id}</p>
                <p className="truncate text-xs text-juow-soft/50">{s.artistName}</p>
              </div>
              <Link
                to={`/admin/songs/${s.id}`}
                className="rounded-[2px] p-2 text-juow-soft/60 transition-colors hover:text-juow-accent"
                aria-label="Edit"
              >
                <Pencil className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(s.id, s.songTitle || s.id)}
                disabled={busyId === s.id}
                className="rounded-[2px] p-2 text-juow-soft/60 transition-colors hover:text-red-400 disabled:opacity-40"
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
