import { useRef, useState } from 'react';
import { Loader2, Music4, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uploadAdminFile } from '@/lib/blobUpload';
import { cn } from '@/lib/utils';

/**
 * A URL field that can also be filled by uploading a file straight to
 * Vercel Blob. Works for both images (shows a thumbnail) and audio (shows a
 * player) - pass `kind="image"` or `kind="audio"`.
 */
export default function FileUploadField({ label, value, onChange, folder, kind = 'image', accept }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleFile(file) {
    if (!file) return;
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadAdminFile(file, folder, setProgress);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-medium text-juow-soft/60">{label}</p>}

      <div className="flex items-start gap-3">
        {kind === 'image' ? (
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {value ? (
              <img src={value} alt="" className="size-full object-cover" />
            ) : (
              <Upload className="size-5 text-juow-soft/30" />
            )}
          </div>
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <Music4 className="size-5 text-juow-soft/30" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://... or upload a file"
              className="bg-white/5 text-juow-soft"
            />
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 border-white/15 bg-transparent text-juow-soft hover:bg-white/10"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange('')}
                className="shrink-0 text-juow-soft/50 hover:text-juow-soft"
                aria-label="Clear"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={accept ?? (kind === 'image' ? 'image/*' : 'audio/*')}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {uploading && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cn('h-full rounded-full bg-juow-accent transition-all')}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {kind === 'audio' && value && <audio src={value} controls className="h-8 w-full" />}
        </div>
      </div>
    </div>
  );
}
