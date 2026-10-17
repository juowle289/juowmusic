import { upload } from '@vercel/blob/client';
import { auth } from '@/firebase';

/**
 * Uploads a file straight from the browser to Vercel Blob (the file bytes
 * never touch our own server - only a short-lived token exchange does, via
 * /api/blob-upload). Returns the public blob URL to store on the
 * song/artist doc. Requires the signed-in user to be on ADMIN_EMAILS.
 *
 * @param {File} file
 * @param {string} folder - e.g. 'songs/covers', 'songs/audio', 'artists/avatars'
 * @param {(percent: number) => void} [onProgress]
 */
export async function uploadAdminFile(file, folder, onProgress) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to upload files.');
  const idToken = await user.getIdToken();

  const blob = await upload(`${folder}/${file.name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    clientPayload: undefined,
    headers: { Authorization: `Bearer ${idToken}` },
    onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
  });

  return blob.url;
}
