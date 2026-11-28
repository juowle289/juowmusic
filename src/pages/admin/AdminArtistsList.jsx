import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, EyeOff, Lock, Pencil, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { ARTISTS_BY_SLUG } from '@/data/artists';
import { artistsAdmin, songsAdmin, songsForArtist } from '@/lib/adminData';
import { Input } from '@/components/ui/input';
import Pagination from '@/components/admin/Pagination';
import StatusBadge from '@/components/admin/StatusBadge';
import { cn } from '@/lib/utils';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const PAGE_SIZE = 15;

// The hand-written artist pages that ship with the app (src/data/artists/*.json),
// shown with a gold outline and read-only - edit their JSON files.
const BUILTIN_ARTISTS = Object.values(ARTISTS_BY_SLUG).map((a) => ({
  id: a.slug,
  displayName: a.displayName,
  avatarImg: a.avatarImg,
  genre: a.genre,
  builtin: true,
}));

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'builtin', label: 'Built-in' },
];

export default function AdminArtistsList() {
  useDocumentTitle('Admin · Artists');
  const [artists, setArtists] = useState(null);
  const [songCounts, setSongCounts] = useState({}); // artist slug -> number of songs
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  function refresh() {
    setLoadError('');
    artistsAdmin
      .list()
      .then(setArtists)
      .catch((err) => {
        setLoadError(err.message || 'Could not load artists.');
        setArtists((prev) => prev ?? []);
      });
    // One read of the songs collection gives a song count per artist.
    songsAdmin
      .list()
      .then((songs) => {
        const counts = {};
        songs.forEach((s) => {
          const key = s.artistSlug || `name:${(s.artistName || '').toLowerCase()}`;
          counts[key] = (counts[key] ?? 0) + 1;
        });
        setSongCounts(counts);
      })
      .catch(() => setSongCounts({}));
  }
  useEffect(refresh, []);

  const countFor = (a) =>
    (songCounts[a.id] ?? 0) + (a.displayName ? (songCounts[`name:${a.displayName.toLowerCase()}`] ?? 0) : 0);

  const filtered = useMemo(() => {
    if (!artists) return [];
    const query = q.trim().toLowerCase();
    return [...artists, ...BUILTIN_ARTISTS].filter((a) => {
      if (filter === 'builtin' && !a.builtin) return false;
      if (query && !`${a.displayName ?? ''} ${a.id}`.toLowerCase().includes(query)) return false;
      if (filter === 'published') return a.status !== 'draft';
      if (filter === 'draft') return !a.builtin && a.status === 'draft';
      if (filter === 'builtin') return true;
      return true;
    });
  }, [artists, q, filter]);

  useEffect(() => setPage(1), [q, filter, artists]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete(artist) {
    const name = artist.displayName || artist.id;
    setError('');
    setBusyId(artist.id);
    try {
      // Deleting an artist leaves their songs behind (they keep the plain
      // artist name), so say how many are affected before asking.
      const linked = await songsForArtist(artist.id, artist.displayName);
      const warning = linked.length
        ? `\n\n${linked.length} song${linked.length === 1 ? ' is' : 's are'} linked to this artist. They won't be deleted, but they'll lose their artist profile link.`
        : '';
      if (!window.confirm(`Delete "${name}"? This can't be undone.${warning}`)) return;
      await artistsAdmin.remove(artist.id);
      setArtists((prev) => prev.filter((a) => a.id !== artist.id));
    } catch (err) {
      setError(err.message || 'Could not delete this artist.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(artist) {
    const next = artist.status === 'draft' ? 'published' : 'draft';
    setError('');
    setBusyId(artist.id);
    try {
      await artistsAdmin.update(artist.id, { status: next });
      setArtists((prev) => prev.map((a) => (a.id === artist.id ? { ...a, status: next } : a)));
    } catch (err) {
      setError(err.message || 'Could not change this artist’s status.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Artists</h1>
          {artists && (
            <p className="mt-1 text-xs text-muted-foreground">
              {artists.length} editable ·{' '}
              <span className="text-[#8a6d00] dark:text-juow-accent">{BUILTIN_ARTISTS.length} built-in (gold outline, read-only)</span>
            </p>
          )}
        </div>
        <Link
          to="/admin/artists/new"
          className="inline-flex items-center gap-1.5 rounded-[2px] border border-juow-accent px-4 py-2 text-sm font-medium text-[#8a6d00] transition-colors hover:bg-juow-accent hover:text-black dark:text-juow-accent"
        >
          <Plus className="size-4" /> New artist
        </Link>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or slug" className="pl-8" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-[2px] border px-3 py-1 text-xs font-medium transition-colors',
              filter === f.id
                ? 'border-juow-accent bg-juow-accent/15 text-[#8a6d00] dark:text-juow-accent'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loadError && (
        <p className="mb-4 flex flex-wrap items-center gap-3 text-sm text-destructive">
          {loadError}
          <button type="button" onClick={refresh} className="inline-flex items-center gap-1 underline underline-offset-4">
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </p>
      )}

      {artists === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {artists.length === 0
            ? loadError
              ? 'Artists could not be loaded.'
              : 'No artists yet - add your first one above.'
            : 'No artists match these filters.'}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
            {pageItems.map((a) => (
              <li
                key={`${a.builtin ? 'b' : 'f'}:${a.id}`}
                className={cn('flex items-center gap-3 px-4 py-3', a.builtin && 'ring-1 ring-inset ring-juow-accent')}
              >
                {a.avatarImg ? (
                  <img src={a.avatarImg} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                    <Users className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{a.displayName || a.id}</span>
                    {a.builtin ? (
                      <span className="shrink-0 rounded-[2px] bg-juow-accent/15 px-2 py-0.5 text-[11px] font-medium text-[#8a6d00] dark:text-juow-accent">
                        Built-in
                      </span>
                    ) : (
                      <StatusBadge status={a.status} />
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 truncate text-xs text-muted-foreground">
                    {a.genre && <span>{a.genre}</span>}
                    <span className="text-muted-foreground/60">/artist/{a.id}</span>
                    {!a.builtin && (
                      <span>
                        {countFor(a)} song{countFor(a) === 1 ? '' : 's'}
                      </span>
                    )}
                  </p>
                </div>
                <Link
                  to={`/artist/${a.id}${a.status === 'draft' ? '?preview=1' : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-[#8a6d00] dark:hover:text-juow-accent"
                  aria-label="View on site"
                  title={a.status === 'draft' ? 'Preview draft' : 'View on site'}
                >
                  <ExternalLink className="size-4" />
                </Link>
                {a.builtin ? (
                  <span
                    className="p-2 text-muted-foreground/60"
                    title="Built-in artist - edit src/data/artists/"
                    aria-label="Read-only"
                  >
                    <Lock className="size-4" />
                  </span>
                ) : (
                  <>
                <button
                  type="button"
                  onClick={() => toggleStatus(a)}
                  disabled={busyId === a.id}
                  className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-[#8a6d00] disabled:opacity-40 dark:hover:text-juow-accent"
                  aria-label={a.status === 'draft' ? 'Publish' : 'Unpublish'}
                  title={a.status === 'draft' ? 'Publish' : 'Move back to draft'}
                >
                  {a.status === 'draft' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <Link
                  to={`/admin/artists/${a.id}`}
                  className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-[#8a6d00] dark:hover:text-juow-accent"
                  aria-label="Edit"
                >
                  <Pencil className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  disabled={busyId === a.id}
                  className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </div>
  );
}
