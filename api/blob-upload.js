import { handleUpload } from '@vercel/blob/client';
import { requireAdmin } from './_lib/requireAdmin.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
// Browsers report the same audio format under different MIME types (an .m4a
// is often "audio/x-m4a", a .wav "audio/x-wav", an .mp3 sometimes "audio/mp3"),
// so the old 3-type list rejected perfectly good files.
const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
];

const MB = 1024 * 1024;

// The admin forms only ever upload under these folders (see FileUploadField's
// `folder` prop) - refuse anything else, plus any path-traversal attempt.
const ALLOWED_PATH = /^(songs|artists)\/[a-z0-9._/-]+$/i;

/**
 * Issues short-lived, scoped upload tokens for @vercel/blob's client-side
 * `upload()` - the admin UI uploads cover art / audio files straight to Blob
 * from the browser, never routing the file bytes through this function (only
 * this small token exchange does). Requires the Blob store to be connected
 * to this Vercel project (BLOB_READ_WRITE_TOKEN) and ADMIN_EMAILS to be set.
 */
export default async function handler(request, response) {
  try {
    await requireAdmin(request);
  } catch (err) {
    response.status(401).json({ error: err.message || 'Unauthorized' });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!ALLOWED_PATH.test(pathname) || pathname.includes('..')) {
          throw new Error('Uploads are only allowed under songs/ and artists/.');
        }
        const isAudio = pathname.startsWith('songs/audio/');
        return {
          allowedContentTypes: isAudio ? AUDIO_TYPES : IMAGE_TYPES,
          addRandomSuffix: true,
          // Audio: a full song. Images: cover art/avatars never need more than 10MB.
          maximumSizeInBytes: isAudio ? 50 * MB : 10 * MB,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do server-side - the admin form reads the resulting
        // blob URL straight from the client-side upload() result and saves
        // it onto the song/artist doc itself.
      },
    });
    response.status(200).json(jsonResponse);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}
