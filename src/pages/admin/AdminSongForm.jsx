import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { songsAdmin } from '@/lib/adminData';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import FileUploadField from '@/components/admin/FileUploadField';
import { cn } from '@/lib/utils';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const EMPTY = {
  songTitle: '',
  artistName: '',
  coverSrc: '',
  audioSrc: '',
  releaseDate: '',
  views: '',
  producers: '',
  description: '',
  lyrics: '',
};

const TABS = ['Details', 'Lyrics', 'Media'];

function slugify(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminSongForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  useDocumentTitle(isNew ? 'Admin · New song' : 'Admin · Edit song');

  const [slug, setSlug] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState('Details');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    songsAdmin
      .get(id)
      .then((doc) => {
        if (!doc) {
          setError('Song not found.');
          return;
        }
        setSlug(doc.id);
        setForm({ ...EMPTY, ...doc });
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const finalSlug = isNew ? slugify(slug || form.songTitle) : slug;
    if (!finalSlug) {
      setError('Add a title or a slug first.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await songsAdmin.create(form, finalSlug);
      } else {
        await songsAdmin.update(finalSlug, form);
      }
      navigate('/admin/songs');
    } catch (err) {
      setError(err.message || 'Could not save this song.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-juow-soft/40" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <h1 className="mb-6 font-[family-name:var(--font-anton)] text-2xl font-bold text-white">
        {isNew ? 'New song' : `Edit "${form.songTitle || slug}"`}
      </h1>

      <div className="mb-6 flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-juow-accent text-juow-accent' : 'border-transparent text-juow-soft/50 hover:text-juow-soft',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Details' && (
        <div className="space-y-4">
          <Field label="Song title">
            <Input value={form.songTitle} onChange={(e) => set('songTitle', e.target.value)} required className="bg-white/5 text-juow-soft" />
          </Field>
          <Field label="Artist name">
            <Input value={form.artistName} onChange={(e) => set('artistName', e.target.value)} required className="bg-white/5 text-juow-soft" />
          </Field>
          <Field label={`Slug (URL: /lyrics/${slug || '...'})`}>
            <Input
              value={isNew ? slug : slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              disabled={!isNew}
              placeholder={isNew ? slugify(form.songTitle) || 'auto from title' : undefined}
              className="bg-white/5 text-juow-soft disabled:opacity-50"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Release date">
              <Input value={form.releaseDate} onChange={(e) => set('releaseDate', e.target.value)} placeholder="Feb. 19, 2020" className="bg-white/5 text-juow-soft" />
            </Field>
            <Field label="Views">
              <Input value={form.views} onChange={(e) => set('views', e.target.value)} placeholder="270M" className="bg-white/5 text-juow-soft" />
            </Field>
          </div>
          <Field label="Producer(s)">
            <Input value={form.producers} onChange={(e) => set('producers', e.target.value)} placeholder="Illangelo, DaHeala" className="bg-white/5 text-juow-soft" />
          </Field>
          <Field label="Short description">
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className="bg-white/5 text-juow-soft" />
          </Field>
        </div>
      )}

      {tab === 'Lyrics' && (
        <div>
          <p className="mb-2 text-xs text-juow-soft/50">
            Plain text. Start a section with a line in brackets (e.g. <code>[Verse 1]</code>), leave a blank line
            between sections.
          </p>
          <Textarea
            value={form.lyrics}
            onChange={(e) => set('lyrics', e.target.value)}
            rows={18}
            className="bg-white/5 font-mono text-sm text-juow-soft"
          />
        </div>
      )}

      {tab === 'Media' && (
        <div className="space-y-5">
          <FileUploadField label="Cover art" kind="image" value={form.coverSrc} onChange={(v) => set('coverSrc', v)} folder="songs/covers" />
          <FileUploadField label="Audio file" kind="audio" value={form.audioSrc} onChange={(v) => set('audioSrc', v)} folder="songs/audio" />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex gap-3">
        <Button type="submit" disabled={saving} className="gap-1.5 bg-juow-accent text-black hover:bg-juow-accent/85">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isNew ? 'Create song' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/songs')} className="text-juow-soft/60 hover:text-juow-soft">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-juow-soft/60">{label}</span>
      {children}
    </label>
  );
}
