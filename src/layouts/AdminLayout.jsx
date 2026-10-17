import { Link, Navigate, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Music4, Users, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import useIsAdmin from '@/hooks/useIsAdmin';
import MusicLoader from '@/components/MusicLoader';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/songs', label: 'Songs', icon: Music4 },
  { to: '/admin/artists', label: 'Artists', icon: Users },
];

export default function AdminLayout() {
  const { user, initializing } = useAuth();
  const isAdmin = useIsAdmin();

  if (initializing) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <MusicLoader />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />;

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-black px-6 text-center text-juow-soft">
        <div>
          <ShieldAlert className="mx-auto mb-4 size-10 text-juow-accent" />
          <h1 className="mb-2 text-xl font-bold">Not an admin account</h1>
          <p className="mx-auto max-w-sm text-sm text-juow-soft/60">
            {user.email} isn&apos;t on the admin allowlist. Ask whoever runs this site to add it.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-juow-accent underline-offset-4 hover:underline">
            Back to the site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-juow-soft">
      <aside className="hidden w-56 shrink-0 border-r border-white/10 py-6 sm:block">
        <Link to="/admin" className="mb-8 block px-5 font-[family-name:var(--font-anton)] text-lg tracking-wide text-white">
          Juowle Admin
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 border-l-2 px-5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-juow-accent bg-white/5 text-juow-accent'
                    : 'border-transparent text-juow-soft/60 hover:bg-white/5 hover:text-juow-soft',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/"
          className="mt-8 block px-5 text-xs text-juow-soft/40 underline-offset-4 hover:text-juow-soft hover:underline"
        >
          &larr; Back to the site
        </Link>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-6 sm:px-10 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
