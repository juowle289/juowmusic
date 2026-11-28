import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Music4, Users, Plus, ImageOff, AudioLines, ArrowRight, Sparkles, Eye, Pencil, RefreshCw } from 'lucide-react';
import { songsAdmin, artistsAdmin, rebuildPublicIndex } from '@/lib/adminData';
import useDocumentTitle from '@/hooks/useDocumentTitle';

function StatCard({ icon: Icon, label, value, to, tone = 'accent' }) {
  const toneClasses = {
    accent: 'bg-juow-accent/15 text-[#8a6d00] dark:text-juow-accent',
    warn: 'bg-destructive/10 text-destructive',
  };
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-5 transition-colors hover:border-foreground/20 hover:bg-muted/60"
    >
      <div className={`grid size-11 shrink-0 place-items-center rounded-full ${toneClasses[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

/** The public site reads one lightweight index document instead of every
 * song (see rebuildPublicIndex). It rebuilds itself after each admin save;
 * this button is for the very first time (after publishing the new Firestore
 * rules) or if it ever looks out of date. */
function PublicIndexCard() {
  const [state, setState] = useState({ busy: false, message: '', error: false });
  async function run() {
    setState({ busy: true, message: '', error: false });
    try {
      const { songs, artists } = await rebuildPublicIndex();
      setState({ busy: false, message: `Done - ${songs} published songs and ${artists} artists are in the public index.`, error: false });
    } catch (err) {
      setState({ busy: false, message: err.message || 'Could not rebuild the index.', error: true });
    }
  }
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Public search index</p>
        <p className="text-xs text-muted-foreground">
          Powers search, “You may also like”, Popular Songs and New arrivals for visitors. Updates automatically after every save.
        </p>
        {state.message && <p className={`mt-1 text-xs ${state.error ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>{state.message}</p>}
      </div>
      <button
        type="button"
        onClick={run}
        disabled={state.busy}
        className="inline-flex items-center gap-1.5 rounded-[2px] border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-juow-accent disabled:opacity-40"
      >
        <RefreshCw className={`size-3.5 ${state.busy ? 'animate-spin' : ''}`} /> Rebuild now
      </button>
    </div>
  );
}

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  return new Date(ts);
}

function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    ['y', 31536000],
    ['mo', 2592000],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ];
  for (const [label, secs] of units) {
    const n = Math.floor(seconds / secs);
    if (n >= 1) return `${n}${label} ago`;
  }
  return 'just now';
}

/** Builds the last 14 days' worth of {date, songs, artists} counts for the
 * activity chart, from each doc's createdAt. */
function buildActivitySeries(songs, artists) {
  const days = 14;
  const buckets = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), songs: 0, artists: 0 });
  }

  function tally(items, field) {
    items.forEach((item) => {
      const d = toDate(item.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) bucket[field] += 1;
    });
  }
  tally(songs, 'songs');
  tally(artists, 'artists');

  return Array.from(buckets.values());
}

function RecentList({ title, items, emptyLabel, renderItem }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
          {items.map(renderItem)}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  useDocumentTitle('Admin · Dashboard');
  const [songs, setSongs] = useState(null);
  const [artists, setArtists] = useState(null);
  const [loadError, setLoadError] = useState('');

  function load() {
    setLoadError('');
    // A failed load used to show 0 songs / 0 artists, which looked like data
    // loss - surface the error (with a retry) instead.
    const fail = (err) => setLoadError(err.message || 'Could not load the dashboard data.');
    songsAdmin.list().then(setSongs).catch((err) => {
      fail(err);
      setSongs([]);
    });
    artistsAdmin.list().then(setArtists).catch((err) => {
      fail(err);
      setArtists([]);
    });
  }
  useEffect(load, []);

  const loading = songs === null || artists === null;

  const missingCover = useMemo(() => (songs ?? []).filter((s) => !s.coverSrc).length, [songs]);
  const missingAudio = useMemo(() => (songs ?? []).filter((s) => !s.audioSrc).length, [songs]);
  const series = useMemo(() => buildActivitySeries(songs ?? [], artists ?? []), [songs, artists]);
  const totalViews = useMemo(() => (songs ?? []).reduce((sum, s) => sum + (s.views ?? 0), 0), [songs]);
  const draftCount = useMemo(
    () => (songs ?? []).filter((s) => s.status === 'draft').length + (artists ?? []).filter((a) => a.status === 'draft').length,
    [songs, artists],
  );
  const topSongs = useMemo(
    () => [...(songs ?? [])].filter((s) => (s.views ?? 0) > 0).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5),
    [songs],
  );
  const recentSongs = useMemo(() => (songs ?? []).slice(0, 5), [songs]);
  const recentArtists = useMemo(() => (artists ?? []).slice(0, 5), [artists]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/songs/new"
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-juow-accent px-4 py-2 text-sm font-medium text-[#8a6d00] transition-colors hover:bg-juow-accent hover:text-black dark:text-juow-accent"
          >
            <Plus className="size-4" /> New song
          </Link>
          <Link
            to="/admin/artists/new"
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-juow-accent hover:text-[#8a6d00] dark:hover:text-juow-accent"
          >
            <Plus className="size-4" /> New artist
          </Link>
        </div>
      </div>

      {loadError && (
        <p className="mb-4 flex flex-wrap items-center gap-3 text-sm text-destructive">
          {loadError}
          <button type="button" onClick={load} className="inline-flex items-center gap-1 underline underline-offset-4">
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </p>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Music4} label="Songs" value={songs?.length} to="/admin/songs" />
        <StatCard icon={Users} label="Artists" value={artists?.length} to="/admin/artists" />
        <StatCard icon={Eye} label="Total song views" value={songs ? totalViews.toLocaleString() : null} to="/admin/songs" />
        <StatCard icon={Pencil} label="Drafts (not public)" value={songs && artists ? draftCount : null} to="/admin/songs" />
        <StatCard icon={ImageOff} label="Songs missing cover art" value={missingCover} to="/admin/songs" tone="warn" />
        <StatCard icon={AudioLines} label="Songs missing audio" value={missingAudio} to="/admin/songs" tone="warn" />
      </div>

      {/* Activity chart */}
      <div className="mt-6 rounded-lg border border-border bg-muted/20 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-[#8a6d00] dark:text-juow-accent" />
          <h2 className="text-sm font-semibold text-foreground">Content added · last 14 days</h2>
        </div>
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="songsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#feec93" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#feec93" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="artistsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--popover-foreground)' }}
              />
              <Area type="monotone" dataKey="songs" name="Songs" stroke="#feec93" fill="url(#songsGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="artists" name="Artists" stroke="#60a5fa" fill="url(#artistsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent lists */}
      <PublicIndexCard />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <RecentList
          title="Most viewed songs"
          items={topSongs}
          emptyLabel="No views yet - they count up as people open lyric pages."
          renderItem={(s) => (
            <li key={s.id}>
              <Link to={`/admin/songs/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                {s.coverSrc ? (
                  <img src={s.coverSrc} alt="" className="size-9 shrink-0 rounded object-cover" />
                ) : (
                  <div className="grid size-9 shrink-0 place-items-center rounded bg-muted">
                    <Music4 className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.songTitle || s.id}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.artistName}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground/70">{(s.views ?? 0).toLocaleString()} views</span>
              </Link>
            </li>
          )}
        />

        <RecentList
          title="Recently updated songs"
          items={recentSongs}
          emptyLabel="No songs yet - add your first one above."
          renderItem={(s) => (
            <li key={s.id}>
              <Link to={`/admin/songs/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                {s.coverSrc ? (
                  <img src={s.coverSrc} alt="" className="size-9 shrink-0 rounded object-cover" />
                ) : (
                  <div className="grid size-9 shrink-0 place-items-center rounded bg-muted">
                    <Music4 className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.songTitle || s.id}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.artistName}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground/70">{timeAgo(toDate(s.updatedAt))}</span>
              </Link>
            </li>
          )}
        />

        <RecentList
          title="Recently updated artists"
          items={recentArtists}
          emptyLabel="No artists yet - add your first one above."
          renderItem={(a) => (
            <li key={a.id}>
              <Link to={`/admin/artists/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                {a.avatarImg ? (
                  <img src={a.avatarImg} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                    <Users className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{a.displayName || a.id}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.genre}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground/70">{timeAgo(toDate(a.updatedAt))}</span>
              </Link>
            </li>
          )}
        />
      </div>
    </div>
  );
}
