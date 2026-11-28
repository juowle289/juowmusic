import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play, UserCheck } from 'lucide-react';
import { tracksBySlug } from '@/data/playableTracks';
import { ARTISTS_BY_SLUG } from '@/data/artists';
import { getFirestoreTracksBySlug, usePublicSongsStore } from '@/lib/publicSongsCache';
import { usePublicArtistsStore } from '@/lib/publicArtistsCache';
import { handleImageError } from '@/lib/imageFallback';
import { useLikesStore } from '@/stores/useLikesStore';
import { useFollowStore } from '@/stores/useFollowStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import LikeButton from '@/components/LikeButton';

/** Profile "Library" tab: the account's Liked songs playlist (play it as a
 * queue) and the artists they follow. Songs/artists that were deleted since
 * are simply skipped. */
export default function LibraryPanel() {
  const likedSlugs = useLikesStore((s) => s.likedSlugs);
  const followedSlugs = useFollowStore((s) => s.followedSlugs);
  const songsLoaded = usePublicSongsStore((s) => s.loaded);
  const adminArtists = usePublicArtistsStore((s) => s.artists);
  const playSong = usePlayerStore((s) => s.playSong);
  const setPlaylist = usePlayerStore((s) => s.setPlaylist);

  const songs = useMemo(() => {
    const remote = getFirestoreTracksBySlug();
    return likedSlugs.map((slug) => tracksBySlug[slug] ?? remote[slug]).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likedSlugs, songsLoaded]);

  const artists = useMemo(
    () =>
      followedSlugs
        .map((slug) => {
          const staticArtist = ARTISTS_BY_SLUG[slug];
          if (staticArtist) return { slug, name: staticArtist.displayName, img: staticArtist.avatarImg };
          const a = adminArtists.find((x) => x.slug === slug);
          return a ? { slug, name: a.name, img: a.img } : null;
        })
        .filter(Boolean),
    [followedSlugs, adminArtists],
  );

  // Only songs that actually have audio can go into the player queue.
  const playLiked = (startSlug) => {
    const queue = songs.filter((s) => s.audioSrc);
    const start = queue.find((s) => s.slug === startSlug) ?? queue[0];
    if (!start) return;
    setPlaylist(queue, start.slug);
    playSong(start, true);
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-anton)] text-2xl">
            <Heart className="size-5 fill-red-500 text-red-500" /> Liked songs
            <span className="text-sm font-normal text-white/50">{songs.length}</span>
          </h2>
          {songs.some((s) => s.audioSrc) && (
            <button
              type="button"
              onClick={() => playLiked()}
              className="inline-flex items-center gap-1.5 rounded-full bg-juow-accent px-4 py-1.5 text-sm font-medium text-black hover:bg-juow-accent/85"
            >
              <Play className="size-4 fill-black" /> Play all
            </button>
          )}
        </div>
        {songs.length === 0 ? (
          <p className="text-sm text-white/60">
            Nothing here yet - tap the heart on a song&apos;s page to add it to this playlist.
          </p>
        ) : (
          <ul className="divide-y divide-white/10 border border-white/10">
            {songs.map((s) => (
              <li key={s.slug} className="flex items-center gap-3 px-3 py-2.5">
                <img src={s.coverSrc} alt="" className="size-11 shrink-0 object-cover" onError={handleImageError} />
                <Link to={`/lyrics/${s.slug}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium hover:underline">{s.songTitle}</p>
                  <p className="truncate text-xs text-white/60">{s.artistName}</p>
                </Link>
                {s.audioSrc && (
                  <button
                    type="button"
                    onClick={() => playLiked(s.slug)}
                    aria-label={`Play ${s.songTitle}`}
                    className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-juow-accent"
                  >
                    <Play className="size-4" />
                  </button>
                )}
                <LikeButton slug={s.slug} size="size-5" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-anton)] text-2xl">
          <UserCheck className="size-5 text-juow-accent" /> Following
          <span className="text-sm font-normal text-white/50">{artists.length}</span>
        </h2>
        {artists.length === 0 ? (
          <p className="text-sm text-white/60">You&apos;re not following any artists yet - use the Follow button on an artist&apos;s page.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {artists.map((a) => (
              <li key={a.slug}>
                <Link to={`/artist/${a.slug}`} className="flex flex-col items-center gap-2 border border-white/10 p-4 text-center hover:border-juow-accent">
                  <img src={a.img} alt="" className="size-20 rounded-full object-cover" onError={handleImageError} />
                  <span className="text-sm font-medium">{a.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
