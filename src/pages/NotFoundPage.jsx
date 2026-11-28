import { Link } from 'react-router-dom';
import useDocumentTitle from '@/hooks/useDocumentTitle';

/** Shown for any URL that matches no route (it used to silently render the
 * Home page, so typos and dead links looked like the site "working"). */
export default function NotFoundPage() {
  useDocumentTitle('Juowle | Page not found');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <p className="font-[family-name:var(--font-anton)] text-7xl text-juow-accent sm:text-9xl">404</p>
      <h1 className="mt-4 text-xl font-medium sm:text-2xl">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-md text-sm text-white/60">The link may be broken, or the song or artist may have been removed.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-full bg-juow-accent px-5 py-2 text-sm font-medium text-black hover:bg-juow-accent/85">
          Back to home
        </Link>
        <Link to="/explore" className="rounded-full border border-white/20 px-5 py-2 text-sm hover:border-juow-accent hover:text-juow-accent">
          Explore
        </Link>
      </div>
    </main>
  );
}
