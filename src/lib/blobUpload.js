import { upload } from '@vercel/blob/client';
import { auth } from '@/firebase';
import { slugify } from '@/lib/slug';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

/** Friendly pre-flight check so a wrong/oversized file fails instantly in the
 * form instead of after a long upload that the server then rejects.
 * Returns an error message, or '' when the file is fine. */
export function validateUploadFile(file, kind) {
  if (!file) return '';
  const isImage = kind === 'image';
  if (!file.type.startsWith(isImage ? 'image/' : 'audio/')) {
    return isImage ? 'Please choose an image file.' : 'Please choose an audio file (mp3, m4a, wav, ogg, flac, aac).';
  }
  if (isImage && file.type === 'image/svg+xml') return 'SVG images are not allowed - use PNG, JPG, WebP or GIF.';
  const max = isImage ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (file.size > max) return `That file is ${(file.size / 1048576).toFixed(1)} MB - the limit is ${max / 1048576} MB.`;
  return '';
}

/** "My Song (Final).MP3" -> "my-song-final.mp3": ASCII-only names keep blob
 * URLs clean and avoid encoding surprises with Vietnamese/special chars. */
function safeFileName(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return `${slugify(base) || 'file'}${ext ? `.${ext}` : ''}`;
}

/**
 * Uploads a file straight from the browser to Vercel Blob (the file bytes
 * never touch our own server - only a short-lived token exchange does, via
 * /api/blob-upload). Returns the public blob URL to store on the
 * song/artist doc. Requires the signed-in user to be an admin.
 *
 * @param {File} file
 * @param {string} folder - e.g. 'songs/covers', 'songs/audio', 'artists/avatars'
 * @param {(percent: number) => void} [onProgress]
 */
export async function uploadAdminFile(file, folder, onProgress) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to upload files.');
  const idToken = await user.getIdToken();

  const blob = await upload(`${folder}/${safeFileName(file.name)}`, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    clientPayload: undefined,
    headers: { Authorization: `Bearer ${idToken}` },
    onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
  });

  return blob.url;
}
