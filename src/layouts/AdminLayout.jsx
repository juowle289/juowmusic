import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Music4, Users, ShieldAlert, Menu, X, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import useIsAdmin from '@/hooks/useIsAdmin';
import MusicLoader from '@/components/MusicLoader';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/songs', label: 'Songs', icon: Music4 },
  { to: '/admin/artists', label: 'Artists', icon: Users },
];

function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full border border-sidebar-border text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
        className,
      )}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function SidebarNav({ onNavigate }) {
  return (
    <>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 border-l-2 px-5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-juow-accent bg-sidebar-accent text-amber-600 dark:text-juow-accent'
                  : 'border-transparent text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
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
        onClick={onNavigate}
        className="mt-8 block px-5 text-xs text-sidebar-foreground/40 underline-offset-4 hover:text-sidebar-foreground hover:underline"
      >
        &larr; Back to the site
      </Link>
    </>
  );
}

export default function AdminLayout() {
  const { user, initializing } = useAuth();
  const isAdmin = useIsAdmin();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (initializing) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <MusicLoader />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />;

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
        <div>
          <ShieldAlert className="mx-auto mb-4 size-10 text-amber-600 dark:text-juow-accent" />
          <h1 className="mb-2 text-xl font-bold">Not an admin account</h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {user.email} isn&apos;t on the admin allowlist. Ask whoever runs this site to add it.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-amber-600 underline-offset-4 hover:underline dark:text-juow-accent">
            Back to the site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar py-6 sm:block">
        <div className="mb-8 flex items-center justify-between px-5">
          <Link to="/admin" className="font-[family-name:var(--font-anton)] text-lg tracking-wide text-sidebar-foreground">
            Juowle Admin
          </Link>
          <ThemeToggle />
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </button>
        <Link to="/admin" className="font-[family-name:var(--font-anton)] text-base tracking-wide text-sidebar-foreground">
          Juowle Admin
        </Link>
        <ThemeToggle />
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar py-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between px-5">
              <span className="font-[family-name:var(--font-anton)] text-lg tracking-wide text-sidebar-foreground">
                Juowle Admin
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
                className="grid size-8 place-items-center rounded-full text-sidebar-foreground/60 hover:bg-sidebar-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-5 py-6 pt-20 sm:px-10 sm:py-10 sm:pt-10">
        <Outlet />
      </main>
    </div>
  );
}
