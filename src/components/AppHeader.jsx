import { useEffect, useRef, useState } from "react";
import { Link, useMatch } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, Settings, User, X } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import { cn } from "@/lib/utils";
import {
  useEffHeader,
  useHomeNavBorder,
  useScrollSpy,
} from "@/hooks/useHeaderScroll";
import { useAuth } from "@/context/AuthContext";
import { handleImageError } from '@/lib/imageFallback';

/**
 * @param {'home' | 'section'} variant
 * @param {{ href: string, label: string, id: string }[]} [menuItems]
 */
export default function AppHeader({ variant = "home", menuItems = [] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const scrolled = useEffHeader();
  const homeActive = useHomeNavBorder();
  const sectionIds = menuItems.map((item) => item.id);
  const sectionActive = useScrollSpy(sectionIds);
  const { user, logout } = useAuth();
  const displayName = user?.displayName || user?.email;
  const exploreActive = useMatch('/explore');
  const homeRouteActive = useMatch('/');

  useEffect(() => {
    if (!accountOpen) return undefined;
    const onPointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target))
        setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen]);

  const isHome = variant === "home";
  const activeId = isHome ? homeActive : sectionActive;

  const navItems = isHome
    ? [
        { href: "#featured", label: "Featured", id: "featured" },
        { href: "#news", label: "News", id: "news" },
        { href: "#songs", label: "Songs", id: "songs" },
      ]
    : menuItems;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[56] flex h-[4.3rem] items-center justify-between px-4 text-juow-soft transition-colors duration-300 sm:px-7",
        scrolled
          ? "border-b border-white/10 bg-black/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="flex min-w-0 items-center gap-6 lg:gap-10">
        <Link to="/" className="shrink-0">
          <img
            src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
            alt="Juowle logo"
            className="h-12 w-auto" onError={handleImageError} />
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          <Link
            to="/"
            className={cn("nav-link-underline text-base", homeRouteActive && "active text-juow-accent")}
          >
            Home
          </Link>
          <Link
            to="/explore"
            className={cn("nav-link-underline text-base", exploreActive && "active text-juow-accent")}
          >
            Explore
          </Link>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "nav-link-underline text-base",
                activeId === item.id && "active text-juow-accent",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <SearchBox />

        {user ? (
          <div ref={accountRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-juow-soft py-1 pl-1.5 pr-3 text-sm transition-colors hover:border-juow-accent hover:text-juow-accent"
            >
              <span className="grid size-6 place-items-center rounded-full bg-juow-soft text-black">
                <User className="size-3.5" />
              </span>
              {displayName}
            </button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 top-[calc(100%+0.6rem)] w-48 overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl"
                >
                  <Link
                    to="/profile"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-juow-soft transition-colors hover:bg-juow-accent hover:text-black"
                  >
                    <User className="size-4" /> Profile
                  </Link>
                  <Link
                    to="/profile?tab=settings"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-juow-soft transition-colors hover:bg-juow-accent hover:text-black"
                  >
                    <Settings className="size-4" /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      setAccountOpen(false);
                    }}
                    className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-3 text-left text-sm text-juow-soft transition-colors hover:bg-juow-accent hover:text-black"
                  >
                    <LogOut className="size-4" /> Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <>
            <Link
              to="/signup"
              className="hidden rounded-full border border-juow-soft px-3 py-1.5 text-sm transition-colors hover:border-juow-accent hover:text-juow-accent md:inline-flex"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="hidden rounded-full border border-juow-soft bg-juow-soft px-3 py-1.5 text-sm text-black transition-opacity hover:opacity-90 md:inline-flex"
            >
              Log In
            </Link>
          </>
        )}

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-juow-soft lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className={cn("size-6", mobileOpen && "text-juow-accent")} />
          ) : (
            <Menu className="size-6" />
          )}
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[55] w-72 bg-black px-6 py-20 shadow-2xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <nav className="flex flex-col gap-4">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-lg text-juow-soft hover:text-juow-accent"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-8 border-t border-white/10 pt-6">
          {user ? (
            <button
              type="button"
              onClick={async () => {
                await logout();
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 text-juow-soft hover:text-juow-accent"
            >
              <LogOut className="size-4" /> Log out ({displayName})
            </button>
          ) : (
            <div className="flex gap-3">
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-juow-soft px-3 py-1.5 text-sm text-juow-soft hover:border-juow-accent hover:text-juow-accent"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-juow-soft bg-juow-soft px-3 py-1.5 text-sm text-black"
              >
                Log In
              </Link>
            </div>
          )}
        </div>

        <div className="absolute inset-x-6 bottom-8 space-y-2 text-sm text-white/70">
          <img
            src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
            alt=""
            className="mb-4 h-10 w-auto opacity-80" onError={handleImageError} />
          <p>&copy;2024 Juowle. All Rights Reserved.</p>
          <p className="underline">Terms & conditions.</p>
          <p className="underline">Privacy Policy.</p>
          <p className="underline">Cookie Policy.</p>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[54] bg-black/50 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}
