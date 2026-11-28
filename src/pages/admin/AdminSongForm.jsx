import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, Loader2, Save, Timer, Undo2 } from 'lucide-react';
import { artistsAdmin, pruneRows, songsAdmin, toMillis } from '@/lib/adminData';
import { slugify, validateOptionalUrl, validateSlug } from '@/lib/slug';
import { lyricStats } from '@/lib/lyricText';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Field from '@/components/admin/Field';
import FileUploadField from '@/components/admin/FileUploadField';
import QaListField from '@/components/admin/QaListField';
import GenreSelect from '@/components/admin/GenreSelect';
import { cn } from '@/lib/utils';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import useUnsavedChanges from '@/hooks/useUnsavedChanges';

const EMPTY = {
  songTitle: '',
  artistName: '',
  artistSlug: '',
  genre: '',
  status: 'published',
  coverSrc: '',
  audioSrc: '',
  releaseDate: '',
  views: 0,
  producers: '',
  description: '',
  lyrics: '',
  qa: [],
  lineTimestamps: null,
};

const TABS = ['Details', 'Lyrics', 'Q&A', 'Media'];
const CACHE_KEY = 'admin_song_form_draft';

/** Same section/line split the public page uses, rendered as plain React
 * (no HTML injection) so the admin can eyeball the result while typing. */
function LyricsPreview({ text }) {
  const blocks = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length > 0);
  if (blocks.length === 0) return <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>;
  return (
    <div className="space-y-4 rounded-[2px] border border-border bg-white p-5 text-black">
      {blocks.map((lines, i) => (
        <div key={i}>
          {lines.map((line, j) => {
            const heading = /^\[(.+)\]$/.exec(line);
            return heading ? (
              <p key={j} className="mb-1 text-sm font-bold">
                [{heading[1]}]
              </p>
            ) : (
              <p key={j} className="text-[15px] leading-relaxed">
                {line}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function AdminSongForm() {
  const { id } = useParams();
  // key={id}: switching between /songs/new and /songs/:id (or two songs) must
  // reset all form state instead of reusing the previous one's.
  return <SongFormInner key={id} id={id} />;
}

function SongFormInner({ id }) {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const location = useLocation();
  useDocumentTitle(isNew ? 'Admin · New song' : 'Admin · Edit song');

  const [slug, setSlug] = useState(isNew ? '' : id);
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState('Details');
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState(location.state?.created ? 'Song created.' : '');
  const [showPreview, setShowPreview] = useState(false);
  const [artistOptions, setArtistOptions] = useState([]);
  const [restoredDraft, setRestoredDraft] = useState(false);

  const snapshotRef = useRef(JSON.stringify(EMPTY));
  const baseUpdatedAtRef = useRef(null);
  const formRef = useRef(null);

  const loadSong = useCallback(async () => {
    const doc = await songsAdmin.get(id);
    if (!doc) {
      setNotFound(true);
      return;
    }
    const next = { ...EMPTY, ...doc };
    snapshotRef.current = JSON.stringify(next);
    baseUpdatedAtRef.current = toMillis(doc.updatedAt);
    setSlug(doc.id);
    setForm(next);
  }, [id]);

  // Initial load: the song being edited, or (for a new song) a restored draft.
  useEffect(() => {
    if (isNew) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          // Older drafts were just the form object; newer ones are {form, slug}.
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
    loadSong()
      .catch((err) => setErrors([err.message || 'Could not load this song.']))
      .finally(() => setLoading(false));
  }, [isNew, loadSong]);

  // Artists for the "Artist" suggestions (and linking a song to its page).
  useEffect(() => {
    artistsAdmin
      .list()
      .then((list) => setArtistOptions(list.map((a) => ({ slug: a.id, name: a.displayName || a.id }))))
      .catch(() => setArtistOptions([]));
  }, []);

  const dirty = JSON.stringify(form) !== snapshotRef.current;
  useUnsavedChanges(dirty && !saving);

  // Autosave the new-song draft locally so a refresh/crash doesn't lose it.
  useEffect(() => {
    if (!isNew) return;
    try {
      // Written only while dirty; it's removed on a successful create or an
      // explicit "Discard draft" (never on mount, which would race the restore).
      if (dirty) localStorage.setItem(CACHE_KEY, JSON.stringify({ form, slug }));
    } catch {
      // localStorage unavailable - the draft just isn't persisted.
    }
  }, [form, slug, dirty, isNew]);

  // Ctrl/Cmd+S saves.
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

  function setArtistName(value) {
    const match = artistOptions.find((a) => a.name.toLowerCase() === value.trim().toLowerCase());
    setForm((f) => ({
      ...f,
      artistName: match ? match.name : value,
      artistSlug: match ? match.slug : '',
    }));
  }

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
    navigate('/admin/songs');
  }

  const stats = useMemo(() => lyricStats(form.lyrics), [form.lyrics]);
  const finalSlug = isNew ? slugify(slug || form.songTitle) : slug;
  const timestampCount = Array.isArray(form.lineTimestamps) ? form.lineTimestamps.length : 0;
  const timestampsStale = timestampCount > 0 && timestampCount !== stats.sung;

  function validate() {
    const list = [];
    if (!form.songTitle.trim()) list.push('Song title is required.');
    if (!form.artistName.trim()) list.push('Artist name is required.');
    if (isNew) {
      const slugError = validateSlug(finalSlug, 'song');
      if (slugError) list.push(slugError);
    }
    const coverError = validateOptionalUrl(form.coverSrc.trim(), 'Cover art');
    if (coverError) list.push(coverError);
    const audioError = validateOptionalUrl(form.audioSrc.trim(), 'Audio file');
    if (audioError) list.push(audioError);
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
      qa: pruneRows(form.qa, ['question', 'answer']),
      // Tapped timestamps are index-based - if the number of sung lines
      // changed they no longer line up, so drop them (re-tap in the sync tool).
      lineTimestamps: timestampsStale ? null : form.lineTimestamps,
    };

    setSaving(true);
    try {
      if (isNew) {
        await songsAdmin.create(payload, finalSlug);
        try {
          localStorage.removeItem(CACHE_KEY);
        } catch {
          // ignore
        }
        snapshotRef.current = JSON.stringify(form); // not dirty anymore -> no leave warning
        navigate(`/admin/songs/${finalSlug}`, { replace: true, state: { created: true } });
        return;
      }
      const { changed } = await songsAdmin.update(finalSlug, payload, { baseUpdatedAt: baseUpdatedAtRef.current });
      if (changed.length === 0) {
        setNotice('No changes to save.');
      } else {
        await loadSong();
        setNotice(
          timestampsStale
            ? 'Saved. The lyrics changed, so the line timestamps were cleared - re-tap them in the sync tool.'
            : 'Saved.',
        );
      }
    } catch (err) {
      setErrors([err.message || 'Could not save this song.']);
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
        <h1 className="mb-2 font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Song not found</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          There is no song with the slug &quot;{id}&quot; - it may have been deleted.
        </p>
        <Link to="/admin/songs" className="text-sm text-[#8a6d00] underline-offset-4 hover:underline dark:text-juow-accent">
          &larr; Back to songs
        </Link>
      </div>
    );
  }

  const checklist = [
    { ok: Boolean(form.coverSrc.trim()), label: 'Cover art' },
    { ok: Boolean(form.audioSrc.trim()), label: 'Audio file' },
    { ok: stats.sung > 0, label: 'Lyrics' },
    { ok: Boolean(form.description.trim()), label: 'Description' },
    { ok: Boolean(form.artistSlug), label: 'Linked to an artist page' },
  ];
  const publicHref = `/lyrics/${slug}${form.status === 'draft' ? '?preview=1' : ''}`;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-2xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">
          {isNew ? 'New song' : `Edit "${form.songTitle || slug}"`}
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

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
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
          <Field label="Song title *">
            <Input value={form.songTitle} onChange={(e) => set('songTitle', e.target.value)} />
          </Field>
          <Field
            label="Artist name *"
            hint={
              form.artistSlug ? (
                <>Linked to the artist page /artist/{form.artistSlug}.</>
              ) : form.artistName.trim() ? (
                <>
                  No artist page matches this name yet - the song still works, but won&apos;t show on an artist profile.{' '}
                  <Link to="/admin/artists/new" className="underline underline-offset-4">
                    Create the artist
                  </Link>
                </>
              ) : (
                'Start typing - existing artists are suggested.'
              )
            }
          >
            <Input value={form.artistName} onChange={(e) => setArtistName(e.target.value)} list="song-artist-options" />
            <datalist id="song-artist-options">
              {artistOptions.map((a) => (
                <option key={a.slug} value={a.name} />
              ))}
            </datalist>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Genre">
              <GenreSelect value={form.genre} onChange={(v) => set('genre', v)} />
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
          <Field
            label={`Slug (URL: /lyrics/${finalSlug || '...'})`}
            hint={isNew ? 'Set once - it cannot be changed after the song is created.' : 'The slug is permanent.'}
          >
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              disabled={!isNew}
              placeholder={isNew ? slugify(form.songTitle) || 'auto from title' : undefined}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Release date">
              <Input value={form.releaseDate} onChange={(e) => set('releaseDate', e.target.value)} placeholder="Feb. 19, 2020" />
            </Field>
            <Field label="Views">
              <div className="flex h-9 items-center rounded-[2px] border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                {(form.views ?? 0).toLocaleString()} <span className="ml-1 text-xs">(counts up automatically)</span>
              </div>
            </Field>
          </div>
          <Field label="Producer(s)">
            <Input value={form.producers} onChange={(e) => set('producers', e.target.value)} placeholder="Illangelo, DaHeala" />
          </Field>
          <Field label="Short description" hint="Shown in the song header and the About section. One paragraph per line.">
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} />
          </Field>
        </div>
      )}

      {tab === 'Lyrics' && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Plain text. Start a section with a line in brackets (e.g. <code>[Verse 1]</code>), leave a blank line between
            sections.
          </p>
          <Textarea
            value={form.lyrics}
            onChange={(e) => set('lyrics', e.target.value)}
            rows={18}
            className="font-mono text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {stats.sung} lines · {stats.sections} sections
            </span>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-[#8a6d00] dark:hover:text-juow-accent"
            >
              <Eye className="size-3.5" /> {showPreview ? 'Hide preview' : 'Preview'}
            </button>
          </div>
          {showPreview && (
            <div className="mt-3">
              <LyricsPreview text={form.lyrics} />
            </div>
          )}

          {!isNew && (
            <div className="mt-5 rounded-[2px] border border-border bg-muted/20 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                <Timer className="size-4" /> Line-by-line sync (click a lyric to seek)
              </p>
              {timestampsStale ? (
                <p className="mb-2 flex items-start gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  The saved timestamps cover {timestampCount} lines but the lyrics now have {stats.sung}. They&apos;ll be
                  cleared when you save - re-tap them afterwards.
                </p>
              ) : timestampCount > 0 ? (
                <p className="mb-2 text-xs text-muted-foreground">{timestampCount} lines synced.</p>
              ) : (
                <p className="mb-2 text-xs text-muted-foreground">Not synced yet.</p>
              )}
              {dirty ? (
                <p className="text-xs text-muted-foreground">Save your changes first, then open the sync tool.</p>
              ) : form.audioSrc && stats.sung > 0 ? (
                <Link
                  to={`/tools/lyric-sync/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8a6d00] underline-offset-4 hover:underline dark:text-juow-accent"
                >
                  <ExternalLink className="size-3.5" /> Open the sync tool
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">Add audio and lyrics first.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'Q&A' && <QaListField value={form.qa} onChange={(v) => set('qa', v)} />}

      {tab === 'Media' && (
        <div className="space-y-5">
          <FileUploadField label="Cover art" kind="image" value={form.coverSrc} onChange={(v) => set('coverSrc', v)} folder="songs/covers" />
          <FileUploadField label="Audio file" kind="audio" value={form.audioSrc} onChange={(v) => set('audioSrc', v)} folder="songs/audio" />
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mt-5 space-y-1 rounded-[2px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      {form.status !== 'draft' && checklist.some((c) => !c.ok) && (
        <p className="mt-5 text-xs text-muted-foreground">
          Still missing for a complete page: {checklist.filter((c) => !c.ok).map((c) => c.label).join(' · ')}.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || (!isNew && !dirty)} className="gap-1.5 bg-juow-accent text-black hover:bg-juow-accent/85">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isNew ? 'Create song' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={goBack}>
          {dirty ? 'Cancel' : 'Back to songs'}
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes · Ctrl+S to save</span>}
      </div>
    </form>
  );
}
