import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLikesStore } from '@/stores/useLikesStore';
import { cn } from '@/lib/utils';

/** Heart toggle that adds/removes a song from the signed-in account's "Liked
 * songs" playlist. Signed-out visitors are sent to /login. */
export default function LikeButton({ slug, className, size = 'size-6' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const liked = useLikesStore((s) => s.likedSlugs.includes(slug));
  const toggleLike = useLikesStore((s) => s.toggleLike);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    toggleLike(slug);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      title={liked ? 'Remove from Liked songs' : 'Add to Liked songs'}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full p-1 transition-transform hover:scale-110 active:scale-95', className)}
    >
      <Heart className={cn(size, liked ? 'fill-red-500 text-red-500' : 'text-current opacity-70 hover:opacity-100')} strokeWidth={1.75} />
      <span className="sr-only">{liked ? 'Unlike' : 'Like'}</span>
    </button>
  );
}
