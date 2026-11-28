import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2, Save, Undo2 } from 'lucide-react';
import { artistsAdmin, pruneRows, songsForArtist, toMillis } from '@/lib/adminData';
import { slugify, validateOptionalUrl, validateSlug } from '@/lib/slug';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Field from '@/components/admin/Field';
import StatusBadge from '@/components/admin/StatusBadge';
import FileUploadField from '@/components/admin/FileUploadField';
import QaListField from '@/components/admin/QaListField';
import GenreSelect from '@/components/admin/GenreSelect';
import BioRowsField from '@/components/admin/BioRowsField';
import AlbumsField from '@/components/admin/AlbumsField';
import TopTrackField from '@/components/admin/TopTrackField';
import LinksField from '@/components/admin/LinksField';
import FanbaseField from '@/components/admin/FanbaseField';
import { cn } from '@/lib/utils';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import useUnsavedChanges from '@/hooks/useUnsavedChanges';

const EMPTY = {
  displayName: '',
  status: 'published',
  avatarImg: '',
  coverImg: '',
  genre: '',
  country: '',
  countryFlag: '',
  bio: [],
  links: [],
  fanbase: [],
  albums: [],
  topTrack: null,
  faq: [],
};

const TABS = ['Details', 'Bio', 'Top Track', 'Albums', 'Links & Fanbase', 'FAQ', 'Media'];
const CACHE_KEY = 'admin_artist_form_draft';

export default function AdminArtistForm() {
  const { id } = useParams();
  // key={id}: reset all form state when switching between /artists/new and /artists/:id.
  return <ArtistFormInner key={id} id={id} />;
}

function ArtistFormInner({ id }) {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const location = useLocation();
  useDocumentTitle(isNew ? 'Admin · New artist' : 'Admin · Edit artist');

  const [slug, setSlug] = useState(isNew ? '' : id);
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState('Details');
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState(location.state?.created ? 'Artist created.' : '');
  const [songs, setSongs] = useState(null); // songs linked to this artist (edit only)
  const [restoredDraft, setRestoredDraft] = useState(false);

  const snapshotRef = useRef(JSON.stringify(EMPTY));
  const savedNameRef = useRef('');
  const baseUpdatedAtRef = useRef(null);
  const formRef = useRef(null);

  const loadArtist = useCallback(async () => {
    const doc = await artistsAdmin.get(id);
    if (!doc) {
      setNotFound(true);
      return;
    }
    const next = { ...EMPTY, ...doc };
    snapshotRef.current = JSON.stringify(next);
    savedNameRef.current = doc.displayName || '';
    baseUpdatedAtRef.current = toMillis(doc.updatedAt);
    setSlug(doc.id);
    setForm(next);
    songsForArtist(doc.id, doc.displayName)
      .then(setSongs)
      .catch(() => setSongs([]));
  }, [id]);

  useEffect(() => {
    if (isNew) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const draftForm = saved.form ?? saved;
          setForm({ ...EMPTY, ...draftForm });
          if (saved.slug) setSlug(saved.slug);
          setRestoredDraft(true);
        }
      } catch {
        // Corrupt/unavailable draft storage - start from a blank form.
      }
      return;
    }
    loadArtist()
      .catch((err) => setErrors([err.message || 'Could not load this artist.']))
      .finally(() => setLoading(false));
  }, [isNew, loadArtist]);

  const dirty = JSON.stringify(form) !== snapshotRef.current;
  useUnsavedChanges(dirty && !saving);

  useEffect(() => {
    if (!isNew) return;
    try {
      // Written only while dirty; removed on a successful create or an
      // explicit "Discard draft" (never on mount, which would race the restore).
      if (dirty) localStorage.setItem(CACHE_KEY, JSON.stringify({ form, slug }));
    } catch {
      // localStorage unavailable - the draft just isn't persisted.
    }
  }, [form, slug, dirty, isNew]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  function discardDraft() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    setForm(EMPTY);
    setSlug('');
    snapshotRef.current = JSON.stringify(EMPTY);
    setRestoredDraft(false);
  }

  function goBack() {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate('/admin/artists');
  }

  const finalSlug = isNew ? slugify(slug || form.displayName) : slug;
  const renaming = !isNew && savedNameRef.current && form.displayName.trim() && form.displayName.trim() !== savedNameRef.current;

  function validate() {
    const list = [];
    if (!form.displayName.trim()) list.push('Display name is required.');
    if (isNew) {
      const slugError = validateSlug(finalSlug, 'artist');
      if (slugError) list.push(slugError);
    }
    [
      [form.avatarImg, 'Avatar'],
      [form.coverImg, 'Cover image'],
      [form.countryFlag, 'Country flag image'],
      [form.topTrack?.img, 'Top track cover'],
    ].forEach(([value, label]) => {
      const err = validateOptionalUrl(String(value ?? '').trim(), label);
      if (err) list.push(err);
    });
    (form.links ?? []).forEach((l, i) => {
      if (l.url?.trim()) {
        const err = validateOptionalUrl(l.url.trim(), `Link #${i + 1}`);
        if (err) list.push(err);
      }
    });
    (form.albums ?? []).forEach((a, i) => {
      const err = validateOptionalUrl(String(a.img ?? '').trim(), `Album #${i + 1} cover`);
      if (err) list.push(err);
    });
    return list;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setNotice('');
    const problems = validate();
    setErrors(problems);
    if (problems.length > 0) return;

    const payload = {
      ...form,
      bio: pruneRows(form.bio, ['label', 'value']),
      links: pruneRows(form.links, ['url']),
      fanbase: pruneRows(form.fanbase, ['number']),
      albums: pruneRows(form.albums, ['title', 'img']),
      faq: pruneRows(form.faq, ['question', 'answer']),
      topTrack: form.topTrack?.title?.trim() || form.topTrack?.img?.trim() ? form.topTrack : null,
    };

    setSaving(true);
    try {
      if (isNew) {
        await artistsAdmin.create(payload, finalSlug);
        try {
          localStorage.removeItem(CACHE_KEY);
        } catch {
          // ignore
        }
        snapshotRef.current = JSON.stringify(form);
        navigate(`/admin/artists/${finalSlug}`, { replace: true, state: { created: true } });
        return;
      }
      const result = await artistsAdmin.update(finalSlug, payload, { baseUpdatedAt: baseUpdatedAtRef.current });
      if (result.changed.length === 0) {
        setNotice('No changes to save.');
      } else {
        await loadArtist();
        setNotice(
          result.cascadeFailed
            ? 'Saved, but renaming this artist on their songs failed - re-open each song and re-pick the artist.'
            : result.renamedSongs
              ? `Saved. The new name was also applied to ${result.renamedSongs} song${result.renamedSongs === 1 ? '' : 's'}.`
              : 'Saved.',
        );
      }
    } catch (err) {
      setErrors([err.message || 'Could not save this artist.']);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-md">
        <h1 className="mb-2 font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Artist not found</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          There is no artist with the slug &quot;{id}&quot; - it may have been deleted.
        </p>
        <Link to="/admin/artists" className="text-sm text-[#8a6d00] underline-offset-4 hover:underline dark:text-juow-accent">
          &larr; Back to artists
        </Link>
      </div>
    );
  }

  const publicHref = `/artist/${slug}${form.status === 'draft' ? '?preview=1' : ''}`;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-2xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">
          {isNew ? 'New artist' : `Edit "${form.displayName || slug}"`}
        </h1>
        {!isNew && (
          <Link
            to={publicHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-juow-accent"
          >
            <ExternalLink className="size-3.5" /> {form.status === 'draft' ? 'Preview draft' : 'View on site'}
          </Link>
        )}
      </div>

      {restoredDraft && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[2px] border border-juow-accent/40 bg-juow-accent/10 px-3 py-2 text-xs text-foreground">
          <span>Restored your unsaved draft from last time.</span>
          <button type="button" onClick={discardDraft} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
            <Undo2 className="size-3.5" /> Discard draft
          </button>
        </div>
      )}

      {notice && (
        <p className="mb-4 flex items-center gap-2 rounded-[2px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" /> {notice}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === t
                ? 'border-juow-accent text-[#8a6d00] dark:text-juow-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Details' && (
        <div className="space-y-4">
          <Field
            label="Display name *"
            hint={renaming ? 'Renaming also updates the artist name on every song linked to this artist.' : undefined}
          >
            <Input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={`Slug (URL: /artist/${finalSlug || '...'})`}
              hint={isNew ? 'Set once - it cannot be changed after the artist is created.' : 'The slug is permanent.'}
            >
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                disabled={!isNew}
                placeholder={isNew ? slugify(form.displayName) || 'auto from name' : undefined}
              />
            </Field>
            <Field label="Status" hint="Drafts are hidden from the public site and search.">
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="h-8 w-full rounded-[2px] border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Genre" hint="Artists with the same genre appear as each other's Similar Artists.">
              <GenreSelect value={form.genre} onChange={(v) => set('genre', v)} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Canada" />
            </Field>
          </div>
          <Field label="Country flag image URL (optional)">
            <Input value={form.countryFlag} onChange={(e) => set('countryFlag', e.target.value)} placeholder="https://.../ca.svg" />
          </Field>

          {!isNew && (
            <div className="rounded-[2px] border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Songs linked to this artist{songs ? ` (${songs.length})` : ''}
              </p>
              {songs === null ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : songs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  None yet. Pick this artist when you{' '}
                  <Link to="/admin/songs/new" className="underline underline-offset-4">
                    create a song
                  </Link>
                  .
                </p>
              ) : (
                <ul className="space-y-1">
                  {songs.slice(0, 8).map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <Link to={`/admin/songs/${s.id}`} className="min-w-0 flex-1 truncate text-foreground hover:underline">
                        {s.songTitle || s.id}
                      </Link>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                  {songs.length > 8 && <li className="text-xs text-muted-foreground">+ {songs.length - 8} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'Bio' && <BioRowsField value={form.bio} onChange={(v) => set('bio', v)} />}

      {tab === 'Top Track' && <TopTrackField value={form.topTrack} onChange={(v) => set('topTrack', v)} />}

      {tab === 'Albums' && <AlbumsField value={form.albums} onChange={(v) => set('albums', v)} />}

      {tab === 'Links & Fanbase' && (
        <div className="space-y-8">
          <LinksField label="Links" value={form.links} onChange={(v) => set('links', v)} />
          <div>
            <FanbaseField value={form.fanbase} onChange={(v) => set('fanbase', v)} />
            <p className="mt-2 text-xs text-muted-foreground">
              There&apos;s no single, CORS-friendly API to pull Spotify/Instagram/TikTok/etc follower counts live from the
              browser, so these are entered by hand - update them whenever you check in on the real numbers.
            </p>
          </div>
        </div>
      )}

      {tab === 'FAQ' && <QaListField label="Artist FAQ" value={form.faq} onChange={(v) => set('faq', v)} />}

      {tab === 'Media' && (
        <div className="space-y-5">
          <FileUploadField label="Avatar" kind="image" value={form.avatarImg} onChange={(v) => set('avatarImg', v)} folder="artists/avatars" />
          <FileUploadField label="Cover image (optional)" kind="image" value={form.coverImg} onChange={(v) => set('coverImg', v)} folder="artists/covers" />
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mt-5 space-y-1 rounded-[2px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      {form.status !== 'draft' && !(form.avatarImg ?? '').trim() && (
        <p className="mt-5 text-xs text-muted-foreground">
          No avatar yet - the artist page header and search results will show a blank image.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || (!isNew && !dirty)} className="gap-1.5 bg-juow-accent text-black hover:bg-juow-accent/85">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isNew ? 'Create artist' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={goBack}>
          {dirty ? 'Cancel' : 'Back to artists'}
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes · Ctrl+S to save</span>}
      </div>
    </form>
  );
}
