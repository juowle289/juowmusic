import useLoader from '@/hooks/useLoader';
import MusicLoader from '@/components/MusicLoader';

/**
 * Full-page loading gate, shown on top of everything until the page's real
 * assets have finished loading (see useLoader). Deliberately NOT used on
 * ProfilePage - its stat cards/charts already have their own entrance
 * animations, and gating behind a spinner would just delay and flatten that.
 */
export default function Loader({ minDuration, maxDuration }) {
  const { visible, fading } = useLoader({ minDuration, maxDuration });
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-500"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <MusicLoader />
    </div>
  );
}
