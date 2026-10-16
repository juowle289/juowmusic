import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Music4, UserRoundX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleImageError } from '@/lib/imageFallback';
import { useFollowStore, buildFollowNotifications } from '@/stores/useFollowStore';
import { ARTISTS_BY_SLUG } from '@/data/artists';

/**
 * The signed-in account's notification feed: one entry per followed artist,
 * sourced from their current "top track" (there's no backend push feed here,
 * so this is derived straight from the same static artist data the artist
 * page itself renders). Unread entries are ones whose track doesn't match
 * what this account last saw - following/unfollowing happens from the
 * CirclePlus button on each artist's page.
 */
export default function NotificationsPanel() {
  const followedSlugs = useFollowStore((s) => s.followedSlugs);
  const seen = useFollowStore((s) => s.seen);
  const markAllSeen = useFollowStore((s) => s.markAllSeen);

  const notifications = useMemo(
    () => buildFollowNotifications(followedSlugs, seen, ARTISTS_BY_SLUG),
    [followedSlugs, seen],
  );
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Mark everything as read once the person actually opens this tab.
  useEffect(() => {
    if (unreadCount > 0) markAllSeen(notifications);
    // Only re-run when the *set* of notifications changes, not on every seen update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.map((n) => `${n.slug}:${n.fingerprint}`).join(',')]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <Bell className="size-5 text-juow-accent" aria-hidden />
        <h2 className="font-[family-name:var(--font-anton)] text-xl font-bold md:text-2xl">Notifications</h2>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-white/15 px-6 py-14 text-center">
          <UserRoundX className="size-8 text-juow-soft/30" aria-hidden />
          <p className="text-sm text-juow-soft/60">
            You&apos;re not following any artists yet. Hit the{' '}
            <span className="whitespace-nowrap font-medium text-juow-accent">+ next to an artist&apos;s name</span>{' '}
            on their page to get notified about new songs and albums here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10 border border-white/10">
          {notifications.map((n) => (
            <li key={n.slug} className={cn('flex items-center gap-4 px-4 py-4 sm:px-5', n.unread && 'bg-white/[0.03]')}>
              <img
                src={n.avatarImg}
                alt=""
                className="size-11 shrink-0 rounded-full object-cover"
                onError={handleImageError}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-juow-soft/60">
                  <span className="font-medium text-juow-soft">{n.name}</span> released a new top track
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium text-juow-soft">
                  <Music4 className="size-3.5 shrink-0 text-juow-accent" aria-hidden />
                  {n.trackTitle ?? 'New release'}
                </p>
              </div>
              {n.unread && <span className="size-2 shrink-0 rounded-full bg-juow-accent" aria-hidden />}
              <Link
                to={`/artist/${n.slug}`}
                className="shrink-0 rounded-[2px] border border-juow-soft/40 px-3 py-1.5 text-xs font-medium text-juow-soft transition-colors hover:border-juow-accent hover:text-juow-accent"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
