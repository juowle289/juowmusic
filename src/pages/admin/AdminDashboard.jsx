import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music4, Users, Plus } from 'lucide-react';
import { songsAdmin, artistsAdmin } from '@/lib/adminData';
import useDocumentTitle from '@/hooks/useDocumentTitle';

function StatCard({ icon: Icon, label, value, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-juow-accent/15 text-juow-accent">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-sm text-juow-soft/60">{label}</p>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  useDocumentTitle('Admin · Dashboard');
  const [songs, setSongs] = useState(null);
  const [artists, setArtists] = useState(null);

  useEffect(() => {
    songsAdmin.list().then(setSongs).catch(() => setSongs([]));
    artistsAdmin.list().then(setArtists).catch(() => setArtists([]));
  }, []);

  const recent = [...(songs ?? [])].slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 font-[family-name:var(--font-anton)] text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Music4} label="Songs" value={songs?.length} to="/admin/songs" />
        <StatCard icon={Users} label="Artists" value={artists?.length} to="/admin/artists" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/admin/songs/new"
          className="inline-flex items-center gap-1.5 rounded-[2px] border border-juow-accent px-4 py-2 text-sm font-medium text-juow-accent transition-colors hover:bg-juow-accent hover:text-black"
        >
          <Plus className="size-4" /> New song
        </Link>
        <Link
          to="/admin/artists/new"
          className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/20 px-4 py-2 text-sm font-medium text-juow-soft transition-colors hover:border-juow-accent hover:text-juow-accent"
        >
          <Plus className="size-4" /> New artist
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-juow-soft/40">Recently updated songs</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-juow-soft/50">No songs yet - add your first one above.</p>
        ) : (
          <ul className="divide-y divide-white/10 border border-white/10">
            {recent.map((s) => (
              <li key={s.id}>
                <Link to={`/admin/songs/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                  <img src={s.coverSrc} alt="" className="size-9 shrink-0 rounded object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{s.songTitle || s.id}</p>
                    <p className="truncate text-xs text-juow-soft/50">{s.artistName}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
