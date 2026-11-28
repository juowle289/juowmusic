import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AudioLines, ExternalLink, Eye, EyeOff, ImageOff, Lock, Music4, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { playableTracks } from '@/data/playableTracks';
import { songsAdmin } from '@/lib/adminData';
import { Input } from '@/components/ui/input';
import Pagination from '@/components/admin/Pagination';
import StatusBadge from '@/components/admin/StatusBadge';
import { cn } from '@/lib/utils';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const PAGE_SIZE = 15;

// The hand-written songs that ship with the app (src/data/lyrics/*.json).
// They're shown here with a gold outline so the admin sees the whole
// catalogue in one place, but they're read-only: edit their JSON files.
const BUILTIN_SONGS = playableTracks.map((t) => ({
  id: t.slug,
  songTitle: t.songTitle,
  artistName: t.artistName,
  coverSrc: t.coverSrc,
  audioSrc: t.audioSrc,
  builtin: true,
}));

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'incomplete', label: 'Missing cover/audio' },
  { id: 'builtin', label: 'Built-in' },
];

const SORTS = [
  { id: 'updated', label: 'Recently updated' },
  { id: 'title', label: 'Title A-Z' },
  { id: 'views', label: 'Most viewed' },
];

export default function AdminSongsList() {
  useDocumentTitle('Admin · Songs');
  const [songs, setSongs] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  function refresh() {
    setLoadError('');
    songsAdmin
      .list()
      .then(setSongs)
      .catch((err) => {
        // Previously a failed load (rules, offline...) showed "No songs yet",
        // which looked like data loss.
        setLoadError(err.message || 'Could not load songs.');
        setSongs((prev) => prev ?? []);
      });
  }
  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (!songs) return [];
    const query = q.trim().toLowerCase();
    const list = [...songs, ...BUILTIN_SONGS].filter((s) => {
      if (filter === 'builtin') return Boolean(s.builtin);
      if (query) {
        const hay = `${s.songTitle ?? ''} ${s.artistName ?? ''} ${s.id}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (filter === 'published') return s.status !== 'draft';
      if (filter === 'draft') return !s.builtin && s.status === 'draft';
      if (filter === 'incomplete') return !s.coverSrc || !s.audioSrc;
      return true;
    });
    if (sort === 'title') list.sort((a, b) => (a.songTitle || a.id).localeCompare(b.songTitle || b.id));
    if (sort === 'views') list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    return list;
  }, [songs, q, filter, sort]);

  // Reset to page 1 whenever the filters (or the underlying data) change, so
  // paging never gets stuck past the end of a shorter result set.
  useEffect(() => setPage(1), [q, filter, sort, songs]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setError('');
    setBusyId(id);
    try {
      await songsAdmin.remove(id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Could not delete this song.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(song) {
    const next = song.status === 'draft' ? 'published' : 'draft';
    setError('');
    setBusyId(song.id);
    try {
      await songsAdmin.update(song.id, { status: next });
      setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, status: next } : s)));
    } catch (err) {
      setError(err.message || 'Could not change this song’s status.');
    } finally {
      setBusyId(null);
    }
  }

  const draftCount = (songs ?? []).filter((s) => s.status === 'draft').length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Songs</h1>
          {songs && (
            <p className="mt-1 text-xs text-muted-foreground">
              {songs.length} editable{draftCount > 0 ? ` · ${draftCount} draft${draftCount === 1 ? '' : 's'}` : ''} ·{' '}
              <span className="text-[#8a6d00] dark:text-juow-accent">{BUILTIN_SONGS.length} built-in (gold outline, read-only)</span>
            </p>
          )}
        </div>
        <Link
          to="/admin/songs/new"
          className="inline-flex items-center gap-1.5 rounded-[2px] border border-juow-accent px-4 py-2 text-sm font-medium text-[#8a6d00] transition-colors hover:bg-juow-accent hover:text-black dark:text-juow-accent"
        >
          <Plus className="size-4" /> New song
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, artist or slug"
            className="pl-8"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort songs"
          className="h-8 rounded-[2px] border border-input bg-transparent px-2.5 text-sm text-foreground outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
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

      {songs === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {songs.length === 0
            ? loadError
              ? 'Songs could not be loaded.'
              : 'No songs yet - add your first one above.'
            : 'No songs match these filters.'}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
            {pageItems.map((s) => (
              <li
                key={`${s.builtin ? 'b' : 'f'}:${s.id}`}
                className={cn('flex items-center gap-3 px-4 py-3', s.builtin && 'ring-1 ring-inset ring-juow-accent')}
              >
                {s.coverSrc ? (
                  <img src={s.coverSrc} alt="" className="size-10 shrink-0 rounded object-cover" />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded bg-muted">
                    <Music4 className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{s.songTitle || s.id}</span>
                    {s.builtin ? (
                      <span className="shrink-0 rounded-[2px] bg-juow-accent/15 px-2 py-0.5 text-[11px] font-medium text-[#8a6d00] dark:text-juow-accent">
                        Built-in
                      </span>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 truncate text-xs text-muted-foreground">
                    <span className="truncate">{s.artistName}</span>
                    <span className="text-muted-foreground/60">/lyrics/{s.id}</span>
                    {!s.builtin && <span>{(s.views ?? 0).toLocaleString()} views</span>}
                    {!s.coverSrc && (
                      <span className="inline-flex items-center gap-0.5 text-destructive" title="No cover art">
                        <ImageOff className="size-3" /> cover
                      </span>
                    )}
                    {!s.audioSrc && (
                      <span className="inline-flex items-center gap-0.5 text-destructive" title="No audio">
                        <AudioLines className="size-3" /> audio
                      </span>
                    )}
                  </p>
                </div>
                <Link
                  to={`/lyrics/${s.id}${s.status === 'draft' ? '?preview=1' : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-[#8a6d00] dark:hover:text-juow-accent"
                  aria-label="View on site"
                  title={s.status === 'draft' ? 'Preview draft' : 'View on site'}
                >
                  <ExternalLink className="size-4" />
                </Link>
                {s.builtin ? (
                  <span
                    className="p-2 text-muted-foreground/60"
                    title="Built-in song - edit src/data/lyrics/"
                    aria-label="Read-only"
                  >
                    <Lock className="size-4" />
                  </span>
                ) : (
                  <>
                <button
                  type="button"
                  onClick={() => toggleStatus(s)}
                  disabled={busyId === s.id}
                  className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-[#8a6d00] disabled:opacity-40 dark:hover:text-juow-accent"
                  aria-label={s.status === 'draft' ? 'Publish' : 'Unpublish'}
                  title={s.status === 'draft' ? 'Publish' : 'Move back to draft'}
                >
                  {s.status === 'draft' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <Link
                  to={`/admin/songs/${s.id}`}
                  className="rounded-[2px] p-2 text-muted-foreground transition-colors hover:text-[#8a6d00] dark:hover:text-juow-accent"
                  aria-label="Edit"
                >
                  <Pencil className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id, s.songTitle || s.id)}
                  disabled={busyId === s.id}
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
