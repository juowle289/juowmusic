import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { artistsAdmin } from '@/lib/adminData';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import FileUploadField from '@/components/admin/FileUploadField';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const EMPTY = {
  displayName: '',
  avatarImg: '',
  coverImg: '',
  genre: '',
  country: '',
  bioText: '',
  socialLinks: '',
};

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminArtistForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  useDocumentTitle(isNew ? 'Admin · New artist' : 'Admin · Edit artist');

  const [slug, setSlug] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    artistsAdmin
      .get(id)
      .then((doc) => {
        if (!doc) {
          setError('Artist not found.');
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
    const finalSlug = isNew ? slugify(slug || form.displayName) : slug;
    if (!finalSlug) {
      setError('Add a name or a slug first.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await artistsAdmin.create(form, finalSlug);
      } else {
        await artistsAdmin.update(finalSlug, form);
      }
      navigate('/admin/artists');
    } catch (err) {
      setError(err.message || 'Could not save this artist.');
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
        {isNew ? 'New artist' : `Edit "${form.displayName || slug}"`}
      </h1>

      <div className="space-y-4">
        <Field label="Display name">
          <Input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} required className="bg-white/5 text-juow-soft" />
        </Field>
        <Field label={`Slug (URL: /artist/${slug || '...'})`}>
          <Input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            disabled={!isNew}
            placeholder={isNew ? slugify(form.displayName) || 'auto from name' : undefined}
            className="bg-white/5 text-juow-soft disabled:opacity-50"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Genre">
            <Input value={form.genre} onChange={(e) => set('genre', e.target.value)} placeholder="R&B/Soul" className="bg-white/5 text-juow-soft" />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Canada" className="bg-white/5 text-juow-soft" />
          </Field>
        </div>
        <Field label="Bio">
          <Textarea value={form.bioText} onChange={(e) => set('bioText', e.target.value)} rows={5} className="bg-white/5 text-juow-soft" />
        </Field>
        <Field label="Social links (one per line: Label, URL)">
          <Textarea value={form.socialLinks} onChange={(e) => set('socialLinks', e.target.value)} rows={3} placeholder="Instagram, https://instagram.com/..." className="bg-white/5 font-mono text-sm text-juow-soft" />
        </Field>

        <FileUploadField label="Avatar" kind="image" value={form.avatarImg} onChange={(v) => set('avatarImg', v)} folder="artists/avatars" />
        <FileUploadField label="Cover image (optional)" kind="image" value={form.coverImg} onChange={(v) => set('coverImg', v)} folder="artists/covers" />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex gap-3">
        <Button type="submit" disabled={saving} className="gap-1.5 bg-juow-accent text-black hover:bg-juow-accent/85">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isNew ? 'Create artist' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/artists')} className="text-juow-soft/60 hover:text-juow-soft">
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
